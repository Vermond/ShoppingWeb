import type { DatabaseService } from '../database/database.service';
import { parseAdminDashboardQuery } from './admin-dashboard.input';
import { AdminDashboardRepository } from './admin-dashboard.repository';

describe('AdminDashboardRepository', () => {
  it('loads all dashboard sections in one database transaction', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [{ revenue: '100.00', order_count: 2, new_customer_count: 1 }],
      })
      .mockResolvedValueOnce({
        rows: [{ revenue: '50.00', order_count: 1, new_customer_count: 1 }],
      })
      .mockResolvedValueOnce({
        rows: [{ date: '2026-08-01', revenue: '100.00' }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            category_id: '1',
            category_name: 'Category',
            revenue: '90.00',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            order_id: '22222222-2222-4222-8222-222222222222',
            customer_id: '11111111-1111-4111-8111-111111111111',
            customer_name: 'User',
            product_summary: [
              {
                product_id: '33333333-3333-4333-8333-333333333333',
                product_name: 'Product',
                quantity: 1,
              },
            ],
            product_count: 1,
            payment_amount: '100.00',
            status: 'paid',
            ordered_at: new Date('2026-08-01T00:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            product_id: '33333333-3333-4333-8333-333333333333',
            product_name: 'Product',
            category_id: '1',
            category_name: 'Category',
            stock: 10,
            period_sold_quantity: 1,
          },
        ],
      });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminDashboardRepository(databaseService);
    const period = parseAdminDashboardQuery({
      from: '2026-08-01',
      to: '2026-08-01',
    });

    const result = await repository.findDashboard(period);

    expect(result.currentSummary.revenue).toBe('100.00');
    expect(result.previousSummary.order_count).toBe(1);
    expect(result.dailySales).toHaveLength(1);
    expect(result.categorySales[0]?.revenue).toBe('90.00');
    expect(result.recentOrders[0]?.product_summary[0]?.product_name).toBe(
      'Product',
    );
    expect(result.inventory[0]?.stock).toBe(10);
    expect(databaseService.transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(6);
    expect(query.mock.calls[0]?.[0]).toContain("status <> 'cancelled'");
    expect(query.mock.calls[2]?.[0]).toContain('Asia/Seoul');
    expect(query.mock.calls[3]?.[0]).toContain('WITH valid_order_items AS');
    expect(query.mock.calls[3]?.[0]).toContain('INNER JOIN sales.orders AS o');
    expect(query.mock.calls[3]?.[0]).toContain(
      "o.status IN ('paid', 'shipped', 'completed')",
    );
    expect(query.mock.calls[3]?.[0]).toContain('o.created_at >= $1');
    expect(query.mock.calls[3]?.[0]).toContain('o.created_at < $2');
    expect(query.mock.calls[3]?.[0]).toContain(
      'SUM(voi.unit_price * voi.quantity)',
    );
    expect(query.mock.calls[3]?.[0]).not.toContain(
      'SUM(oi.unit_price * oi.quantity)',
    );
    expect(query.mock.calls[4]?.[0]).toContain('LIMIT 5');
    expect(query.mock.calls[5]?.[0]).toContain('WITH valid_order_items AS');
    expect(query.mock.calls[5]?.[0]).toContain('INNER JOIN sales.orders AS o');
    expect(query.mock.calls[5]?.[0]).toContain('SUM(voi.quantity)');
    expect(query.mock.calls[5]?.[0]).not.toContain('SUM(oi.quantity)');
  });

  it('filters category sales and inventory quantities before aggregation', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminDashboardRepository(databaseService);
    const period = parseAdminDashboardQuery({
      from: '2026-08-01',
      to: '2026-08-01',
    });

    await repository.findDashboard(period);

    const categoryQuery = query.mock.calls[3]?.[0] as string;
    const inventoryQuery = query.mock.calls[5]?.[0] as string;

    for (const sql of [categoryQuery, inventoryQuery]) {
      expect(sql).toMatch(
        /WITH valid_order_items AS[\s\S]*INNER JOIN sales\.orders AS o[\s\S]*WHERE o\.status IN \('paid', 'shipped', 'completed'\)[\s\S]*AND o\.created_at >= \$1[\s\S]*AND o\.created_at < \$2[\s\S]*LEFT JOIN valid_order_items AS voi/,
      );
    }

    expect(categoryQuery).toContain('SUM(voi.unit_price * voi.quantity)');
    expect(inventoryQuery).toContain('SUM(voi.quantity)');
  });
});
