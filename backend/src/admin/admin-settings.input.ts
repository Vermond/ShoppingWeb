import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';

const MONEY_MAX = new Decimal('9999999999.99');

export type AdminSettingsUpdateInput = {
  base_fee?: string;
  free_threshold?: string;
};

export function parseAdminSettingsUpdateInput(
  value: unknown,
): AdminSettingsUpdateInput {
  if (!isRecord(value)) {
    throw new BadRequestException('요청 본문은 객체여야 합니다.');
  }

  const supportedFields = new Set(['base_fee', 'free_threshold']);
  const unsupportedField = Object.keys(value).find(
    (field) => !supportedFields.has(field),
  );

  if (unsupportedField) {
    throw new BadRequestException(
      `지원하지 않는 필드입니다: ${unsupportedField}`,
    );
  }

  if (Object.keys(value).length === 0) {
    throw new BadRequestException('수정할 배송 설정이 없습니다.');
  }

  const input: AdminSettingsUpdateInput = {};

  if ('base_fee' in value) {
    input.base_fee = readMoney(value.base_fee, 'base_fee');
  }

  if ('free_threshold' in value) {
    input.free_threshold = readMoney(value.free_threshold, 'free_threshold');
  }

  return input;
}

function readMoney(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(
      `${field}는 소수점 둘째 자리까지의 금액 문자열이어야 합니다.`,
    );
  }

  let amount: Decimal;

  try {
    amount = new Decimal(value.trim());
  } catch {
    throw new BadRequestException(`${field} 형식이 올바르지 않습니다.`);
  }

  if (
    !amount.isFinite() ||
    amount.isNegative() ||
    amount.decimalPlaces() > 2 ||
    amount.gt(MONEY_MAX)
  ) {
    throw new BadRequestException(
      `${field}는 0 이상이며 소수점 둘째 자리까지 입력해야 합니다.`,
    );
  }

  return amount.toFixed(2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
