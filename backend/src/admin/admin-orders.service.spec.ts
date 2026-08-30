import { ConflictException, NotFoundException } from '@nestjs/common';
import type { DatabaseService } from '../database/database.service';
import { parseAdminOrderListQuery } from './admin-orders.input';
import { AdminOrdersService } from './admin-orders.service';
import type { AdminOrdersRepository } from './admin-orders.repository';
import type {
  AdminOrderDetailRepositoryResult,
  AdminOrderListRow,
} from './admin-orders.types';

const orderId = '11111111-1111-4111-8111-111111111111';
const customerId = '22222222-2222-4222-8222-222222222222';
const adminId = '44444444-4444-4444-8444-444444444444';

describe('AdminOrdersService', () => {
  it('returns paginated orders and status counts', async () => {
    const repository = {
      findAll: jest.fn().mockResolvedValue({
        orders: [createListRow()],
        totalCount: 21,
        statusCounts: {
          pending: 2,
          paid: 10,
          shipped: 4,
          completed: 3,
          cancelled: 2,
        },
      }),
    } as unknown as AdminOrdersRepository;
    const service = new AdminOrdersService({} as DatabaseService, repository);

    const result = await service.findAll(
      parseAdminOrderListQuery({ page: '2', page_size: '20' }),
    );

    expect(result).toMatchObject({
      orders: [
        {
          order_id: orderId,
          payment_amount: '53000.00',
          payment_status: 'paid',
          shipping_status: 'preparing',
        },
      ],
      total_count: 21,
      status_counts: {
        paid: 10,
        cancelled: 2,
      },
      pagination: {
        page: 2,
        page_size: 20,
        total_count: 21,
        total_pages: 2,
        has_next: false,
        has_previous: true,
      },
    });
  });

  it('returns order detail with decimal money serialization', async () => {
    const repository = {
      findDetail: jest.fn().mockResolvedValue(createDetailResult()),
    } as unknown as AdminOrdersRepository;
    const databaseService = {
      transaction: jest.fn((callback: (executor: object) => unknown) =>
        callback({}),
      ),
    } as unknown as DatabaseService;
    const service = new AdminOrdersService(databaseService, repository);

    const result = await service.findOne(orderId);

    expect(result).toMatchObject({
      order_id: orderId,
      subtotal: '50000.00',
      shipping_fee: '3000.00',
      total_amount: '53000.00',
      customer: {
        id: customerId,
        email: 'user@example.com',
        phone_number: '010-1234-5678',
      },
      items: [{ unit_price: '25000.00', subtotal: '50000.00' }],
    });
    expect(repository.findDetail).toHaveBeenCalledWith(orderId, {});
  });

  it('changes an allowed status and stores the transition actor', async () => {
    const repository = {
      findForUpdate: jest.fn().mockResolvedValue({
        id: orderId,
        user_id: customerId,
        status: 'paid',
      }),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      insertStatusHistory: jest.fn().mockResolvedValue(undefined),
      findDetail: jest
        .fn()
        .mockResolvedValue(createDetailResult({ status: 'shipped' })),
    } as unknown as AdminOrdersRepository;
    const databaseService = {
      transaction: jest.fn((callback: (executor: object) => unknown) =>
        callback({}),
      ),
    } as unknown as DatabaseService;
    const service = new AdminOrdersService(databaseService, repository);

    const result = await service.updateStatus(orderId, adminId, {
      status: 'shipped',
    });

    expect(result.status).toBe('shipped');
    expect(repository.updateStatus).toHaveBeenCalledWith(
      orderId,
      'shipped',
      {},
    );
    expect(repository.insertStatusHistory).toHaveBeenCalledWith(
      orderId,
      'paid',
      'shipped',
      adminId,
      {},
    );
  });

  it('rejects a disallowed status transition without updating the order', async () => {
    const repository = {
      findForUpdate: jest.fn().mockResolvedValue({
        id: orderId,
        user_id: customerId,
        status: 'paid',
      }),
      updateStatus: jest.fn(),
      insertStatusHistory: jest.fn(),
    } as unknown as AdminOrdersRepository;
    const databaseService = {
      transaction: jest.fn((callback: (executor: object) => unknown) =>
        callback({}),
      ),
    } as unknown as DatabaseService;
    const service = new AdminOrdersService(databaseService, repository);

    await expect(
      service.updateStatus(orderId, adminId, { status: 'completed' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.updateStatus).not.toHaveBeenCalled();
    expect(repository.insertStatusHistory).not.toHaveBeenCalled();
  });

  it('restores stock when an allowed order is cancelled', async () => {
    const repository = {
      findForUpdate: jest.fn().mockResolvedValue({
        id: orderId,
        user_id: customerId,
        status: 'paid',
      }),
      findItemsForCancellation: jest.fn().mockResolvedValue([
        {
          product_id: '33333333-3333-4333-8333-333333333333',
          quantity: 2,
        },
      ]),
      restoreStock: jest.fn().mockResolvedValue(undefined),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      insertStatusHistory: jest.fn().mockResolvedValue(undefined),
      findDetail: jest
        .fn()
        .mockResolvedValue(createDetailResult({ status: 'cancelled' })),
    } as unknown as AdminOrdersRepository;
    const databaseService = {
      transaction: jest.fn((callback: (executor: object) => unknown) =>
        callback({}),
      ),
    } as unknown as DatabaseService;
    const service = new AdminOrdersService(databaseService, repository);

    await service.updateStatus(orderId, adminId, { status: 'cancelled' });

    expect(repository.restoreStock).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333',
      2,
      {},
    );
    expect(repository.insertStatusHistory).toHaveBeenCalledWith(
      orderId,
      'paid',
      'cancelled',
      adminId,
      {},
    );
  });

  it('returns not found when the order does not exist', async () => {
    const repository = {
      findForUpdate: jest.fn().mockResolvedValue(null),
    } as unknown as AdminOrdersRepository;
    const databaseService = {
      transaction: jest.fn((callback: (executor: object) => unknown) =>
        callback({}),
      ),
    } as unknown as DatabaseService;
    const service = new AdminOrdersService(databaseService, repository);

    await expect(
      service.updateStatus(orderId, adminId, { status: 'shipped' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createListRow(): AdminOrderListRow {
  return {
    order_id: orderId,
    customer_id: customerId,
    customer_name: '홍길동',
    product_summary: [
      {
        product_id: '33333333-3333-4333-8333-333333333333',
        product_name: '상품 A',
        quantity: 2,
      },
    ],
    product_count: 2,
    payment_amount: '53000.00',
    status: 'paid',
    ordered_at: new Date('2026-08-01T00:00:00.000Z'),
  };
}

function createDetailResult(
  overrides: { status?: string } = {},
): AdminOrderDetailRepositoryResult {
  const createdAt = new Date('2026-08-01T00:00:00.000Z');

  return {
    header: {
      order_id: orderId,
      customer_id: customerId,
      customer_name: '홍길동',
      customer_email: 'user@example.com',
      status: overrides.status ?? 'paid',
      subtotal: '50000.00',
      shipping_fee: '3000.00',
      discount_amount: '0.00',
      total_amount: '53000.00',
      created_at: createdAt,
      updated_at: createdAt,
      address: {
        order_id: orderId,
        recipient_name: '홍길동',
        phone_number: '010-1234-5678',
        postal_code: '06236',
        address_line1: '서울특별시 강남구 테헤란로 1',
        address_line2: null,
        delivery_request: null,
        created_at: createdAt,
      },
    },
    items: [
      {
        id: '1',
        order_id: orderId,
        product_id: '33333333-3333-4333-8333-333333333333',
        product_name: '상품 A',
        options: null,
        unit_price: '25000.00',
        quantity: 2,
      },
    ],
    statusHistory: [],
  };
}
