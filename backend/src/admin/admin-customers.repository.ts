import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type { AdminCustomerListQuery } from './admin-customers.input';
import {
  ADMIN_CUSTOMER_STATUSES,
  type AdminCustomerStatus,
} from './admin-customers.input';
import type {
  AdminCustomerCountRow,
  AdminCustomerDetailRow,
  AdminCustomerOrderRow,
  AdminCustomerRepositoryResult,
  AdminCustomerStatusCountRow,
  AdminCustomerListRow,
  AdminCustomerSummaryRow,
} from './admin-customers.types';

const PURCHASED_ORDER_STATUSES = "'paid', 'shipped', 'completed'";

const CUSTOMER_FILTERS = `
  WHERE u.role = 'customer'
    AND ($1::text IS NULL OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.id::text ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL OR u.status = $2)
    AND ($3::boolean IS NULL OR u.email_verified = $3)
    AND ($4::timestamptz IS NULL OR u.created_at >= $4)
    AND ($5::timestamptz IS NULL OR u.created_at < $5)
`;

const CUSTOMER_FILTERS_WITHOUT_STATUS = `
  WHERE u.role = 'customer'
    AND ($1::text IS NULL OR u.name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.id::text ILIKE '%' || $1 || '%')
    AND ($2::boolean IS NULL OR u.email_verified = $2)
    AND ($3::timestamptz IS NULL OR u.created_at >= $3)
    AND ($4::timestamptz IS NULL OR u.created_at < $4)
`;

const CUSTOMER_ORDER_STATS_JOIN = `
  LEFT JOIN (
    SELECT
      o.user_id,
      COUNT(*)::int AS order_count,
      COALESCE(SUM(o.total_amount), 0)::numeric AS total_spent,
      MAX(o.created_at) AS last_order_at
    FROM sales.orders AS o
    WHERE o.status IN (${PURCHASED_ORDER_STATUSES})
    GROUP BY o.user_id
  ) AS order_stats
    ON order_stats.user_id = u.id
`;

const FIND_CUSTOMERS_QUERY_BASE = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.status,
    u.email_verified,
    u.created_at,
    u.updated_at,
    COALESCE(order_stats.order_count, 0)::int AS order_count,
    COALESCE(order_stats.total_spent, 0)::numeric AS total_spent,
    order_stats.last_order_at
  FROM auth.users AS u
${CUSTOMER_ORDER_STATS_JOIN}
${CUSTOMER_FILTERS}
`;

const COUNT_CUSTOMERS_QUERY = `
  SELECT COUNT(*)::int AS total_count
  FROM auth.users AS u
${CUSTOMER_FILTERS}
`;

const COUNT_CUSTOMERS_BY_STATUS_QUERY = `
  SELECT u.status, COUNT(*)::int AS count
  FROM auth.users AS u
${CUSTOMER_FILTERS_WITHOUT_STATUS}
  GROUP BY u.status
`;

const FIND_CUSTOMER_SUMMARY_QUERY = `
  WITH purchased_customer_stats AS (
    SELECT
      o.user_id,
      COUNT(*)::int AS order_count
    FROM sales.orders AS o
    WHERE o.status IN (${PURCHASED_ORDER_STATUSES})
    GROUP BY o.user_id
  )
  SELECT
    COUNT(*)::int AS total_customer_count,
    COUNT(*) FILTER (WHERE u.status = 'active')::int AS active_customer_count,
    COUNT(*) FILTER (
      WHERE u.created_at >= $1
        AND u.created_at < $2
    )::int AS new_customer_count,
    COALESCE(
      (
        COUNT(*) FILTER (WHERE pcs.order_count >= 2)::numeric
        / NULLIF(COUNT(pcs.user_id), 0)::numeric
        * 100
      ),
      0
    )::numeric AS repurchase_rate_percent
  FROM auth.users AS u
  LEFT JOIN purchased_customer_stats AS pcs
    ON pcs.user_id = u.id
  WHERE u.role = 'customer'
`;

const FIND_CUSTOMER_QUERY = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.status,
    u.email_verified,
    u.created_at,
    u.updated_at,
    COALESCE(order_stats.order_count, 0)::int AS order_count,
    COALESCE(order_stats.total_spent, 0)::numeric AS total_spent,
    order_stats.last_order_at
  FROM auth.users AS u
${CUSTOMER_ORDER_STATS_JOIN}
  WHERE u.id = $1
    AND u.role = 'customer'
`;

const FIND_CUSTOMER_ORDERS_QUERY = `
  SELECT
    o.id AS order_id,
    o.status,
    o.total_amount,
    o.created_at,
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
    COALESCE(SUM(oi.quantity), 0)::int AS product_count
  FROM sales.orders AS o
  LEFT JOIN sales.order_items AS oi
    ON oi.order_id = o.id
  WHERE o.user_id = $1
  GROUP BY o.id, o.status, o.total_amount, o.created_at
  ORDER BY o.created_at DESC, o.id DESC
`;

type CustomerOrderQueryRow = Omit<AdminCustomerOrderRow, 'product_summary'> & {
  product_summary: unknown;
};

@Injectable()
export class AdminCustomersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findPage(
    query: AdminCustomerListQuery,
  ): Promise<AdminCustomerRepositoryResult> {
    const values = [
      query.search,
      query.status,
      query.emailVerified,
      query.fromTimestamp,
      query.toExclusiveTimestamp,
    ];
    const offset = (query.page - 1) * query.pageSize;
    const listQuery = `${FIND_CUSTOMERS_QUERY_BASE}  ORDER BY ${getSortSql(query.sort)}\n  LIMIT $6\n  OFFSET $7\n`;

    return this.databaseService.transaction(async (executor) => {
      const [customersResult, countResult, statusCountsResult, summaryResult] =
        await Promise.all([
          executor.query<AdminCustomerListRow>(listQuery, [
            ...values,
            query.pageSize,
            offset,
          ]),
          executor.query<AdminCustomerCountRow>(COUNT_CUSTOMERS_QUERY, values),
          executor.query<AdminCustomerStatusCountRow>(
            COUNT_CUSTOMERS_BY_STATUS_QUERY,
            [
              query.search,
              query.emailVerified,
              query.fromTimestamp,
              query.toExclusiveTimestamp,
            ],
          ),
          executor.query<AdminCustomerSummaryRow>(FIND_CUSTOMER_SUMMARY_QUERY, [
            query.summaryFromTimestamp,
            query.summaryToExclusiveTimestamp,
          ]),
        ]);

      return {
        rows: customersResult.rows,
        totalCount: countResult.rows[0]?.total_count ?? 0,
        statusCounts: toStatusCounts(statusCountsResult.rows),
        summary: summaryResult.rows[0] ?? {
          total_customer_count: 0,
          active_customer_count: 0,
          new_customer_count: 0,
          repurchase_rate_percent: '0',
        },
      };
    });
  }

  async findById(
    id: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<AdminCustomerDetailRow | null> {
    const customerResult = await executor.query<AdminCustomerListRow>(
      FIND_CUSTOMER_QUERY,
      [id],
    );
    const customer = customerResult.rows[0];

    if (!customer) {
      return null;
    }

    const ordersResult = await executor.query<CustomerOrderQueryRow>(
      FIND_CUSTOMER_ORDERS_QUERY,
      [id],
    );

    return {
      ...customer,
      orders: ordersResult.rows.map((order) => ({
        ...order,
        product_summary: parseProductSummary(order.product_summary),
      })),
    };
  }
}

function getSortSql(sort: AdminCustomerListQuery['sort']): string {
  switch (sort) {
    case 'created_at_desc':
      return 'u.created_at DESC, u.id DESC';
    case 'created_at_asc':
      return 'u.created_at ASC, u.id ASC';
    case 'order_count_desc':
      return 'COALESCE(order_stats.order_count, 0) DESC, u.id DESC';
    case 'total_spent_desc':
      return 'COALESCE(order_stats.total_spent, 0) DESC, u.id DESC';
    case 'last_order_at_desc':
      return 'order_stats.last_order_at DESC NULLS LAST, u.id DESC';
  }
}

function toStatusCounts(
  rows: AdminCustomerStatusCountRow[],
): Record<AdminCustomerStatus, number> {
  const counts = Object.fromEntries(
    ADMIN_CUSTOMER_STATUSES.map((status) => [status, 0]),
  ) as Record<AdminCustomerStatus, number>;

  for (const row of rows) {
    if ((ADMIN_CUSTOMER_STATUSES as readonly string[]).includes(row.status)) {
      counts[row.status as AdminCustomerStatus] = row.count;
    }
  }

  return counts;
}

function parseProductSummary(
  value: unknown,
): AdminCustomerOrderRow['product_summary'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isProductSummaryItem(item)) {
      return [];
    }

    return [item];
  });
}

function isProductSummaryItem(
  value: unknown,
): value is AdminCustomerOrderRow['product_summary'][number] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.product_id === 'string' &&
    typeof item.product_name === 'string' &&
    typeof item.quantity === 'number'
  );
}
