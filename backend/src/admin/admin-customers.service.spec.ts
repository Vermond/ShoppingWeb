import { NotFoundException } from '@nestjs/common';
import type { AdminCustomersRepository } from './admin-customers.repository';
import { AdminCustomersService } from './admin-customers.service';
import type { AdminCustomerListQuery } from './admin-customers.input';

const query: AdminCustomerListQuery = {
  from: null,
  to: null,
  fromTimestamp: null,
  toExclusiveTimestamp: null,
  summaryFromTimestamp: new Date(),
  summaryToExclusiveTimestamp: new Date(),
  status: null,
  emailVerified: null,
  search: null,
  sort: 'created_at_desc',
  page: 1,
  pageSize: 20,
};

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  name: '홍길동',
  email: 'user@example.com',
  status: 'active',
  email_verified: true,
  created_at: new Date(),
  updated_at: new Date(),
  order_count: 2,
  total_spent: '1000.00',
  last_order_at: new Date(),
};

describe('AdminCustomersService', () => {
  it('maps the repository page and summary', async () => {
    const repository = {
      findPage: jest.fn().mockResolvedValue({
        rows: [row],
        totalCount: 1,
        statusCounts: { active: 1, withdrawn: 0 },
        summary: {
          total_customer_count: 1,
          active_customer_count: 1,
          new_customer_count: 1,
          repurchase_rate_percent: '50',
        },
      }),
    } as unknown as AdminCustomersRepository;
    const service = new AdminCustomersService(repository);

    const result = await service.findPage(query);

    expect(result.customers[0]?.status).toBe('active');
    expect(result.customers[0]?.total_spent.toFixed(2)).toBe('1000.00');
    expect(result.summary.repurchase_rate_percent).toBe(50);
  });

  it('returns 404 when the customer does not exist', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as AdminCustomersRepository;
    const service = new AdminCustomersService(repository);

    await expect(service.findOne(row.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('does not expose password or token data in detail responses', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        ...row,
        password_hash: 'must-not-leak',
        orders: [],
      }),
    } as unknown as AdminCustomersRepository;
    const service = new AdminCustomersService(repository);

    const result = await service.findOne(row.id);

    expect(result).not.toHaveProperty('password_hash');
    expect(result).not.toHaveProperty('tokens');
  });
});
