import { BadRequestException } from '@nestjs/common';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_INT4 = 2_147_483_647;
export const MAX_CART_MERGE_ITEMS = 100;

export type AddCartItemInput = {
  product_id: string;
  quantity: number;
};

export type UpdateCartItemInput = {
  quantity: number;
};

export type MergeCartInput = {
  items: AddCartItemInput[];
};

export function parseAddCartItemInput(value: unknown): AddCartItemInput {
  const body = readBody(value);
  validateFields(body, ['product_id', 'quantity']);

  return {
    product_id: readProductId(body),
    quantity: readQuantity(body),
  };
}

export function parseUpdateCartItemInput(value: unknown): UpdateCartItemInput {
  const body = readBody(value);
  validateFields(body, ['quantity']);

  return { quantity: readQuantity(body) };
}

export function parseMergeCartInput(value: unknown): MergeCartInput {
  const body = readBody(value);
  validateFields(body, ['items']);

  if (!Array.isArray(body.items)) {
    throw new BadRequestException('items는 배열이어야 합니다.');
  }

  if (body.items.length > MAX_CART_MERGE_ITEMS) {
    throw new BadRequestException(
      `items는 최대 ${MAX_CART_MERGE_ITEMS}개까지 입력할 수 있습니다.`,
    );
  }

  const mergedItems = new Map<string, number>();

  body.items.forEach((item, index) => {
    try {
      const parsedItem = parseAddCartItemInput(item);
      const nextQuantity =
        (mergedItems.get(parsedItem.product_id) ?? 0) + parsedItem.quantity;

      if (nextQuantity > MAX_INT4) {
        throw new BadRequestException(
          `items[${index}]의 상품별 합산 수량이 허용 범위를 초과했습니다.`,
        );
      }

      mergedItems.set(parsedItem.product_id, nextQuantity);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(
          `items[${index}]: ${getBadRequestMessage(error)}`,
        );
      }

      throw error;
    }
  });

  return {
    items: [...mergedItems.entries()].map(([product_id, quantity]) => ({
      product_id,
      quantity,
    })),
  };
}

function readBody(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new BadRequestException('요청 본문은 객체여야 합니다.');
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function readProductId(body: Record<string, unknown>): string {
  const value = body.product_id;

  if (typeof value !== 'string' || !UUID_V4_PATTERN.test(value)) {
    throw new BadRequestException('product_id는 UUID v4 형식이어야 합니다.');
  }

  return value.toLowerCase();
}

function readQuantity(body: Record<string, unknown>): number {
  const value = body.quantity;

  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_INT4
  ) {
    throw new BadRequestException(
      `quantity는 1부터 ${MAX_INT4} 사이의 정수여야 합니다.`,
    );
  }

  return value;
}

function getBadRequestMessage(error: BadRequestException): string {
  const response = error.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  if (
    typeof response === 'object' &&
    response !== null &&
    'message' in response &&
    typeof response.message === 'string'
  ) {
    return response.message;
  }

  return '요청값이 올바르지 않습니다.';
}
