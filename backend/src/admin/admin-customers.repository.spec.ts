import type { DatabaseService } from '../database/database.service';
import { parseAdminCustomerListQuery } from './admin-customers.input';
import { AdminCustomersRepository } from './admin-customers.repository';

const customerId = '11111111-1111-4111-8111-111111111111';

describe('AdminCustomersRepository', () => {
  it('queries customer filters, aggregate sorting, status counts, and summary', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_count: 1 }] })
      .mockResolvedValueOnce({ rows: [{ status: 'active', count: 1 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            total_customer_count: 10,
            active_customer_count: 8,
            new_customer_count: 2,
            repurchase_rate_percent: '25.00',
          },
        ],
      });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminCustomersRepository(databaseService);
    const listQuery = parseAdminCustomerListQuery({
      search: '홍길동',
      status: 'active',
      email_verified: 'true',
      from: '2026-08-01',
      to: '2026-08-30',
      sort: 'order_count_desc',
      page: '2',
      page_size: '20',
    });

    const result = await repository.findPage(listQuery);

    expect(result.totalCount).toBe(1);
    expect(result.statusCounts).toEqual({ active: 1, withdrawn: 0 });
    expect(result.summary.repurchase_rate_percent).toBe('25.00');
    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[0]?.[1]).toEqual([
      '홍길동',
      'active',
      true,
      listQuery.fromTimestamp,
      listQuery.toExclusiveTimestamp,
      20,
      20,
    ]);
    expect(query.mock.calls[2]?.[1]).toEqual([
      '홍길동',
      true,
      listQuery.fromTimestamp,
      listQuery.toExclusiveTimestamp,
    ]);

    const listSql = query.mock.calls[0]?.[0] as string;
    const statusCountSql = query.mock.calls[2]?.[0] as string;
    const summarySql = query.mock.calls[3]?.[0] as string;
    expect(listSql).toContain("u.role = 'customer'");
    expect(listSql).toContain('u.id::text ILIKE');
    expect(listSql).toContain("o.status IN ('paid', 'shipped', 'completed')");
    expect(listSql).toContain(
      'ORDER BY COALESCE(order_stats.order_count, 0) DESC',
    );
    expect(statusCountSql).not.toContain('u.status = $2');
    expect(summarySql).toContain("COUNT(*) FILTER (WHERE u.status = 'active')");
    expect(summarySql).toContain('order_count >= 2');
  });

  it('loads a customer detail and order summaries without authentication columns', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: customerId,
            name: '홍길동',
            email: 'user@example.com',
            status: 'active',
            email_verified: true,
            created_at: new Date(),
            updated_at: new Date(),
            order_count: 1,
            total_spent: '53000.00',
            last_order_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            order_id: '22222222-2222-4222-8222-222222222222',
            status: 'paid',
            total_amount: '53000.00',
            created_at: new Date(),
            product_summary: [
              { product_id: 'product-1', product_name: '상품', quantity: 1 },
            ],
            product_count: 1,
          },
        ],
      });
    const repository = new AdminCustomersRepository({
      query,
    } as DatabaseService);

    const result = await repository.findById(customerId);

    expect(result?.orders).toHaveLength(1);
    expect(query.mock.calls[0]?.[0]).not.toContain('password_hash');
    expect(query.mock.calls[1]?.[0]).toContain('FROM sales.orders AS o');
    expect(query.mock.calls[1]?.[0]).toContain('ORDER BY o.created_at DESC');
  });
});
