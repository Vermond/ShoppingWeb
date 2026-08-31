import { BadRequestException } from '@nestjs/common';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_OFFSET = 100_000;
const MAX_SEARCH_LENGTH = 100;
const INT8_MAX = BigInt('9223372036854775807');

export const PRODUCT_SORTS = [
  'created_at_desc',
  'price_asc',
  'price_desc',
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];

export type ProductsQuery = {
  page: number;
  limit: number;
  categoryId: string | null;
  search: string | null;
  sort: ProductSort;
};

export function parseProductsQuery(value: unknown): ProductsQuery {
  if (!isRecord(value)) {
    throw new BadRequestException('상품 목록 조회 조건이 올바르지 않습니다.');
  }

  const supportedFields = new Set([
    'page',
    'limit',
    'category_id',
    'search',
    'sort',
  ]);
  const unsupportedField = Object.keys(value).find(
    (field) => !supportedFields.has(field),
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

  return {
    page,
    limit,
    categoryId: readOptionalInt8(value.category_id, 'category_id'),
    search: readOptionalSearch(value.search),
    sort: readSort(value.sort),
  };
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

function readOptionalSearch(value: unknown): string | null {
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

  return search || null;
}

function readOptionalInt8(value: unknown, field: string): string | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new BadRequestException(`${field}은 양의 정수여야 합니다.`);
  }

  const parsedValue = BigInt(value);

  if (parsedValue < BigInt(1) || parsedValue > INT8_MAX) {
    throw new BadRequestException(`${field}은 양의 정수여야 합니다.`);
  }

  return value;
}

function readSort(value: unknown): ProductSort {
  if (value === undefined) {
    return 'created_at_desc';
  }

  if (
    typeof value !== 'string' ||
    !(PRODUCT_SORTS as readonly string[]).includes(value)
  ) {
    throw new BadRequestException(
      `sort는 ${PRODUCT_SORTS.join(', ')} 중 하나여야 합니다.`,
    );
  }

  return value as ProductSort;
}
