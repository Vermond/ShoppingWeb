import { BadRequestException } from '@nestjs/common';

const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const MAX_NAME_LENGTH = 100;
const MAX_POSTAL_CODE_LENGTH = 20;
const MAX_ADDRESS_LENGTH = 300;

export type UpdateUserProfileInput = {
  phone_number: string;
};

export type CreateUserAddressInput = {
  recipient_name: string;
  phone_number: string;
  postal_code: string;
  address_line1: string;
  address_line2: string | null;
  is_default: boolean;
};

export type UpdateUserAddressInput = {
  recipient_name?: string;
  phone_number?: string;
  postal_code?: string;
  address_line1?: string;
  address_line2?: string | null;
  is_default?: boolean;
};

export function parseUserProfileInput(value: unknown): UpdateUserProfileInput {
  const body = readBody(value);
  validateFields(body, ['phone_number']);

  return { phone_number: readPhoneNumber(body, 'phone_number') };
}

export function parseCreateUserAddressInput(
  value: unknown,
): CreateUserAddressInput {
  const body = readBody(value);
  validateFields(body, [
    'recipient_name',
    'phone_number',
    'postal_code',
    'address_line1',
    'address_line2',
    'is_default',
  ]);

  return {
    recipient_name: readText(body, 'recipient_name', MAX_NAME_LENGTH),
    phone_number: readPhoneNumber(body, 'phone_number'),
    postal_code: readText(body, 'postal_code', MAX_POSTAL_CODE_LENGTH),
    address_line1: readText(body, 'address_line1', MAX_ADDRESS_LENGTH),
    address_line2: readNullableText(body, 'address_line2', MAX_ADDRESS_LENGTH),
    is_default: readOptionalBoolean(body, 'is_default') ?? false,
  };
}

export function parseUpdateUserAddressInput(
  value: unknown,
): UpdateUserAddressInput {
  const body = readBody(value);
  validateFields(body, [
    'recipient_name',
    'phone_number',
    'postal_code',
    'address_line1',
    'address_line2',
    'is_default',
  ]);

  if (Object.keys(body).length === 0) {
    throw new BadRequestException('수정할 값이 하나 이상 필요합니다.');
  }

  const input: UpdateUserAddressInput = {};

  if ('recipient_name' in body) {
    input.recipient_name = readText(body, 'recipient_name', MAX_NAME_LENGTH);
  }

  if ('phone_number' in body) {
    input.phone_number = readPhoneNumber(body, 'phone_number');
  }

  if ('postal_code' in body) {
    input.postal_code = readText(body, 'postal_code', MAX_POSTAL_CODE_LENGTH);
  }

  if ('address_line1' in body) {
    input.address_line1 = readText(body, 'address_line1', MAX_ADDRESS_LENGTH);
  }

  if ('address_line2' in body) {
    input.address_line2 = readNullableText(
      body,
      'address_line2',
      MAX_ADDRESS_LENGTH,
    );
  }

  if ('is_default' in body) {
    input.is_default = readBoolean(body, 'is_default');
  }

  return input;
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

function readPhoneNumber(body: Record<string, unknown>, field: string): string {
  const value = body[field];

  if (typeof value !== 'string') {
    throw new BadRequestException(`${field}은(는) 필수 문자열입니다.`);
  }

  const normalized = value.replace(/[\s().-]/g, '');

  if (!PHONE_PATTERN.test(normalized)) {
    throw new BadRequestException(
      `${field}는 유효한 전화번호 형식이어야 합니다.`,
    );
  }

  return normalized;
}

function readText(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
): string {
  const value = body[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field}은(는) 필수 문자열입니다.`);
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new BadRequestException(
      `${field}은(는) ${maxLength}자 이하여야 합니다.`,
    );
  }

  return normalized;
}

function readNullableText(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
): string | null {
  const value = body[field];

  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`${field}은(는) 문자열이어야 합니다.`);
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new BadRequestException(
      `${field}은(는) ${maxLength}자 이하여야 합니다.`,
    );
  }

  return normalized || null;
}

function readOptionalBoolean(
  body: Record<string, unknown>,
  field: string,
): boolean | undefined {
  if (!(field in body)) {
    return undefined;
  }

  return readBoolean(body, field);
}

function readBoolean(body: Record<string, unknown>, field: string): boolean {
  const value = body[field];

  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${field}은(는) boolean이어야 합니다.`);
  }

  return value;
}
