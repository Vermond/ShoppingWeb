import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type {
  AdminOrderListQuery,
  AdminOrderStatusInput,
} from './admin-orders.input';
import { AdminOrdersRepository } from './admin-orders.repository';
import {
  createEmptyStatusCounts,
  serializeAdminOrderDetail,
  serializeAdminOrderList,
  toAdminOrderDetailRecord,
  toAdminOrderListRecord,
  type AdminOrderDetailResponse,
  type AdminOrderListResponse,
} from './admin-orders.types';
import type { OrderStatus } from '../orders/orders.types';

export const ADMIN_ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
};

@Injectable()
export class AdminOrdersService {
  private readonly logger = new Logger(AdminOrdersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly adminOrdersRepository: AdminOrdersRepository,
  ) {}

  async findAll(query: AdminOrderListQuery): Promise<AdminOrderListResponse> {
    try {
      const result = await this.adminOrdersRepository.findAll(query);
      const totalPages = Math.ceil(result.totalCount / query.pageSize);
      const statusCounts = {
        ...createEmptyStatusCounts(),
        ...result.statusCounts,
      };

      return {
        orders: result.orders.map((order) =>
          serializeAdminOrderList(toAdminOrderListRecord(order)),
        ),
        total_count: result.totalCount,
        status_counts: statusCounts,
        pagination: {
          page: query.page,
          page_size: query.pageSize,
          total_count: result.totalCount,
          total_pages: totalPages,
          has_next: query.page < totalPages,
          has_previous: query.page > 1,
        },
      };
    } catch (error) {
      throw this.handleError('관리자 주문 목록 조회에 실패했습니다.', error);
    }
  }

  async findOne(orderId: string): Promise<AdminOrderDetailResponse> {
    try {
      const result = await this.databaseService.transaction((executor) =>
        this.adminOrdersRepository.findDetail(orderId, executor),
      );

      if (!result) {
        throw new NotFoundException({
          code: 'ORDER_NOT_FOUND',
          message: '주문을 찾을 수 없습니다.',
        });
      }

      return serializeAdminOrderDetail(toAdminOrderDetailRecord(result));
    } catch (error) {
      throw this.handleError('관리자 주문 상세 조회에 실패했습니다.', error);
    }
  }

  async updateStatus(
    orderId: string,
    adminUserId: string,
    input: AdminOrderStatusInput,
  ): Promise<AdminOrderDetailResponse> {
    try {
      const result = await this.databaseService.transaction(
        async (executor) => {
          const currentOrder = await this.adminOrdersRepository.findForUpdate(
            orderId,
            executor,
          );

          if (!currentOrder) {
            throw new NotFoundException({
              code: 'ORDER_NOT_FOUND',
              message: '주문을 찾을 수 없습니다.',
            });
          }

          if (currentOrder.status === input.status) {
            const detail = await this.adminOrdersRepository.findDetail(
              orderId,
              executor,
            );

            if (!detail) {
              throw new Error('주문 상세 정보를 조회하지 못했습니다.');
            }

            return detail;
          }

          if (!isAllowedStatusTransition(currentOrder.status, input.status)) {
            throw new ConflictException({
              code: 'ORDER_STATUS_TRANSITION_NOT_ALLOWED',
              message: '현재 주문 상태에서는 해당 상태로 변경할 수 없습니다.',
            });
          }

          if (input.status === 'cancelled') {
            const items =
              await this.adminOrdersRepository.findItemsForCancellation(
                orderId,
                executor,
              );

            for (const item of items) {
              await this.adminOrdersRepository.restoreStock(
                item.product_id,
                item.quantity,
                executor,
              );
            }
          }

          await this.adminOrdersRepository.updateStatus(
            orderId,
            input.status,
            executor,
          );
          await this.adminOrdersRepository.insertStatusHistory(
            orderId,
            currentOrder.status,
            input.status,
            adminUserId,
            executor,
          );

          const detail = await this.adminOrdersRepository.findDetail(
            orderId,
            executor,
          );

          if (!detail) {
            throw new Error(
              '상태 변경 후 주문 상세 정보를 조회하지 못했습니다.',
            );
          }

          return detail;
        },
      );

      return serializeAdminOrderDetail(toAdminOrderDetailRecord(result));
    } catch (error) {
      throw this.handleError('관리자 주문 상태 변경에 실패했습니다.', error);
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
    return new InternalServerErrorException('주문을 처리하지 못했습니다.');
  }
}

function isAllowedStatusTransition(
  fromStatus: string,
  toStatus: OrderStatus,
): boolean {
  if (!(fromStatus in ADMIN_ORDER_STATUS_TRANSITIONS)) {
    return false;
  }

  return ADMIN_ORDER_STATUS_TRANSITIONS[fromStatus as OrderStatus].includes(
    toStatus,
  );
}
