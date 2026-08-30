import { BadRequestException } from '@nestjs/common';
import {
  parseAdminOrderListQuery,
  parseAdminOrderStatusInput,
} from './admin-orders.input';

describe('admin order input', () => {
  it('parses filters and converts Seoul date boundaries to UTC', () => {
    const result = parseAdminOrderListQuery({
      from: '2026-08-01',
      to: '2026-08-30',
      status: 'paid',
      search: '  홍길동  ',
      page: '2',
      page_size: '50',
    });

    expect(result).toMatchObject({
      from: '2026-08-01',
      to: '2026-08-30',
      status: 'paid',
      search: '홍길동',
      page: 2,
      pageSize: 50,
    });
    expect(result.fromTimestamp.toISOString()).toBe('2026-07-31T15:00:00.000Z');
    expect(result.toExclusiveTimestamp?.toISOString()).toBe(
      '2026-08-30T15:00:00.000Z',
    );
  });

  it('uses an unrestricted date range and pagination defaults when omitted', () => {
    expect(parseAdminOrderListQuery({})).toMatchObject({
      from: null,
      to: null,
      fromTimestamp: null,
      toExclusiveTimestamp: null,
      status: null,
      search: null,
      page: 1,
      pageSize: 20,
    });
  });

  it.each([
    [{ from: '2026-08-01' }, 'from과 to는 함께'],
    [{ from: '2026-08-31', to: '2026-08-01' }, 'from은 to보다'],
    [{ status: 'unknown' }, 'status는'],
    [{ page: '0' }, 'page은'],
    [{ page_size: '101' }, 'page_size은'],
    [{ unexpected: 'value' }, '지원하지 않는 조회 조건'],
  ])('rejects invalid list query %#', (query, message) => {
    expect(() => parseAdminOrderListQuery(query)).toThrow(new RegExp(message));
  });

  it('parses a status update body and rejects unsupported fields', () => {
    expect(parseAdminOrderStatusInput({ status: 'shipped' })).toEqual({
      status: 'shipped',
    });
    expect(() =>
      parseAdminOrderStatusInput({ status: 'shipped', reason: 'test' }),
    ).toThrow(BadRequestException);
  });
});
