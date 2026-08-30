import { BadRequestException } from '@nestjs/common';

const SEOUL_TIME_ZONE = 'Asia/Seoul';
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

const SEOUL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: SEOUL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export type AdminDashboardQuery = {
  from: string;
  to: string;
};

export type AdminDashboardPeriod = {
  from: string;
  to: string;
  fromTimestamp: Date;
  toExclusiveTimestamp: Date;
  comparisonFrom: string;
  comparisonTo: string;
  comparisonFromTimestamp: Date;
  comparisonToExclusiveTimestamp: Date;
};

export function parseAdminDashboardQuery(
  value: unknown,
  now: Date = new Date(),
): AdminDashboardPeriod {
  if (!isRecord(value)) {
    throw new BadRequestException('대시보드 조회 조건이 올바르지 않습니다.');
  }

  const unsupportedField = Object.keys(value).find(
    (field) => field !== 'from' && field !== 'to',
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

  const today = formatSeoulDate(now);
  const defaultFrom = `${today.slice(0, 7)}-01`;
  const from = hasFrom ? parseDateOnly(value.from, 'from') : defaultFrom;
  const to = hasTo ? parseDateOnly(value.to, 'to') : today;

  if (from > to) {
    throw new BadRequestException('from은 to보다 늦을 수 없습니다.');
  }

  const dayCount = differenceInDays(from, addDays(to, 1));
  const comparisonFrom = addDays(from, -dayCount);
  const comparisonTo = addDays(from, -1);

  return {
    from,
    to,
    fromTimestamp: seoulMidnightToUtc(from),
    toExclusiveTimestamp: seoulMidnightToUtc(addDays(to, 1)),
    comparisonFrom,
    comparisonTo,
    comparisonFromTimestamp: seoulMidnightToUtc(comparisonFrom),
    comparisonToExclusiveTimestamp: seoulMidnightToUtc(from),
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

function seoulMidnightToUtc(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000+09:00`);
}

function differenceInDays(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);

  return Math.round(
    (toDate.getTime() - fromDate.getTime()) / MILLISECONDS_PER_DAY,
  );
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
