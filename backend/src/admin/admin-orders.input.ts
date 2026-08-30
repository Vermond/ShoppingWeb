import { BadRequestException } from '@nestjs/common';
import { ORDER_STATUSES, type OrderStatus } from '../orders/orders.types';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;

export type AdminOrderListQuery = {
  from: string | null;
  to: string | null;
  fromTimestamp: Date | null;
  toExclusiveTimestamp: Date | null;
  status: OrderStatus | null;
  search: string | null;
  page: number;
  pageSize: number;
};

export type AdminOrderStatusInput = {
  status: OrderStatus;
};

export function parseAdminOrderListQuery(value: unknown): AdminOrderListQuery {
  if (!isRecord(value)) {
    throw new BadRequestException('주문 조회 조건이 올바르지 않습니다.');
  }

  const supportedFields = new Set([
    'from',
    'to',
    'status',
    'search',
    'page',
    'page_size',
  ]);
  const unsupportedField = Object.keys(value).find(
    (field) => !supportedFields.has(field),
  );

  if (unsupportedField) {
    throw new BadRequestException(
      `지원하지 않는 조회 조건입니다: ${unsupportedField}`,
    );
  }

  const hasFrom = value.from !== undefined;
  const hasTo = value.to !== undefined;

  if (hasFrom !== hasTo) {
    throw new BadRequestException('from과 to는 함께 입력해야 합니다.');
  }

  const from = hasFrom ? parseDateOnly(value.from, 'from') : null;
  const to = hasTo ? parseDateOnly(value.to, 'to') : null;

  if (from && to && from > to) {
    throw new BadRequestException('from은 to보다 늦을 수 없습니다.');
  }

  return {
    from,
    to,
    fromTimestamp: from ? seoulMidnightToUtc(from) : null,
    toExclusiveTimestamp: to ? seoulMidnightToUtc(addDays(to, 1)) : null,
    status: parseOptionalStatus(value.status),
    search: parseOptionalSearch(value.search),
    page: parsePositiveInteger(value.page, 'page', 1),
    pageSize: parsePositiveInteger(
      value.page_size,
      'page_size',
      20,
      MAX_PAGE_SIZE,
    ),
  };
}

export function parseAdminOrderStatusInput(
  value: unknown,
): AdminOrderStatusInput {
  if (!isRecord(value)) {
    throw new BadRequestException('요청 본문은 객체여야 합니다.');
  }

  const unsupportedField = Object.keys(value).find(
    (field) => field !== 'status',
  );

  if (unsupportedField) {
    throw new BadRequestException(
      `지원하지 않는 필드입니다: ${unsupportedField}`,
    );
  }

  const status = parseStatus(value.status);

  return { status };
}

export function addDays(dateOnly: string, amount: number): string {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value: unknown, field: string): string {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    throw new BadRequestException(`${field}은 YYYY-MM-DD 형식이어야 합니다.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(`${field}은 유효한 날짜여야 합니다.`);
  }

  return value;
}

function parseOptionalStatus(value: unknown): OrderStatus | null {
  if (value === undefined) {
    return null;
  }

  return parseStatus(value);
}

function parseStatus(value: unknown): OrderStatus {
  if (
    typeof value !== 'string' ||
    !(ORDER_STATUSES as readonly string[]).includes(value)
  ) {
    throw new BadRequestException(
      `status는 ${ORDER_STATUSES.join(', ')} 중 하나여야 합니다.`,
    );
  }

  return value as OrderStatus;
}

function parseOptionalSearch(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('search는 문자열이어야 합니다.');
  }

  const search = value.trim();

  if (search.length > MAX_SEARCH_LENGTH) {
    throw new BadRequestException(
      `search는 ${MAX_SEARCH_LENGTH}자 이하여야 합니다.`,
    );
  }

  return search.length > 0 ? search : null;
}

function parsePositiveInteger(
  value: unknown,
  field: string,
  defaultValue: number,
  maxValue?: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new BadRequestException(`${field}은 양의 정수여야 합니다.`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${field}은 양의 정수여야 합니다.`);
  }

  if (maxValue !== undefined && parsed > maxValue) {
    throw new BadRequestException(`${field}은 ${maxValue} 이하여야 합니다.`);
  }

  return parsed;
}

function seoulMidnightToUtc(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000+09:00`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
