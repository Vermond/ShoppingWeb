import { InternalServerErrorException } from '@nestjs/common';
import type { AdminReportsRepository } from './admin-reports.repository';
import { parseAdminDashboardQuery } from './admin-dashboard.input';
import { AdminReportsService } from './admin-reports.service';

describe('AdminReportsService', () => {
  it('fills missing dates and serializes report metrics', async () => {
    const repository = createRepository();
    repository.findReports.mockResolvedValue({
      currentSummary: {
        revenue: '100.00',
        order_count: 2,
        average_order_amount: '50.00',
        new_customer_count: 1,
        repurchase_rate_percent: '50.00',
      },
      previousSummary: {
        revenue: '50.00',
        order_count: 1,
        average_order_amount: '25.00',
        new_customer_count: 0,
        repurchase_rate_percent: '0.00',
      },
      dailySales: [{ date: '2026-08-02', revenue: '100.00', order_count: 2 }],
      categorySales: [
        {
          category_id: '1',
          category_name: '리빙',
          revenue: '100.00',
          sales_quantity: 2,
        },
      ],
      topProducts: [
        {
          product_id: '11111111-1111-4111-8111-111111111111',
          product_name: '상품 A',
          category_name: '리빙',
          sales_quantity: 2,
          revenue: '100.00',
        },
      ],
    });
    const service = new AdminReportsService(repository);

    const result = await service.findReports(
      parseAdminDashboardQuery({
        from: '2026-08-01',
        to: '2026-08-03',
      }),
    );

    expect(result.comparison_period).toEqual({
      from: '2026-07-29',
      to: '2026-07-31',
    });
    expect(result.summary.revenue).toEqual({
      value: '100.00',
      change_rate_percent: 100,
    });
    expect(result.summary.average_order_amount).toEqual({
      value: '50.00',
      change_rate_percent: 100,
    });
    expect(result.summary.repurchase_rate_percent).toEqual({
      value: 50,
      change_rate_percent: null,
    });
    expect(result.daily_sales).toEqual([
      { date: '2026-08-01', revenue: '0.00', order_count: 0 },
      { date: '2026-08-02', revenue: '100.00', order_count: 2 },
      { date: '2026-08-03', revenue: '0.00', order_count: 0 },
    ]);
    expect(result.category_sales[0]?.sales_ratio_percent).toBe(100);
    expect(result.top_products[0]?.revenue).toBe('100.00');
  });

  it('returns null change rates when the previous value is zero', async () => {
    const repository = createRepository();
    repository.findReports.mockResolvedValue({
      currentSummary: {
        revenue: '0',
        order_count: 0,
        average_order_amount: '0',
        new_customer_count: 0,
        repurchase_rate_percent: '0',
      },
      previousSummary: {
        revenue: '0',
        order_count: 0,
        average_order_amount: '0',
        new_customer_count: 0,
        repurchase_rate_percent: '0',
      },
      dailySales: [],
      categorySales: [],
      topProducts: [],
    });
    const service = new AdminReportsService(repository);

    const result = await service.findReports(
      parseAdminDashboardQuery({
        from: '2026-08-01',
        to: '2026-08-01',
      }),
    );

    expect(result.summary.revenue.change_rate_percent).toBeNull();
    expect(result.summary.order_count.change_rate_percent).toBeNull();
    expect(
      result.summary.repurchase_rate_percent.change_rate_percent,
    ).toBeNull();
  });

  it('maps repository failures to an internal server error', async () => {
    const repository = createRepository();
    repository.findReports.mockRejectedValue(new Error('database failed'));
    const service = new AdminReportsService(repository);

    await expect(
      service.findReports(
        parseAdminDashboardQuery({
          from: '2026-08-01',
          to: '2026-08-01',
        }),
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

function createRepository() {
  return {
    findReports: jest.fn(),
  } as unknown as jest.Mocked<AdminReportsRepository>;
}
