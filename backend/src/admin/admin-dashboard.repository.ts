import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type { AdminDashboardPeriod } from './admin-dashboard.input';
import type {
  AdminDashboardCategorySalesRow,
  AdminDashboardDailySalesRow,
  AdminDashboardInventoryRow,
  AdminDashboardRecentOrderProductRow,
  AdminDashboardRecentOrderRow,
  AdminDashboardRepositoryResult,
  AdminDashboardSummaryRow,
} from './admin-dashboard.types';

const SEOUL_TIME_ZONE = 'Asia/Seoul';

const FIND_SUMMARY_QUERY = `
  SELECT
    COALESCE(
      SUM(total_amount) FILTER (
        WHERE status IN ('paid', 'shipped', 'completed')
      ),
      0
    )::numeric AS revenue,
    COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS order_count,
    (
      SELECT COUNT(*)::int
      FROM auth.users
      WHERE status = 'active'
        AND email_verified = true
        AND created_at >= $1
        AND created_at < $2
    ) AS new_customer_count
  FROM sales.orders
  WHERE created_at >= $1
    AND created_at < $2
`;

const FIND_DAILY_SALES_QUERY = `
  SELECT
    (created_at AT TIME ZONE '${SEOUL_TIME_ZONE}')::date::text AS date,
    COALESCE(SUM(total_amount), 0)::numeric AS revenue
  FROM sales.orders
  WHERE status IN ('paid', 'shipped', 'completed')
    AND created_at >= $1
    AND created_at < $2
  GROUP BY 1
  ORDER BY 1 ASC
`;

const VALID_ORDER_ITEMS_CTE = `
  WITH valid_order_items AS (
    SELECT
      oi.product_id,
      oi.unit_price,
      oi.quantity
    FROM sales.order_items AS oi
    INNER JOIN sales.orders AS o
      ON o.id = oi.order_id
    WHERE o.status IN ('paid', 'shipped', 'completed')
      AND o.created_at >= $1
      AND o.created_at < $2
  )
`;

const FIND_CATEGORY_SALES_QUERY = `
${VALID_ORDER_ITEMS_CTE}
  SELECT
    c.id::text AS category_id,
    c.name AS category_name,
    COALESCE(SUM(voi.unit_price * voi.quantity), 0)::numeric AS revenue
  FROM catalog.categories AS c
  LEFT JOIN catalog.products AS p
    ON p.category_id = c.id
  LEFT JOIN valid_order_items AS voi
    ON voi.product_id = p.id
  GROUP BY c.id, c.name
  ORDER BY revenue DESC, c.id ASC
`;

const FIND_RECENT_ORDERS_QUERY = `
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
  GROUP BY o.id, o.user_id, u.name, o.total_amount, o.status, o.created_at
  ORDER BY o.created_at DESC, o.id DESC
  LIMIT 5
`;

const FIND_INVENTORY_QUERY = `
${VALID_ORDER_ITEMS_CTE}
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.category_id::text AS category_id,
    c.name AS category_name,
    p.stock,
    COALESCE(SUM(voi.quantity), 0)::int AS period_sold_quantity
  FROM catalog.products AS p
  INNER JOIN catalog.categories AS c
    ON c.id = p.category_id
  LEFT JOIN valid_order_items AS voi
    ON voi.product_id = p.id
  GROUP BY p.id, p.name, p.category_id, c.name, p.stock
  ORDER BY p.stock ASC, p.id ASC
`;

type SummaryQueryRow = AdminDashboardSummaryRow;

type RecentOrderQueryRow = Omit<
  AdminDashboardRecentOrderRow,
  'product_summary'
> & {
  product_summary: unknown;
};

@Injectable()
export class AdminDashboardRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findDashboard(
    period: AdminDashboardPeriod,
  ): Promise<AdminDashboardRepositoryResult> {
    return this.databaseService.transaction(async (executor) => {
      const [
        currentSummary,
        previousSummary,
        dailySales,
        categorySales,
        recentOrders,
        inventory,
      ] = await Promise.all([
        this.findSummary(
          period.fromTimestamp,
          period.toExclusiveTimestamp,
          executor,
        ),
        this.findSummary(
          period.comparisonFromTimestamp,
          period.comparisonToExclusiveTimestamp,
          executor,
        ),
        this.findDailySales(period, executor),
        this.findCategorySales(period, executor),
        this.findRecentOrders(executor),
        this.findInventory(period, executor),
      ]);

      return {
        currentSummary,
        previousSummary,
        dailySales,
        categorySales,
        recentOrders,
        inventory,
      };
    });
  }

  private async findSummary(
    from: Date,
    toExclusive: Date,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminDashboardSummaryRow> {
    const result = await executor.query<SummaryQueryRow>(FIND_SUMMARY_QUERY, [
      from,
      toExclusive,
    ]);

    return (
      result.rows[0] ?? {
        revenue: '0',
        order_count: 0,
        new_customer_count: 0,
      }
    );
  }

  private async findDailySales(
    period: AdminDashboardPeriod,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminDashboardDailySalesRow[]> {
    const result = await executor.query<AdminDashboardDailySalesRow>(
      FIND_DAILY_SALES_QUERY,
      [period.fromTimestamp, period.toExclusiveTimestamp],
    );

    return result.rows;
  }

  private async findCategorySales(
    period: AdminDashboardPeriod,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminDashboardCategorySalesRow[]> {
    const result = await executor.query<AdminDashboardCategorySalesRow>(
      FIND_CATEGORY_SALES_QUERY,
      [period.fromTimestamp, period.toExclusiveTimestamp],
    );

    return result.rows;
  }

  private async findRecentOrders(
    executor: DatabaseQueryExecutor,
  ): Promise<AdminDashboardRecentOrderRow[]> {
    const result = await executor.query<RecentOrderQueryRow>(
      FIND_RECENT_ORDERS_QUERY,
    );

    return result.rows.map((row) => ({
      ...row,
      product_summary: parseProductSummary(row.product_summary),
    }));
  }

  private async findInventory(
    period: AdminDashboardPeriod,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminDashboardInventoryRow[]> {
    const result = await executor.query<AdminDashboardInventoryRow>(
      FIND_INVENTORY_QUERY,
      [period.fromTimestamp, period.toExclusiveTimestamp],
    );

    return result.rows;
  }
}

function parseProductSummary(
  value: unknown,
): AdminDashboardRecentOrderRow['product_summary'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isProductSummaryItem(item)) {
      return [];
    }

    return [
      {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
      },
    ];
  });
}

function isProductSummaryItem(
  value: unknown,
): value is AdminDashboardRecentOrderProductRow {
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
