import { BadRequestException } from '@nestjs/common';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
};

export type UpdateUserInput = {
  email?: string;
  password?: string;
  name?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function readNonEmptyString(
  body: Record<string, unknown>,
  field: string,
): string {
  const value = body[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field}은(는) 필수 문자열입니다.`);
  }

  return value.trim();
}

function readEmail(body: Record<string, unknown>): string {
  const email = readNonEmptyString(body, 'email').toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw new BadRequestException('유효한 이메일 형식이 아닙니다.');
  }

  return email;
}

function readPassword(body: Record<string, unknown>): string {
  const password = body.password;

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestException(
      `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
    );
  }

  return password;
}

export function parseCreateUserInput(value: unknown): CreateUserInput {
  const body = readBody(value);
  validateFields(body, ['email', 'password', 'name']);

  return {
    email: readEmail(body),
    password: readPassword(body),
    name: readNonEmptyString(body, 'name'),
  };
}

export function parseUpdateUserInput(value: unknown): UpdateUserInput {
  const body = readBody(value);
  validateFields(body, ['email', 'password', 'name']);

  if (Object.keys(body).length === 0) {
    throw new BadRequestException('수정할 사용자 정보가 없습니다.');
  }

  const input: UpdateUserInput = {};

  if ('email' in body) {
    input.email = readEmail(body);
  }

  if ('password' in body) {
    input.password = readPassword(body);
  }

  if ('name' in body) {
    input.name = readNonEmptyString(body, 'name');
  }

  return input;
}
