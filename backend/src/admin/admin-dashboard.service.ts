import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { addDays, type AdminDashboardPeriod } from './admin-dashboard.input';
import { AdminDashboardRepository } from './admin-dashboard.repository';
import {
  type AdminDashboardDailySalesRow,
  type AdminDashboardResponse,
  serializeAdminDashboard,
} from './admin-dashboard.types';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    private readonly adminDashboardRepository: AdminDashboardRepository,
  ) {}

  async findDashboard(
    period: AdminDashboardPeriod,
  ): Promise<AdminDashboardResponse> {
    try {
      const result = await this.adminDashboardRepository.findDashboard(period);
      const dailySales = fillDailySales(period, result.dailySales);

      return serializeAdminDashboard(result, period, dailySales);
    } catch (error) {
      this.logger.error(
        '관리자 대시보드 조회에 실패했습니다.',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        '관리자 대시보드를 불러오지 못했습니다.',
      );
    }
  }
}

function fillDailySales(
  period: AdminDashboardPeriod,
  rows: AdminDashboardDailySalesRow[],
): AdminDashboardDailySalesRow[] {
  const revenueByDate = new Map(rows.map((row) => [row.date, row.revenue]));
  const result: AdminDashboardDailySalesRow[] = [];

  for (let date = period.from; date <= period.to; date = addDays(date, 1)) {
    result.push({
      date,
      revenue: revenueByDate.get(date) ?? '0',
    });
  }

  return result;
}
