import type { DatabaseService } from '../database/database.service';
import { parseAdminOrderListQuery } from './admin-orders.input';
import { AdminOrdersRepository } from './admin-orders.repository';

const orderId = '11111111-1111-4111-8111-111111111111';
const customerId = '22222222-2222-4222-8222-222222222222';
const productId = '33333333-3333-4333-8333-333333333333';

describe('AdminOrdersRepository', () => {
  it('queries paginated orders, total count, and status counts with matching filters', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            order_id: orderId,
            customer_id: customerId,
            customer_name: '홍길동',
            product_summary: [
              { product_id: productId, product_name: '상품 A', quantity: 2 },
            ],
            product_count: 2,
            payment_amount: '53000.00',
            status: 'paid',
            ordered_at: new Date('2026-08-01T00:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total_count: 21 }] })
      .mockResolvedValueOnce({
        rows: [
          { status: 'pending', count: 2 },
          { status: 'paid', count: 10 },
          { status: 'shipped', count: 4 },
          { status: 'completed', count: 3 },
          { status: 'cancelled', count: 2 },
        ],
      });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminOrdersRepository(databaseService);
    const listQuery = parseAdminOrderListQuery({
      from: '2026-08-01',
      to: '2026-08-30',
      status: 'paid',
      search: '홍길동',
      page: '2',
      page_size: '20',
    });

    const result = await repository.findAll(listQuery);

    expect(result.orders).toHaveLength(1);
    expect(result.totalCount).toBe(21);
    expect(result.statusCounts).toEqual({
      pending: 2,
      paid: 10,
      shipped: 4,
      completed: 3,
      cancelled: 2,
    });
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[0]?.[1]).toEqual([
      listQuery.fromTimestamp,
      listQuery.toExclusiveTimestamp,
      'paid',
      '홍길동',
      20,
      20,
    ]);
    expect(query.mock.calls[2]?.[1]).toEqual([
      listQuery.fromTimestamp,
      listQuery.toExclusiveTimestamp,
      '홍길동',
    ]);

    const listSql = query.mock.calls[0]?.[0] as string;
    const statusCountSql = query.mock.calls[2]?.[0] as string;
    expect(listSql).toContain('o.created_at >= $1');
    expect(listSql).toContain('o.created_at < $2');
    expect(listSql).toContain('o.status = $3');
    expect(listSql).toContain('search_oi.product_name ILIKE');
    expect(listSql).toContain('ORDER BY o.created_at DESC, o.id DESC');
    expect(listSql).toContain('LIMIT $5');
    expect(listSql).toContain('OFFSET $6');
    expect(statusCountSql).not.toContain('o.status = $3');
  });

  it('loads order detail data including the delivery snapshot and history', async () => {
    const createdAt = new Date('2026-08-01T00:00:00.000Z');
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            order_id: orderId,
            customer_id: customerId,
            customer_name: '홍길동',
            customer_email: 'user@example.com',
            status: 'paid',
            subtotal: '50000.00',
            shipping_fee: '3000.00',
            discount_amount: '0.00',
            total_amount: '53000.00',
            created_at: createdAt,
            updated_at: createdAt,
            address_order_id: orderId,
            address_recipient_name: '홍길동',
            address_phone_number: '010-1234-5678',
            address_postal_code: '06236',
            address_line1: '서울특별시 강남구 테헤란로 1',
            address_line2: null,
            address_delivery_request: null,
            address_created_at: createdAt,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            order_id: orderId,
            product_id: productId,
            product_name: '상품 A',
            options: null,
            unit_price: '25000.00',
            quantity: 2,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            order_id: orderId,
            from_status: null,
            to_status: 'paid',
            changed_by: null,
            created_at: createdAt,
          },
        ],
      });
    const repository = new AdminOrdersRepository({ query } as DatabaseService);

    const result = await repository.findDetail(orderId);

    expect(result?.header.address?.phone_number).toBe('010-1234-5678');
    expect(result?.items[0]?.product_name).toBe('상품 A');
    expect(result?.statusHistory[0]?.to_status).toBe('paid');
    expect(query.mock.calls[0]?.[0]).toContain('sales.order_addresses');
    expect(query.mock.calls[1]?.[0]).toContain('NULL::text AS options');
    expect(query.mock.calls[2]?.[0]).toContain('sales.order_status_history');
    expect(query.mock.calls[2]?.[0]).toContain(
      'previous_status AS from_status',
    );
    expect(query.mock.calls[2]?.[0]).toContain('new_status AS to_status');
  });

  it('updates status and records the administrator in the same executor', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: orderId,
            user_id: customerId,
            status: 'paid',
            subtotal: '50000.00',
            shipping_fee: '3000.00',
            discount_amount: '0.00',
            total_amount: '53000.00',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const repository = new AdminOrdersRepository({} as DatabaseService);
    const executor = { query };

    const current = await repository.findForUpdate(orderId, executor);
    await repository.updateStatus(orderId, 'shipped', executor);
    await repository.insertStatusHistory(
      orderId,
      current?.status ?? 'paid',
      'shipped',
      '44444444-4444-4444-8444-444444444444',
      executor,
    );

    expect(query.mock.calls[1]?.[1]).toEqual([orderId, 'shipped']);
    expect(query.mock.calls[2]?.[1]).toEqual([
      orderId,
      'paid',
      'shipped',
      '44444444-4444-4444-8444-444444444444',
    ]);
    expect(query.mock.calls[2]?.[0]).toContain(
      'INSERT INTO sales.order_status_history',
    );
    expect(query.mock.calls[2]?.[0]).toContain(
      'order_id, previous_status, new_status, changed_by',
    );
  });
});
