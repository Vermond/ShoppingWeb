import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  PRODUCT_STATUSES,
  type ProductStatus,
} from '../products/products.types';

const DATE_DECIMAL_MAX = new Decimal('9999999999.99');
const INT4_MAX = 2_147_483_647;
const INT8_MAX = BigInt('9223372036854775807');
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 10_000;
const MAX_IMAGE_COUNT = 50;
const MAX_IMAGE_URL_LENGTH = 2_048;
const MAX_SEARCH_LENGTH = 100;
const MAX_PAGE_SIZE = 100;
const MAX_OFFSET = 100_000;

export const ADMIN_PRODUCT_SORTS = [
  'created_at_desc',
  'created_at_asc',
  'price_desc',
  'price_asc',
  'stock_asc',
  'stock_desc',
  'sales_desc',
  'sales_asc',
] as const;

export type AdminProductSort = (typeof ADMIN_PRODUCT_SORTS)[number];

export type AdminProductListQuery = {
  search: string | null;
  categoryId: string | null;
  status: ProductStatus | null;
  lowStockThreshold: number | null;
  sort: AdminProductSort;
  page: number;
  pageSize: number;
};

export type AdminProductImageInput = {
  image_url: string;
  sort_order: number;
};

export type AdminProductCreateInput = {
  name: string;
  category_id: string;
  description: string | null;
  price: string;
  stock: number;
  max_order_quantity: number;
  status: ProductStatus;
  images: AdminProductImageInput[];
};

export type AdminProductUpdateInput = Partial<
  Omit<AdminProductCreateInput, 'images'>
> & {
  images?: AdminProductImageInput[];
};

export type AdminProductStockInput = {
  stock: number;
};

export type AdminProductStatusInput = {
  status: ProductStatus;
};

export function parseAdminProductListQuery(
  value: unknown,
): AdminProductListQuery {
  if (!isRecord(value)) {
    throw new BadRequestException('상품 목록 조회 조건이 올바르지 않습니다.');
  }

  const supportedFields = new Set([
    'search',
    'category_id',
    'status',
    'low_stock_threshold',
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

  const page = readPositiveInteger(value.page, 'page', 1);
  const pageSize = readPositiveInteger(value.page_size, 'page_size', 20);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new BadRequestException(
      `page_size는 ${MAX_PAGE_SIZE} 이하여야 합니다.`,
    );
  }

  const offset = (page - 1) * pageSize;

  if (!Number.isSafeInteger(offset) || offset > MAX_OFFSET) {
    throw new BadRequestException(
      `요청 가능한 상품 페이지 범위를 초과했습니다. (최대 offset: ${MAX_OFFSET})`,
    );
  }

  return {
    search: readOptionalSearch(value.search),
    categoryId: readOptionalInt8(value.category_id, 'category_id'),
    status: readOptionalStatus(value.status),
    lowStockThreshold: readOptionalInt4(
      value.low_stock_threshold,
      'low_stock_threshold',
    ),
    sort: readSort(value.sort),
    page,
    pageSize,
  };
}

export function parseAdminProductCreateInput(
  value: unknown,
): AdminProductCreateInput {
  const body = readBody(value);
  validateFields(body, [
    'name',
    'category_id',
    'description',
    'price',
    'stock',
    'max_order_quantity',
    'status',
    'images',
  ]);

  return {
    name: readName(body.name),
    category_id: readRequiredInt8(body.category_id, 'category_id'),
    description: readDescription(body.description),
    price: readPrice(body.price),
    stock: readRequiredInt4(body.stock, 'stock', 0),
    max_order_quantity: readRequiredInt4(
      body.max_order_quantity,
      'max_order_quantity',
      1,
    ),
    status: readOptionalStatus(body.status) ?? 'draft',
    images: readImages(body.images),
  };
}

export function parseAdminProductUpdateInput(
  value: unknown,
): AdminProductUpdateInput {
  const body = readBody(value);
  validateFields(body, [
    'name',
    'category_id',
    'description',
    'price',
    'stock',
    'max_order_quantity',
    'status',
    'images',
  ]);

  if (Object.keys(body).length === 0) {
    throw new BadRequestException('수정할 상품 정보가 없습니다.');
  }

  const input: AdminProductUpdateInput = {};

  if ('name' in body) input.name = readName(body.name);
  if ('category_id' in body) {
    input.category_id = readRequiredInt8(body.category_id, 'category_id');
  }
  if ('description' in body)
    input.description = readDescription(body.description);
  if ('price' in body) input.price = readPrice(body.price);
  if ('stock' in body) input.stock = readRequiredInt4(body.stock, 'stock', 0);
  if ('max_order_quantity' in body) {
    input.max_order_quantity = readRequiredInt4(
      body.max_order_quantity,
      'max_order_quantity',
      1,
    );
  }
  if ('status' in body) input.status = readRequiredStatus(body.status);
  if ('images' in body) input.images = readImages(body.images);

  return input;
}

export function parseAdminProductStatusInput(
  value: unknown,
): AdminProductStatusInput {
  const body = readBody(value);
  validateFields(body, ['status']);

  return { status: readRequiredStatus(body.status) };
}

export function parseAdminProductStockInput(
  value: unknown,
): AdminProductStockInput {
  const body = readBody(value);
  validateFields(body, ['stock']);

  return { stock: readRequiredInt4(body.stock, 'stock', 0) };
}

function readBody(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new BadRequestException('요청 본문은 객체여야 합니다.');
  }

  return value;
}

function validateFields(
  body: Record<string, unknown>,
  allowedFields: readonly string[],
): void {
  const allowedFieldSet = new Set(allowedFields);
  const unsupportedField = Object.keys(body).find(
    (field) => !allowedFieldSet.has(field),
  );

  if (unsupportedField) {
    throw new BadRequestException(
      `지원하지 않는 필드입니다: ${unsupportedField}`,
    );
  }
}

function readName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException('name은 필수 문자열입니다.');
  }

  const name = value.trim();

  if (name.length > MAX_NAME_LENGTH) {
    throw new BadRequestException(
      `name은 ${MAX_NAME_LENGTH}자 이하여야 합니다.`,
    );
  }

  return name;
}

function readDescription(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      'description은 문자열 또는 null이어야 합니다.',
    );
  }

  const description = value.trim();

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new BadRequestException(
      `description은 ${MAX_DESCRIPTION_LENGTH}자 이하여야 합니다.`,
    );
  }

  return description.length > 0 ? description : null;
}

function readPrice(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(
      'price는 소수점 둘째 자리까지의 금액 문자열이어야 합니다.',
    );
  }

  let price: Decimal;

  try {
    price = new Decimal(value.trim());
  } catch {
    throw new BadRequestException('price 형식이 올바르지 않습니다.');
  }

  if (
    !price.isFinite() ||
    price.isNegative() ||
    price.decimalPlaces() > 2 ||
    price.gt(DATE_DECIMAL_MAX)
  ) {
    throw new BadRequestException(
      'price는 0 이상이며 소수점 둘째 자리까지 입력해야 합니다.',
    );
  }

  return price.toFixed(2);
}

function readRequiredInt4(
  value: unknown,
  field: string,
  minimum: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > INT4_MAX
  ) {
    throw new BadRequestException(
      `${field}은 ${minimum} 이상 ${INT4_MAX} 이하의 정수여야 합니다.`,
    );
  }

  return value;
}

function readOptionalInt4(value: unknown, field: string): number | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new BadRequestException(`${field}은 0 이상 정수여야 합니다.`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed > INT4_MAX) {
    throw new BadRequestException(
      `${field}은 0 이상 ${INT4_MAX} 이하의 정수여야 합니다.`,
    );
  }

  return parsed;
}

function readRequiredInt8(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new BadRequestException(`${field}은 양의 정수 문자열이어야 합니다.`);
  }

  const parsed = BigInt(value);

  if (parsed < 1n || parsed > INT8_MAX) {
    throw new BadRequestException(`${field} 값의 범위가 올바르지 않습니다.`);
  }

  return parsed.toString();
}

function readOptionalInt8(value: unknown, field: string): string | null {
  if (value === undefined) {
    return null;
  }

  return readRequiredInt8(value, field);
}

function readOptionalStatus(value: unknown): ProductStatus | null {
  if (value === undefined) {
    return null;
  }

  return readRequiredStatus(value);
}

function readRequiredStatus(value: unknown): ProductStatus {
  if (
    typeof value !== 'string' ||
    !(PRODUCT_STATUSES as readonly string[]).includes(value)
  ) {
    throw new BadRequestException(
      `status는 ${PRODUCT_STATUSES.join(', ')} 중 하나여야 합니다.`,
    );
  }

  return value as ProductStatus;
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

  return search.length > 0 ? search : null;
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

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${field}은 양의 정수여야 합니다.`);
  }

  return parsed;
}

function readSort(value: unknown): AdminProductSort {
  if (value === undefined) {
    return 'created_at_desc';
  }

  if (
    typeof value !== 'string' ||
    !(ADMIN_PRODUCT_SORTS as readonly string[]).includes(value)
  ) {
    throw new BadRequestException(
      `sort는 ${ADMIN_PRODUCT_SORTS.join(', ')} 중 하나여야 합니다.`,
    );
  }

  return value as AdminProductSort;
}

function readImages(value: unknown): AdminProductImageInput[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new BadRequestException('images는 배열이어야 합니다.');
  }

  if (value.length > MAX_IMAGE_COUNT) {
    throw new BadRequestException(
      `images는 최대 ${MAX_IMAGE_COUNT}개까지 입력할 수 있습니다.`,
    );
  }

  const sortOrders = new Set<number>();

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new BadRequestException(`images[${index}]는 객체여야 합니다.`);
    }

    validateFields(item, ['image_url', 'sort_order']);

    if (
      typeof item.image_url !== 'string' ||
      item.image_url.trim().length === 0 ||
      item.image_url.length > MAX_IMAGE_URL_LENGTH
    ) {
      throw new BadRequestException(
        `images[${index}].image_url이 올바르지 않습니다.`,
      );
    }

    const imageUrl = item.image_url.trim();
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      throw new BadRequestException(
        `images[${index}].image_url은 URL이어야 합니다.`,
      );
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new BadRequestException(
        `images[${index}].image_url은 http 또는 https URL이어야 합니다.`,
      );
    }

    const sortOrder = readRequiredInt4(item.sort_order, 'sort_order', 0);

    if (sortOrders.has(sortOrder)) {
      throw new BadRequestException(
        `images[${index}].sort_order가 중복되었습니다.`,
      );
    }

    sortOrders.add(sortOrder);

    return { image_url: imageUrl, sort_order: sortOrder };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
