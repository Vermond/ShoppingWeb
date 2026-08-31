import { InternalServerErrorException } from '@nestjs/common';
import type { AdminDashboardRepository } from './admin-dashboard.repository';
import { parseAdminDashboardQuery } from './admin-dashboard.input';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  it('fills missing dates in the daily sales series with zero amounts', async () => {
    const repository = createRepository();
    repository.findDashboard.mockResolvedValue({
      currentSummary: {
        revenue: '100.00',
        order_count: 1,
        new_customer_count: 1,
      },
      previousSummary: {
        revenue: '50.00',
        order_count: 1,
        new_customer_count: 1,
      },
      dailySales: [{ date: '2026-08-02', revenue: '100.00' }],
      categorySales: [],
      recentOrders: [],
      inventory: [],
    });
    const service = new AdminDashboardService(repository);

    const result = await service.findDashboard(
      parseAdminDashboardQuery({
        from: '2026-08-01',
        to: '2026-08-03',
      }),
    );

    expect(result.daily_sales).toEqual([
      { date: '2026-08-01', revenue: '0.00' },
      { date: '2026-08-02', revenue: '100.00' },
      { date: '2026-08-03', revenue: '0.00' },
    ]);
  });

  it('maps repository failures to an internal server error', async () => {
    const repository = createRepository();
    repository.findDashboard.mockRejectedValue(new Error('database failed'));
    const service = new AdminDashboardService(repository);

    await expect(
      service.findDashboard(
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
    findDashboard: jest.fn(),
  } as unknown as jest.Mocked<AdminDashboardRepository>;
}
