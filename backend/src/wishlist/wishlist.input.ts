import { BadRequestException } from '@nestjs/common';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AddWishlistItemInput = {
  product_id: string;
};

export function parseAddWishlistItemInput(
  value: unknown,
): AddWishlistItemInput {
  if (!isRecord(value)) {
    throw new BadRequestException('요청 본문은 객체여야 합니다.');
  }

  const unsupportedField = Object.keys(value).find(
    (field) => field !== 'product_id',
  );

  if (unsupportedField) {
    throw new BadRequestException(
      `지원하지 않는 필드입니다: ${unsupportedField}`,
    );
  }

  if (
    typeof value.product_id !== 'string' ||
    !UUID_V4_PATTERN.test(value.product_id)
  ) {
    throw new BadRequestException('product_id는 UUID v4 형식이어야 합니다.');
  }

  return { product_id: value.product_id.toLowerCase() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
