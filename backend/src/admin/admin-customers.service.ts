import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AdminCustomerListQuery } from './admin-customers.input';
import { AdminCustomersRepository } from './admin-customers.repository';
import {
  createEmptyCustomerStatusCounts,
  serializeAdminCustomerDetail,
  toAdminCustomerDetailRecord,
  toAdminCustomerRecord,
  toAdminCustomerSummaryRecord,
  type AdminCustomerDetailResponse,
  type AdminCustomerPage,
} from './admin-customers.types';

@Injectable()
export class AdminCustomersService {
  private readonly logger = new Logger(AdminCustomersService.name);

  constructor(
    private readonly adminCustomersRepository: AdminCustomersRepository,
  ) {}

  async findPage(query: AdminCustomerListQuery): Promise<AdminCustomerPage> {
    try {
      const result = await this.adminCustomersRepository.findPage(query);

      return {
        customers: result.rows.map(toAdminCustomerRecord),
        totalCount: result.totalCount,
        statusCounts: {
          ...createEmptyCustomerStatusCounts(),
          ...result.statusCounts,
        },
        summary: toAdminCustomerSummaryRecord(result.summary),
      };
    } catch (error) {
      throw this.handleError('관리자 고객 목록 조회에 실패했습니다.', error);
    }
  }

  async findOne(id: string): Promise<AdminCustomerDetailResponse> {
    try {
      const customer = await this.adminCustomersRepository.findById(id);

      if (!customer) {
        throw new NotFoundException({
          code: 'CUSTOMER_NOT_FOUND',
          message: '고객을 찾을 수 없습니다.',
        });
      }

      return serializeAdminCustomerDetail(
        toAdminCustomerDetailRecord(customer),
      );
    } catch (error) {
      throw this.handleError('관리자 고객 상세 조회에 실패했습니다.', error);
    }
  }

  private handleError(message: string, error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    this.logger.error(
      message,
      error instanceof Error ? error.stack : String(error),
    );
    return new InternalServerErrorException('고객 정보를 처리하지 못했습니다.');
  }
}
