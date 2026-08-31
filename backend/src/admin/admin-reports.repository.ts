import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type { AdminDashboardPeriod } from './admin-dashboard.input';
import type {
  AdminReportCategorySalesRow,
  AdminReportDailySalesRow,
  AdminReportRepositoryResult,
  AdminReportSummaryRow,
  AdminReportTopProductRow,
} from './admin-reports.types';

const VALID_ORDER_STATUSES = "'paid', 'shipped', 'completed'";
const GENERAL_USER_ROLES = "'user', 'customer'";
const SEOUL_TIME_ZONE = 'Asia/Seoul';

const FIND_SUMMARY_QUERY = `
  WITH valid_orders AS (
    SELECT o.user_id, o.total_amount
    FROM sales.orders AS o
    WHERE o.status IN (${VALID_ORDER_STATUSES})
      AND o.created_at >= $1
      AND o.created_at < $2
  ),
  customer_order_counts AS (
    SELECT vo.user_id, COUNT(*)::int AS order_count
    FROM valid_orders AS vo
    INNER JOIN auth.users AS u
      ON u.id = vo.user_id
     AND u.role IN (${GENERAL_USER_ROLES})
    GROUP BY vo.user_id
  )
  SELECT
    COALESCE((SELECT SUM(total_amount) FROM valid_orders), 0)::numeric AS revenue,
    (SELECT COUNT(*)::int FROM valid_orders) AS order_count,
    COALESCE(
      (SELECT SUM(total_amount) FROM valid_orders)
      / NULLIF((SELECT COUNT(*) FROM valid_orders), 0),
      0
    )::numeric AS average_order_amount,
    (
      SELECT COUNT(*)::int
      FROM auth.users
      WHERE role IN (${GENERAL_USER_ROLES})
        AND created_at >= $1
        AND created_at < $2
    ) AS new_customer_count,
    COALESCE(
      (
        SELECT COUNT(*) FILTER (WHERE order_count >= 2)::numeric
        FROM customer_order_counts
      )
      / NULLIF((SELECT COUNT(*) FROM customer_order_counts), 0)::numeric
      * 100,
      0
    )::numeric AS repurchase_rate_percent
`;

const FIND_DAILY_SALES_QUERY = `
  SELECT
    (o.created_at AT TIME ZONE '${SEOUL_TIME_ZONE}')::date::text AS date,
    COALESCE(SUM(o.total_amount), 0)::numeric AS revenue,
    COUNT(*)::int AS order_count
  FROM sales.orders AS o
  WHERE o.status IN (${VALID_ORDER_STATUSES})
    AND o.created_at >= $1
    AND o.created_at < $2
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
    WHERE o.status IN (${VALID_ORDER_STATUSES})
      AND o.created_at >= $1
      AND o.created_at < $2
  )
`;

const FIND_CATEGORY_SALES_QUERY = `
${VALID_ORDER_ITEMS_CTE}
  SELECT
    c.id::text AS category_id,
    c.name AS category_name,
    COALESCE(SUM(voi.unit_price * voi.quantity), 0)::numeric AS revenue,
    COALESCE(SUM(voi.quantity), 0)::int AS sales_quantity
  FROM catalog.categories AS c
  LEFT JOIN catalog.products AS p
    ON p.category_id = c.id
  LEFT JOIN valid_order_items AS voi
    ON voi.product_id = p.id
  GROUP BY c.id, c.name
  ORDER BY revenue DESC, c.id ASC
`;

const FIND_TOP_PRODUCTS_QUERY = `
  SELECT
    oi.product_id,
    p.name AS product_name,
    c.name AS category_name,
    SUM(oi.quantity)::int AS sales_quantity,
    SUM(oi.unit_price * oi.quantity)::numeric AS revenue
  FROM sales.order_items AS oi
  INNER JOIN sales.orders AS o
    ON o.id = oi.order_id
  INNER JOIN catalog.products AS p
    ON p.id = oi.product_id
  INNER JOIN catalog.categories AS c
    ON c.id = p.category_id
  WHERE o.status IN (${VALID_ORDER_STATUSES})
    AND o.created_at >= $1
    AND o.created_at < $2
  GROUP BY oi.product_id, p.name, c.name
  ORDER BY sales_quantity DESC, revenue DESC, oi.product_id ASC
  LIMIT 10
`;

@Injectable()
export class AdminReportsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findReports(
    period: AdminDashboardPeriod,
  ): Promise<AdminReportRepositoryResult> {
    return this.databaseService.transaction(async (executor) => {
      const [
        currentSummary,
        previousSummary,
        dailySales,
        categorySales,
        topProducts,
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
        this.findTopProducts(period, executor),
      ]);

      return {
        currentSummary,
        previousSummary,
        dailySales,
        categorySales,
        topProducts,
      };
    });
  }

  private async findSummary(
    from: Date,
    toExclusive: Date,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminReportSummaryRow> {
    const result = await executor.query<AdminReportSummaryRow>(
      FIND_SUMMARY_QUERY,
      [from, toExclusive],
    );

    return (
      result.rows[0] ?? {
        revenue: '0',
        order_count: 0,
        average_order_amount: '0',
        new_customer_count: 0,
        repurchase_rate_percent: '0',
      }
    );
  }

  private async findDailySales(
    period: AdminDashboardPeriod,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminReportDailySalesRow[]> {
    const result = await executor.query<AdminReportDailySalesRow>(
      FIND_DAILY_SALES_QUERY,
      [period.fromTimestamp, period.toExclusiveTimestamp],
    );

    return result.rows;
  }

  private async findCategorySales(
    period: AdminDashboardPeriod,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminReportCategorySalesRow[]> {
    const result = await executor.query<AdminReportCategorySalesRow>(
      FIND_CATEGORY_SALES_QUERY,
      [period.fromTimestamp, period.toExclusiveTimestamp],
    );

    return result.rows;
  }

  private async findTopProducts(
    period: AdminDashboardPeriod,
    executor: DatabaseQueryExecutor,
  ): Promise<AdminReportTopProductRow[]> {
    const result = await executor.query<AdminReportTopProductRow>(
      FIND_TOP_PRODUCTS_QUERY,
      [period.fromTimestamp, period.toExclusiveTimestamp],
    );

    return result.rows;
  }
}
