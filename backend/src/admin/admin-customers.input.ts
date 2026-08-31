import { BadRequestException } from '@nestjs/common';

const SEOUL_TIME_ZONE = 'Asia/Seoul';
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_PAGE_SIZE = 100;
const MAX_OFFSET = 100_000;
const MAX_SEARCH_LENGTH = 100;

const SEOUL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: SEOUL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const ADMIN_CUSTOMER_STATUSES = ['active', 'withdrawn'] as const;
export type AdminCustomerStatus = (typeof ADMIN_CUSTOMER_STATUSES)[number];

export const ADMIN_CUSTOMER_SORTS = [
  'created_at_desc',
  'created_at_asc',
  'order_count_desc',
  'total_spent_desc',
  'last_order_at_desc',
] as const;
export type AdminCustomerSort = (typeof ADMIN_CUSTOMER_SORTS)[number];

export type AdminCustomerListQuery = {
  from: string | null;
  to: string | null;
  fromTimestamp: Date | null;
  toExclusiveTimestamp: Date | null;
  summaryFromTimestamp: Date;
  summaryToExclusiveTimestamp: Date;
  status: AdminCustomerStatus | null;
  emailVerified: boolean | null;
  search: string | null;
  sort: AdminCustomerSort;
  page: number;
  pageSize: number;
};

export function parseAdminCustomerListQuery(
  value: unknown,
  now: Date = new Date(),
): AdminCustomerListQuery {
  if (!isRecord(value)) {
    throw new BadRequestException('고객 조회 조건이 올바르지 않습니다.');
  }

  const supportedFields = new Set([
    'search',
    'status',
    'email_verified',
    'from',
    'to',
    'sort',
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

  const today = formatSeoulDate(now);
  const summaryFrom = from ?? `${today.slice(0, 7)}-01`;
  const summaryTo = to ?? today;

  const page = parsePositiveInteger(value.page, 'page', 1);
  const pageSize = parsePositiveInteger(
    value.page_size,
    'page_size',
    20,
    MAX_PAGE_SIZE,
  );

  if (
    !Number.isSafeInteger((page - 1) * pageSize) ||
    (page - 1) * pageSize > MAX_OFFSET
  ) {
    throw new BadRequestException(
      `요청 가능한 고객 페이지 범위를 초과했습니다. (최대 offset: ${MAX_OFFSET})`,
    );
  }

  return {
    from,
    to,
    fromTimestamp: from ? seoulMidnightToUtc(from) : null,
    toExclusiveTimestamp: to ? seoulMidnightToUtc(addDays(to, 1)) : null,
    summaryFromTimestamp: seoulMidnightToUtc(summaryFrom),
    summaryToExclusiveTimestamp: seoulMidnightToUtc(addDays(summaryTo, 1)),
    status: parseOptionalStatus(value.status),
    emailVerified: parseOptionalBoolean(value.email_verified),
    search: parseOptionalSearch(value.search),
    sort: parseSort(value.sort),
    page,
    pageSize,
  };
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

function parseOptionalStatus(value: unknown): AdminCustomerStatus | null {
  if (value === undefined) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !(ADMIN_CUSTOMER_STATUSES as readonly string[]).includes(value)
  ) {
    throw new BadRequestException(
      `status는 ${ADMIN_CUSTOMER_STATUSES.join(', ')} 중 하나여야 합니다.`,
    );
  }

  return value as AdminCustomerStatus;
}

function parseOptionalBoolean(value: unknown): boolean | null {
  if (value === undefined) {
    return null;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new BadRequestException('email_verified는 true 또는 false여야 합니다.');
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

function parseSort(value: unknown): AdminCustomerSort {
  if (value === undefined) {
    return 'created_at_desc';
  }

  if (
    typeof value !== 'string' ||
    !(ADMIN_CUSTOMER_SORTS as readonly string[]).includes(value)
  ) {
    throw new BadRequestException(
      `sort는 ${ADMIN_CUSTOMER_SORTS.join(', ')} 중 하나여야 합니다.`,
    );
  }

  return value as AdminCustomerSort;
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

function formatSeoulDate(value: Date): string {
  const parts = SEOUL_DATE_FORMATTER.formatToParts(value);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
