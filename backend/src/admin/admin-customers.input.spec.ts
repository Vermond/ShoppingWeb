import { BadRequestException } from '@nestjs/common';
import { parseAdminCustomerListQuery } from './admin-customers.input';

describe('admin customers input', () => {
  it('parses filters, Seoul date boundaries, and pagination', () => {
    const result = parseAdminCustomerListQuery(
      {
        search: ' 홍길동 ',
        status: 'withdrawn',
        email_verified: 'false',
        from: '2026-08-01',
        to: '2026-08-30',
        sort: 'total_spent_desc',
        page: '2',
        page_size: '20',
      },
      new Date('2026-08-30T12:00:00.000Z'),
    );

    expect(result.search).toBe('홍길동');
    expect(result.status).toBe('withdrawn');
    expect(result.emailVerified).toBe(false);
    expect(result.fromTimestamp.toISOString()).toBe('2026-07-31T15:00:00.000Z');
    expect(result.toExclusiveTimestamp?.toISOString()).toBe(
      '2026-08-30T15:00:00.000Z',
    );
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
    expect(result.summaryFromTimestamp.toISOString()).toBe(
      '2026-07-31T15:00:00.000Z',
    );
  });

  it('uses the current Seoul month for the new-customer summary when no date filter is provided', () => {
    const result = parseAdminCustomerListQuery(
      {},
      new Date('2026-08-30T12:00:00.000Z'),
    );

    expect(result.from).toBeNull();
    expect(result.to).toBeNull();
    expect(result.summaryFromTimestamp.toISOString()).toBe(
      '2026-07-31T15:00:00.000Z',
    );
    expect(result.summaryToExclusiveTimestamp.toISOString()).toBe(
      '2026-08-30T15:00:00.000Z',
    );
  });

  it.each([
    ['status', { status: 'dormant' }],
    ['email_verified', { email_verified: 'yes' }],
    ['date pair', { from: '2026-08-01' }],
    ['sort', { sort: 'order_count_asc' }],
    ['unknown field', { role: 'admin' }],
  ])('rejects invalid %s', (_label, value) => {
    expect(() => parseAdminCustomerListQuery(value)).toThrow(
      BadRequestException,
    );
  });

  it('rejects a page range beyond the configured offset limit', () => {
    expect(() =>
      parseAdminCustomerListQuery({ page: '5001', page_size: '100' }),
    ).toThrow(/최대 offset/);
  });
});
