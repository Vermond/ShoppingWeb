import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { addDays, type AdminDashboardPeriod } from './admin-dashboard.input';
import { AdminReportsRepository } from './admin-reports.repository';
import {
  type AdminReportDailySalesRow,
  type AdminReportResponse,
  serializeAdminReport,
} from './admin-reports.types';

@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);

  constructor(
    private readonly adminReportsRepository: AdminReportsRepository,
  ) {}

  async findReports(
    period: AdminDashboardPeriod,
  ): Promise<AdminReportResponse> {
    try {
      const result = await this.adminReportsRepository.findReports(period);
      const dailySales = fillDailySales(period, result.dailySales);

      return serializeAdminReport(result, period, dailySales);
    } catch (error) {
      this.logger.error(
        '관리자 리포트 조회에 실패했습니다.',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException(
        '관리자 리포트를 불러오지 못했습니다.',
      );
    }
  }
}

function fillDailySales(
  period: AdminDashboardPeriod,
  rows: AdminReportDailySalesRow[],
): AdminReportDailySalesRow[] {
  const salesByDate = new Map(
    rows.map((row) => [
      row.date,
      { revenue: row.revenue, order_count: row.order_count },
    ]),
  );
  const result: AdminReportDailySalesRow[] = [];

  for (let date = period.from; date <= period.to; date = addDays(date, 1)) {
    const sales = salesByDate.get(date);

    result.push({
      date,
      revenue: sales?.revenue ?? '0',
      order_count: sales?.order_count ?? 0,
    });
  }

  return result;
}
