import { BadRequestException } from '@nestjs/common';
import { addDays, parseAdminDashboardQuery } from './admin-dashboard.input';

describe('admin dashboard input parser', () => {
  it('uses the current Seoul month by default', () => {
    const period = parseAdminDashboardQuery(
      {},
      new Date('2026-08-30T01:00:00.000Z'),
    );

    expect(period.from).toBe('2026-08-01');
    expect(period.to).toBe('2026-08-30');
    expect(period.comparisonFrom).toBe('2026-07-02');
    expect(period.comparisonTo).toBe('2026-07-31');
    expect(period.fromTimestamp.toISOString()).toBe('2026-07-31T15:00:00.000Z');
    expect(period.toExclusiveTimestamp.toISOString()).toBe(
      '2026-08-30T15:00:00.000Z',
    );
  });

  it('creates a same-length previous period from an explicit range', () => {
    const period = parseAdminDashboardQuery({
      from: '2026-02-01',
      to: '2026-02-03',
    });

    expect(period.comparisonFrom).toBe('2026-01-29');
    expect(period.comparisonTo).toBe('2026-01-31');
  });

  it('rejects malformed, partial, reversed, and unsupported parameters', () => {
    expect(() => parseAdminDashboardQuery({ from: '2026-02-01' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseAdminDashboardQuery({ from: '2026-02-30', to: '2026-03-01' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseAdminDashboardQuery({ from: '2026-03-01', to: '2026-02-01' }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseAdminDashboardQuery({
        from: '2026-02-01',
        to: '2026-02-01',
        page: '1',
      }),
    ).toThrow(BadRequestException);
  });

  it('adds and subtracts calendar days', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});
