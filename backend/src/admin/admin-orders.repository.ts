import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type { AdminOrderListQuery } from './admin-orders.input';
import { ORDER_STATUSES, type OrderStatus } from '../orders/orders.types';
import type {
  AdminOrderAddressRow,
  AdminOrderCancellationItemRow,
  AdminOrderCountRow,
  AdminOrderDetailRepositoryResult,
  AdminOrderHeaderRow,
  AdminOrderItemRow,
  AdminOrderListRow,
  AdminOrderRepositoryResult,
  AdminOrderStatusCountRow,
  AdminOrderStatusHistoryRow,
} from './admin-orders.types';

const ORDER_FILTERS = `
  WHERE ($1::timestamptz IS NULL OR o.created_at >= $1)
    AND ($2::timestamptz IS NULL OR o.created_at < $2)
    AND (
      $3::text IS NULL
      OR o.status = $3
    )
    AND (
      $4::text IS NULL
      OR o.id::text ILIKE '%' || $4 || '%'
      OR u.name ILIKE '%' || $4 || '%'
      OR EXISTS (
        SELECT 1
        FROM sales.order_items AS search_oi
        WHERE search_oi.order_id = o.id
          AND search_oi.product_name ILIKE '%' || $4 || '%'
      )
    )
`;

const ORDER_FILTERS_WITHOUT_STATUS = `
  WHERE ($1::timestamptz IS NULL OR o.created_at >= $1)
    AND ($2::timestamptz IS NULL OR o.created_at < $2)
    AND (
      $3::text IS NULL
      OR o.id::text ILIKE '%' || $3 || '%'
      OR u.name ILIKE '%' || $3 || '%'
      OR EXISTS (
        SELECT 1
        FROM sales.order_items AS search_oi
        WHERE search_oi.order_id = o.id
          AND search_oi.product_name ILIKE '%' || $3 || '%'
      )
    )
`;

const FIND_ADMIN_ORDER_LIST_QUERY = `
  SELECT
    o.id AS order_id,
    o.user_id AS customer_id,
    u.name AS customer_name,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'product_id', oi.product_id,
          'product_name', oi.product_name,
          'quantity', oi.quantity
        )
        ORDER BY oi.id ASC
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'::json
    ) AS product_summary,
    COALESCE(SUM(oi.quantity), 0)::int AS product_count,
    o.total_amount AS payment_amount,
    o.status,
    o.created_at AS ordered_at
  FROM sales.orders AS o
  INNER JOIN auth.users AS u
    ON u.id = o.user_id
  LEFT JOIN sales.order_items AS oi
    ON oi.order_id = o.id
${ORDER_FILTERS}
  GROUP BY o.id, o.user_id, u.name, o.total_amount, o.status, o.created_at
  ORDER BY o.created_at DESC, o.id DESC
  LIMIT $5
  OFFSET $6
`;

const COUNT_ADMIN_ORDERS_QUERY = `
  SELECT COUNT(*)::int AS total_count
  FROM sales.orders AS o
  INNER JOIN auth.users AS u
    ON u.id = o.user_id
${ORDER_FILTERS}
`;

const COUNT_ADMIN_ORDERS_BY_STATUS_QUERY = `
  SELECT o.status, COUNT(*)::int AS count
  FROM sales.orders AS o
  INNER JOIN auth.users AS u
    ON u.id = o.user_id
${ORDER_FILTERS_WITHOUT_STATUS}
  GROUP BY o.status
`;

const FIND_ADMIN_ORDER_HEADER_QUERY = `
  SELECT
    o.id AS order_id,
    o.user_id AS customer_id,
    u.name AS customer_name,
    u.email AS customer_email,
    o.status,
    o.subtotal,
    o.shipping_fee,
    o.discount_amount,
    o.total_amount,
    o.created_at,
    o.updated_at,
    oa.order_id AS address_order_id,
    oa.recipient_name AS address_recipient_name,
    oa.phone_number AS address_phone_number,
    oa.postal_code AS address_postal_code,
    oa.address_line1 AS address_line1,
    oa.address_line2 AS address_line2,
    oa.delivery_request AS address_delivery_request,
    oa.created_at AS address_created_at
  FROM sales.orders AS o
  INNER JOIN auth.users AS u
    ON u.id = o.user_id
  LEFT JOIN sales.order_addresses AS oa
    ON oa.order_id = o.id
  WHERE o.id = $1
`;

const FIND_ADMIN_ORDER_ITEMS_QUERY = `
  SELECT
    id,
    order_id,
    product_id,
    product_name,
    NULL::text AS options,
    unit_price,
    quantity
  FROM sales.order_items
  WHERE order_id = $1
  ORDER BY id ASC
`;

const FIND_ADMIN_ORDER_STATUS_HISTORY_QUERY = `
  SELECT
    id,
    order_id,
    previous_status AS from_status,
    new_status AS to_status,
    changed_by,
    created_at
  FROM sales.order_status_history
  WHERE order_id = $1
  ORDER BY created_at ASC, id ASC
`;

const FIND_ADMIN_ORDER_FOR_UPDATE_QUERY = `
  SELECT id, user_id, status, subtotal, shipping_fee, discount_amount,
         total_amount, created_at, updated_at
  FROM sales.orders
  WHERE id = $1
  FOR UPDATE
`;

const UPDATE_ADMIN_ORDER_STATUS_QUERY = `
  UPDATE sales.orders
  SET status = $2,
      updated_at = now()
  WHERE id = $1
  RETURNING id, user_id, status, subtotal, shipping_fee, discount_amount,
            total_amount, created_at, updated_at
`;

const FIND_ADMIN_ORDER_ITEMS_FOR_CANCELLATION_QUERY = `
  SELECT oi.product_id, oi.quantity
  FROM sales.order_items AS oi
  INNER JOIN catalog.products AS p
    ON p.id = oi.product_id
  WHERE oi.order_id = $1
  ORDER BY oi.product_id ASC
  FOR UPDATE OF oi, p
`;

const RESTORE_ADMIN_ORDER_STOCK_QUERY = `
  UPDATE catalog.products
  SET stock = stock + $2,
      updated_at = now()
  WHERE id = $1
`;

const INSERT_ADMIN_ORDER_STATUS_HISTORY_QUERY = `
  INSERT INTO sales.order_status_history (
    order_id, previous_status, new_status, changed_by
  )
  VALUES ($1, $2, $3, $4)
`;

type AdminOrderHeaderQueryRow = Omit<AdminOrderHeaderRow, 'address'> & {
  address_order_id: string | null;
  address_recipient_name: string | null;
  address_phone_number: string | null;
  address_postal_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_delivery_request: string | null;
  address_created_at: Date | null;
};

type AdminOrderForUpdateRow = {
  id: string;
  user_id: string;
  status: string;
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  total_amount: string;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class AdminOrdersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(
    query: AdminOrderListQuery,
  ): Promise<AdminOrderRepositoryResult> {
    const values = [
      query.fromTimestamp,
      query.toExclusiveTimestamp,
      query.status,
      query.search,
    ];
    const offset = (query.page - 1) * query.pageSize;

    return this.databaseService.transaction(async (executor) => {
      const [ordersResult, totalCountResult, statusCountsResult] =
        await Promise.all([
          executor.query<AdminOrderListRow>(FIND_ADMIN_ORDER_LIST_QUERY, [
            ...values,
            query.pageSize,
            offset,
          ]),
          executor.query<AdminOrderCountRow>(COUNT_ADMIN_ORDERS_QUERY, values),
          executor.query<AdminOrderStatusCountRow>(
            COUNT_ADMIN_ORDERS_BY_STATUS_QUERY,
            [query.fromTimestamp, query.toExclusiveTimestamp, query.search],
          ),
        ]);

      return {
        orders: ordersResult.rows,
        totalCount: totalCountResult.rows[0]?.total_count ?? 0,
        statusCounts: toStatusCounts(statusCountsResult.rows),
      };
    });
  }

  async findDetail(
    orderId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<AdminOrderDetailRepositoryResult | null> {
    const headerResult = await executor.query<AdminOrderHeaderQueryRow>(
      FIND_ADMIN_ORDER_HEADER_QUERY,
      [orderId],
    );
    const header = headerResult.rows[0];

    if (!header) {
      return null;
    }

    const [itemsResult, statusHistoryResult] = await Promise.all([
      executor.query<AdminOrderItemRow>(FIND_ADMIN_ORDER_ITEMS_QUERY, [
        orderId,
      ]),
      executor.query<AdminOrderStatusHistoryRow>(
        FIND_ADMIN_ORDER_STATUS_HISTORY_QUERY,
        [orderId],
      ),
    ]);

    return {
      header: {
        ...header,
        address: parseAddress(header),
      },
      items: itemsResult.rows,
      statusHistory: statusHistoryResult.rows,
    };
  }

  async findForUpdate(
    orderId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminOrderForUpdateRow | null> {
    const result = await executor.query<AdminOrderForUpdateRow>(
      FIND_ADMIN_ORDER_FOR_UPDATE_QUERY,
      [orderId],
    );

    return result.rows[0] ?? null;
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    const result = await executor.query<AdminOrderForUpdateRow>(
      UPDATE_ADMIN_ORDER_STATUS_QUERY,
      [orderId, status],
    );

    if (result.rowCount !== 1) {
      throw new Error('주문 상태 변경 결과를 확인할 수 없습니다.');
    }
  }

  async findItemsForCancellation(
    orderId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminOrderCancellationItemRow[]> {
    const result = await executor.query<AdminOrderCancellationItemRow>(
      FIND_ADMIN_ORDER_ITEMS_FOR_CANCELLATION_QUERY,
      [orderId],
    );

    return result.rows;
  }

  async restoreStock(
    productId: string,
    quantity: number,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    await executor.query(RESTORE_ADMIN_ORDER_STOCK_QUERY, [
      productId,
      quantity,
    ]);
  }

  async insertStatusHistory(
    orderId: string,
    fromStatus: string,
    toStatus: OrderStatus,
    changedBy: string,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    await executor.query(INSERT_ADMIN_ORDER_STATUS_HISTORY_QUERY, [
      orderId,
      fromStatus,
      toStatus,
      changedBy,
    ]);
  }
}

function toStatusCounts(
  rows: AdminOrderStatusCountRow[],
): Record<OrderStatus, number> {
  const counts = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;

  for (const row of rows) {
    if (isOrderStatus(row.status)) {
      counts[row.status] = row.count;
    }
  }

  return counts;
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

function parseAddress(
  value: AdminOrderHeaderQueryRow,
): AdminOrderAddressRow | null {
  if (
    typeof value.address_order_id !== 'string' ||
    typeof value.address_recipient_name !== 'string' ||
    typeof value.address_phone_number !== 'string' ||
    typeof value.address_postal_code !== 'string' ||
    typeof value.address_line1 !== 'string' ||
    !(
      value.address_line2 === null || typeof value.address_line2 === 'string'
    ) ||
    !(
      value.address_delivery_request === null ||
      typeof value.address_delivery_request === 'string'
    ) ||
    !(value.address_created_at instanceof Date)
  ) {
    return null;
  }

  return {
    order_id: value.address_order_id,
    recipient_name: value.address_recipient_name,
    phone_number: value.address_phone_number,
    postal_code: value.address_postal_code,
    address_line1: value.address_line1,
    address_line2: value.address_line2,
    delivery_request: value.address_delivery_request,
    created_at: value.address_created_at,
  };
}
