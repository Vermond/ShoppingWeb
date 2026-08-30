import { BadRequestException } from '@nestjs/common';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_TOKEN_LENGTH = 256;

export type PasswordResetRequestInput = {
  email: string;
};

export type PasswordResetConfirmInput = {
  token: string;
  new_password: string;
};

export function parsePasswordResetRequestInput(
  value: unknown,
): PasswordResetRequestInput {
  const body = readBody(value);
  validateFields(body, ['email']);

  const email = readNonEmptyString(body, 'email').toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw new BadRequestException('유효한 이메일 형식이 아닙니다.');
  }

  return { email };
}

export function parsePasswordResetConfirmInput(
  value: unknown,
): PasswordResetConfirmInput {
  const body = readBody(value);
  validateFields(body, ['token', 'new_password']);

  return {
    token: readToken(body),
    new_password: readPassword(body),
  };
}

function readBody(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('요청 본문은 객체여야 합니다.');
  }

  return value as Record<string, unknown>;
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

function readToken(body: Record<string, unknown>): string {
  const token = readNonEmptyString(body, 'token');

  if (token.length > MAX_TOKEN_LENGTH) {
    throw new BadRequestException('비밀번호 재설정 토큰이 너무 깁니다.');
  }

  return token;
}

function readPassword(body: Record<string, unknown>): string {
  const password = body.new_password;

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestException(
      `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
    );
  }

  return password;
}
