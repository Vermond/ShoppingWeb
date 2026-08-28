import type { CookieOptions } from 'express';

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  DATABASE_URL: string;
  PORT: number;
  FRONTEND_URL: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  RESEND_FROM_NAME?: string;
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: number;
  AUTH_ACCESS_TOKEN_SECRET: string;
  AUTH_REFRESH_TOKEN_SECRET: string;
  AUTH_ACCESS_TOKEN_TTL: number;
  AUTH_REFRESH_TOKEN_TTL: number;
  AUTH_ACCESS_COOKIE_NAME: string;
  AUTH_REFRESH_COOKIE_NAME: string;
  AUTH_COOKIE_SECURE: boolean;
  AUTH_COOKIE_SAME_SITE: Exclude<
    CookieOptions['sameSite'],
    boolean | undefined
  >;
  AUTH_RATE_LIMIT_LOGIN_LIMIT: number;
  AUTH_RATE_LIMIT_LOGIN_TTL_SECONDS: number;
  AUTH_RATE_LIMIT_RESEND_LIMIT: number;
  AUTH_RATE_LIMIT_RESEND_TTL_SECONDS: number;
  AUTH_RATE_LIMIT_SIGNUP_LIMIT: number;
  AUTH_RATE_LIMIT_SIGNUP_TTL_SECONDS: number;
  AUTH_RATE_LIMIT_VERIFY_LIMIT: number;
  AUTH_RATE_LIMIT_VERIFY_TTL_SECONDS: number;
  AUTH_RATE_LIMIT_REFRESH_LIMIT: number;
  AUTH_RATE_LIMIT_REFRESH_TTL_SECONDS: number;
}

const DEFAULT_PORT = 3000;
const DEFAULT_RATE_LIMITS = {
  login: { limit: 5, ttlSeconds: 60 },
  resend: { limit: 3, ttlSeconds: 900 },
  signup: { limit: 10, ttlSeconds: 3_600 },
  verify: { limit: 10, ttlSeconds: 60 },
  refresh: { limit: 30, ttlSeconds: 60 },
};

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const errors: string[] = [];
  const nodeEnvironment = readNodeEnvironment(config, errors);

  const databaseUrl = readDatabaseUrl(config, errors);
  const port = readPort(config, errors);
  const frontendUrl = readHttpUrl('FRONTEND_URL', config, errors);
  const resendApiKey = readRequiredString('RESEND_API_KEY', config, errors);
  const resendFromEmail = readEmail('RESEND_FROM_EMAIL', config, errors);
  const resendFromName = readOptionalString('RESEND_FROM_NAME', config);
  const emailVerificationTtl = readPositiveInteger(
    'EMAIL_VERIFICATION_TOKEN_TTL_MINUTES',
    config,
    errors,
  );
  const accessTokenSecret = readSecret(
    'AUTH_ACCESS_TOKEN_SECRET',
    config,
    errors,
  );
  const refreshTokenSecret = readSecret(
    'AUTH_REFRESH_TOKEN_SECRET',
    config,
    errors,
  );
  const accessTokenTtl = readDuration('AUTH_ACCESS_TOKEN_TTL', config, errors);
  const refreshTokenTtl = readDuration(
    'AUTH_REFRESH_TOKEN_TTL',
    config,
    errors,
  );
  const accessCookieName = readCookieName(
    'AUTH_ACCESS_COOKIE_NAME',
    config,
    errors,
  );
  const refreshCookieName = readCookieName(
    'AUTH_REFRESH_COOKIE_NAME',
    config,
    errors,
  );
  const cookieSecure = readBoolean('AUTH_COOKIE_SECURE', config, errors);
  const cookieSameSite = readSameSite(config, errors);

  if (accessTokenSecret && refreshTokenSecret) {
    if (accessTokenSecret === refreshTokenSecret) {
      errors.push(
        'AUTH_ACCESS_TOKEN_SECRET과 AUTH_REFRESH_TOKEN_SECRET은 서로 달라야 합니다.',
      );
    }
  }

  if (accessTokenTtl && refreshTokenTtl && accessTokenTtl >= refreshTokenTtl) {
    errors.push(
      'AUTH_ACCESS_TOKEN_TTL은 AUTH_REFRESH_TOKEN_TTL보다 짧아야 합니다.',
    );
  }

  if (cookieSameSite === 'none' && !cookieSecure) {
    errors.push(
      'AUTH_COOKIE_SAME_SITE=none일 때 AUTH_COOKIE_SECURE=true여야 합니다.',
    );
  }

  if (nodeEnvironment === 'production') {
    if (!cookieSecure) {
      errors.push('production 환경에서는 AUTH_COOKIE_SECURE=true여야 합니다.');
    }

    if (frontendUrl && !isHttpsUrl(frontendUrl)) {
      errors.push('production 환경의 FRONTEND_URL은 https URL이어야 합니다.');
    }
  }

  const rateLimitValues = readRateLimitValues(config, nodeEnvironment, errors);

  if (errors.length > 0) {
    throw new Error(
      [
        '환경변수 검증에 실패했습니다.',
        ...errors.map((error) => `- ${error}`),
      ].join('\n'),
    );
  }

  return {
    NODE_ENV: nodeEnvironment,
    DATABASE_URL: databaseUrl,
    PORT: port,
    FRONTEND_URL: frontendUrl,
    RESEND_API_KEY: resendApiKey,
    RESEND_FROM_EMAIL: resendFromEmail,
    RESEND_FROM_NAME: resendFromName,
    EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: emailVerificationTtl,
    AUTH_ACCESS_TOKEN_SECRET: accessTokenSecret,
    AUTH_REFRESH_TOKEN_SECRET: refreshTokenSecret,
    AUTH_ACCESS_TOKEN_TTL: accessTokenTtl,
    AUTH_REFRESH_TOKEN_TTL: refreshTokenTtl,
    AUTH_ACCESS_COOKIE_NAME: accessCookieName,
    AUTH_REFRESH_COOKIE_NAME: refreshCookieName,
    AUTH_COOKIE_SECURE: cookieSecure,
    AUTH_COOKIE_SAME_SITE: cookieSameSite,
    AUTH_RATE_LIMIT_LOGIN_LIMIT: rateLimitValues.login.limit,
    AUTH_RATE_LIMIT_LOGIN_TTL_SECONDS: rateLimitValues.login.ttlSeconds,
    AUTH_RATE_LIMIT_RESEND_LIMIT: rateLimitValues.resend.limit,
    AUTH_RATE_LIMIT_RESEND_TTL_SECONDS: rateLimitValues.resend.ttlSeconds,
    AUTH_RATE_LIMIT_SIGNUP_LIMIT: rateLimitValues.signup.limit,
    AUTH_RATE_LIMIT_SIGNUP_TTL_SECONDS: rateLimitValues.signup.ttlSeconds,
    AUTH_RATE_LIMIT_VERIFY_LIMIT: rateLimitValues.verify.limit,
    AUTH_RATE_LIMIT_VERIFY_TTL_SECONDS: rateLimitValues.verify.ttlSeconds,
    AUTH_RATE_LIMIT_REFRESH_LIMIT: rateLimitValues.refresh.limit,
    AUTH_RATE_LIMIT_REFRESH_TTL_SECONDS: rateLimitValues.refresh.ttlSeconds,
  };
}

function readNodeEnvironment(
  config: Record<string, unknown>,
  errors: string[],
): NodeEnvironment {
  const value = readOptionalString('NODE_ENV', config) ?? 'development';

  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }

  errors.push('NODE_ENV는 development, test, production 중 하나여야 합니다.');
  return 'development';
}

function readDatabaseUrl(
  config: Record<string, unknown>,
  errors: string[],
): string {
  const value = readRequiredString('DATABASE_URL', config, errors);

  if (value) {
    try {
      const url = new URL(value);

      if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
        errors.push('DATABASE_URL은 PostgreSQL URL이어야 합니다.');
      }

      if (!url.hostname) {
        errors.push('DATABASE_URL에 PostgreSQL 호스트가 필요합니다.');
      }
    } catch {
      errors.push('DATABASE_URL 형식이 올바르지 않습니다.');
    }
  }

  return value;
}

function readPort(config: Record<string, unknown>, errors: string[]): number {
  const rawValue = readOptionalString('PORT', config);

  if (!rawValue) {
    return DEFAULT_PORT;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    errors.push('PORT는 1부터 65535 사이의 정수여야 합니다.');
    return DEFAULT_PORT;
  }

  return value;
}

function readHttpUrl(
  name: string,
  config: Record<string, unknown>,
  errors: string[],
): string {
  const value = readRequiredString(name, config, errors);

  if (value) {
    try {
      const url = new URL(value);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push(`${name}은 http 또는 https URL이어야 합니다.`);
      }
    } catch {
      errors.push(`${name} 형식이 올바르지 않습니다.`);
    }
  }

  return value;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function readEmail(
  name: string,
  config: Record<string, unknown>,
  errors: string[],
): string {
  const value = readRequiredString(name, config, errors);

  if (value && !/^\S+@\S+\.\S+$/.test(value)) {
    errors.push(`${name}은 유효한 이메일 주소여야 합니다.`);
  }

  return value;
}

function readSecret(
  name: string,
  config: Record<string, unknown>,
  errors: string[],
): string {
  const value = readRequiredString(name, config, errors);

  if (value && value.length < 32) {
    errors.push(`${name}은 32자 이상이어야 합니다.`);
  }

  return value;
}

function readDuration(
  name: string,
  config: Record<string, unknown>,
  errors: string[],
): number {
  const value = readRequiredString(name, config, errors);
  const match = /^(\d+)([smhd])?$/i.exec(value);

  if (!match) {
    errors.push(
      `${name}은 초 단위 숫자 또는 s, m, h, d 단위 형식이어야 합니다.`,
    );
    return 0;
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const multiplier =
    unit === 'd' ? 86_400 : unit === 'h' ? 3_600 : unit === 'm' ? 60 : 1;
  const seconds = amount * multiplier;

  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    errors.push(`${name}은 양의 유효한 기간이어야 합니다.`);
    return 0;
  }

  return seconds;
}

function readCookieName(
  name: string,
  config: Record<string, unknown>,
  errors: string[],
): string {
  const value = readRequiredString(name, config, errors);

  if (value && !/^[A-Za-z0-9_-]+$/.test(value)) {
    errors.push(`${name}은 영문, 숫자, 밑줄, 하이픈만 사용할 수 있습니다.`);
  }

  return value;
}

function readBoolean(
  name: string,
  config: Record<string, unknown>,
  errors: string[],
): boolean {
  const value = readRequiredString(name, config, errors).toLowerCase();

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  errors.push(`${name}은 true 또는 false여야 합니다.`);
  return false;
}

function readSameSite(
  config: Record<string, unknown>,
  errors: string[],
): Exclude<CookieOptions['sameSite'], boolean | undefined> {
  const value = readRequiredString('AUTH_COOKIE_SAME_SITE', config, errors);

  if (value === 'lax' || value === 'strict' || value === 'none') {
    return value;
  }

  errors.push('AUTH_COOKIE_SAME_SITE은 lax, strict, none 중 하나여야 합니다.');
  return 'lax';
}

function readRateLimitValues(
  config: Record<string, unknown>,
  nodeEnvironment: NodeEnvironment,
  errors: string[],
): {
  login: { limit: number; ttlSeconds: number };
  resend: { limit: number; ttlSeconds: number };
  signup: { limit: number; ttlSeconds: number };
  verify: { limit: number; ttlSeconds: number };
  refresh: { limit: number; ttlSeconds: number };
} {
  const allowDefaults = nodeEnvironment !== 'production';

  return {
    login: readRateLimitRule('LOGIN', config, errors, allowDefaults),
    resend: readRateLimitRule('RESEND', config, errors, allowDefaults),
    signup: readRateLimitRule('SIGNUP', config, errors, allowDefaults),
    verify: readRateLimitRule('VERIFY', config, errors, allowDefaults),
    refresh: readRateLimitRule('REFRESH', config, errors, allowDefaults),
  };
}

function readRateLimitRule(
  suffix: 'LOGIN' | 'RESEND' | 'SIGNUP' | 'VERIFY' | 'REFRESH',
  config: Record<string, unknown>,
  errors: string[],
  allowDefaults: boolean,
): { limit: number; ttlSeconds: number } {
  const defaultKey = suffix.toLowerCase() as keyof typeof DEFAULT_RATE_LIMITS;
  const defaults = DEFAULT_RATE_LIMITS[defaultKey];
  const limit = readPositiveInteger(
    `AUTH_RATE_LIMIT_${suffix}_LIMIT`,
    config,
    errors,
    allowDefaults ? defaults.limit : undefined,
  );
  const ttlSeconds = readPositiveInteger(
    `AUTH_RATE_LIMIT_${suffix}_TTL_SECONDS`,
    config,
    errors,
    allowDefaults ? defaults.ttlSeconds : undefined,
  );

  return { limit, ttlSeconds };
}

function readPositiveInteger(
  name: string,
  config: Record<string, unknown>,
  errors: string[],
  fallback?: number,
): number {
  const rawValue = readOptionalString(name, config);

  if (!rawValue) {
    if (fallback !== undefined) {
      return fallback;
    }

    errors.push(`${name}은 필수입니다.`);
    return 0;
  }

  const value = Number(rawValue);

  if (!Number.isSafeInteger(value) || value <= 0) {
    errors.push(`${name}은 양의 정수여야 합니다.`);
    return 0;
  }

  return value;
}

function readRequiredString(
  name: string,
  config: Record<string, unknown>,
  errors: string[],
): string {
  const value = readOptionalString(name, config);

  if (!value) {
    errors.push(`${name}은 필수입니다.`);
    return '';
  }

  return value;
}

function readOptionalString(
  name: string,
  config: Record<string, unknown>,
): string | undefined {
  const value = config[name];

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
}
