import { BadRequestException } from '@nestjs/common';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_OFFSET = 100_000;

export type ProductsQuery = {
  page: number;
  limit: number;
};

export function parseProductsQuery(value: unknown): ProductsQuery {
  if (!isRecord(value)) {
    throw new BadRequestException('상품 목록 조회 조건이 올바르지 않습니다.');
  }

  const unsupportedField = Object.keys(value).find(
    (field) => field !== 'page' && field !== 'limit',
  );

  if (unsupportedField) {
    throw new BadRequestException(
      `지원하지 않는 조회 조건입니다: ${unsupportedField}`,
    );
  }

  const page = readPositiveInteger(value.page, 'page', DEFAULT_PAGE);
  const limit = readPositiveInteger(value.limit, 'limit', DEFAULT_LIMIT);

  if (limit > MAX_LIMIT) {
    throw new BadRequestException(
      `limit은 ${MAX_LIMIT} 이하의 정수여야 합니다.`,
    );
  }

  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset) || offset > MAX_OFFSET) {
    throw new BadRequestException(
      `요청 가능한 상품 페이지 범위를 초과했습니다. (최대 offset: ${MAX_OFFSET})`,
    );
  }

  return { page, limit };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPositiveInteger(
  value: unknown,
  field: string,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new BadRequestException(`${field}은 양의 정수여야 합니다.`);
  }

  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    throw new BadRequestException(`${field}은 양의 정수여야 합니다.`);
  }

  return parsedValue;
}
