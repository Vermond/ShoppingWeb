import type { DatabaseService } from '../database/database.service';
import { parseAdminDashboardQuery } from './admin-dashboard.input';
import { AdminReportsRepository } from './admin-reports.repository';

describe('AdminReportsRepository', () => {
  it('loads report summaries and sales sections with valid filters', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            revenue: '100.00',
            order_count: 2,
            average_order_amount: '50.00',
            new_customer_count: 1,
            repurchase_rate_percent: '50.00',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            revenue: '50.00',
            order_count: 1,
            average_order_amount: '50.00',
            new_customer_count: 0,
            repurchase_rate_percent: '0.00',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ date: '2026-08-01', revenue: '100.00', order_count: 2 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            category_id: '1',
            category_name: '리빙',
            revenue: '90.00',
            sales_quantity: 3,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            product_id: '11111111-1111-4111-8111-111111111111',
            product_name: '상품 A',
            category_name: '리빙',
            sales_quantity: 3,
            revenue: '90.00',
          },
        ],
      });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminReportsRepository(databaseService);
    const period = parseAdminDashboardQuery({
      from: '2026-08-01',
      to: '2026-08-01',
    });

    const result = await repository.findReports(period);

    expect(result.currentSummary.average_order_amount).toBe('50.00');
    expect(result.dailySales[0]?.order_count).toBe(2);
    expect(result.categorySales[0]?.sales_quantity).toBe(3);
    expect(result.topProducts[0]?.product_name).toBe('상품 A');
    expect(databaseService.transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(5);

    const summaryQuery = query.mock.calls[0]?.[0] as string;
    expect(summaryQuery).toContain(
      "o.status IN ('paid', 'shipped', 'completed')",
    );
    expect(summaryQuery).toContain("u.role IN ('user', 'customer')");
    expect(summaryQuery).toContain('average_order_amount');

    const dailyQuery = query.mock.calls[2]?.[0] as string;
    expect(dailyQuery).toContain('Asia/Seoul');
    expect(dailyQuery).toContain('COUNT(*)::int AS order_count');

    const categoryQuery = query.mock.calls[3]?.[0] as string;
    expect(categoryQuery).toContain('SUM(voi.unit_price * voi.quantity)');
    expect(categoryQuery).toContain('SUM(voi.quantity)');
    expect(categoryQuery).toContain(
      "o.status IN ('paid', 'shipped', 'completed')",
    );

    const topProductsQuery = query.mock.calls[4]?.[0] as string;
    expect(topProductsQuery).toContain('LIMIT 10');
    expect(topProductsQuery).toContain('oi.unit_price * oi.quantity');
    expect(topProductsQuery).toContain(
      "o.status IN ('paid', 'shipped', 'completed')",
    );
  });

  it('uses the requested date range for current and previous summaries', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminReportsRepository(databaseService);
    const period = parseAdminDashboardQuery({
      from: '2026-08-01',
      to: '2026-08-03',
    });

    await repository.findReports(period);

    expect(query.mock.calls[0]?.[1]).toEqual([
      period.fromTimestamp,
      period.toExclusiveTimestamp,
    ]);
    expect(query.mock.calls[1]?.[1]).toEqual([
      period.comparisonFromTimestamp,
      period.comparisonToExclusiveTimestamp,
    ]);
  });
});
