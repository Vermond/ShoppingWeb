import { BadRequestException } from '@nestjs/common';

const MAX_DELIVERY_REQUEST_LENGTH = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateOrderInput = {
  address_id: string;
  delivery_request: string | null;
};

export function parseCreateOrderInput(value: unknown): CreateOrderInput {
  if (!isRecord(value)) {
    throw new BadRequestException('요청 본문은 객체여야 합니다.');
  }

  const unsupportedField = Object.keys(value).find(
    (field) => field !== 'address_id' && field !== 'delivery_request',
  );

  if (unsupportedField) {
    throw new BadRequestException(
      `지원하지 않는 필드입니다: ${unsupportedField}`,
    );
  }

  const addressId = value.address_id;

  if (typeof addressId !== 'string' || !UUID_PATTERN.test(addressId.trim())) {
    throw new BadRequestException('address_id는 유효한 UUID여야 합니다.');
  }

  return {
    address_id: addressId.trim(),
    delivery_request: readNullableText(value.delivery_request),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNullableText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('delivery_request는 문자열이어야 합니다.');
  }

  const normalized = value.trim();

  if (normalized.length > MAX_DELIVERY_REQUEST_LENGTH) {
    throw new BadRequestException(
      `delivery_request는 ${MAX_DELIVERY_REQUEST_LENGTH}자 이하여야 합니다.`,
    );
  }

  return normalized || null;
}
