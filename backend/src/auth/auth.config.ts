import type { CookieOptions } from 'express';

export type AuthConfig = {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  accessCookieName: string;
  refreshCookieName: string;
  cookieSecure: boolean;
  cookieSameSite: CookieOptions['sameSite'];
};

export function getAuthConfig(): AuthConfig {
  const cookieSameSite = readSameSite();

  return {
    accessTokenSecret: readSecret('AUTH_ACCESS_TOKEN_SECRET'),
    refreshTokenSecret: readSecret('AUTH_REFRESH_TOKEN_SECRET'),
    accessTokenTtlSeconds: readDuration('AUTH_ACCESS_TOKEN_TTL'),
    refreshTokenTtlSeconds: readDuration('AUTH_REFRESH_TOKEN_TTL'),
    accessCookieName: readRequired('AUTH_ACCESS_COOKIE_NAME'),
    refreshCookieName: readRequired('AUTH_REFRESH_COOKIE_NAME'),
    cookieSecure: readBoolean('AUTH_COOKIE_SECURE'),
    cookieSameSite,
  };
}

function readSecret(name: string): string {
  const value = readRequired(name);

  if (value.length < 32) {
    throw new Error(`${name}은(는) 32자 이상이어야 합니다.`);
  }

  return value;
}

function readRequired(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
  }

  return value;
}

function readDuration(name: string): number {
  const value = readRequired(name);
  const match = /^(\d+)([smhd])?$/i.exec(value);

  if (!match) {
    throw new Error(
      `${name}은(는) 초 단위 숫자 또는 s, m, h, d 단위 형식이어야 합니다.`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const multiplier =
    unit === 'd' ? 86_400 : unit === 'h' ? 3_600 : unit === 'm' ? 60 : 1;
  const seconds = amount * multiplier;

  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error(`${name}은(는) 양의 유효한 기간이어야 합니다.`);
  }

  return seconds;
}

function readBoolean(name: string): boolean {
  const value = readRequired(name).toLowerCase();

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error(`${name}은(는) true 또는 false여야 합니다.`);
}

function readSameSite(): CookieOptions['sameSite'] {
  const value = readRequired('AUTH_COOKIE_SAME_SITE').toLowerCase();

  if (value === 'lax' || value === 'strict' || value === 'none') {
    return value;
  }

  throw new Error(
    'AUTH_COOKIE_SAME_SITE은 lax, strict, none 중 하나여야 합니다.',
  );
}
