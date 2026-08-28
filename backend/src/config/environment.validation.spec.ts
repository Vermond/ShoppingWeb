import { validateEnvironment } from './environment.validation';

const validEnvironment = {
  NODE_ENV: 'test',
  SWAGGER_ENABLED: 'true',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  PORT: '3001',
  FRONTEND_URL: 'http://localhost:3000',
  RESEND_API_KEY: 're_test_key',
  RESEND_FROM_EMAIL: 'onboarding@resend.dev',
  RESEND_FROM_NAME: 'ShoppingWeb Test',
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: '1440',
  AUTH_ACCESS_TOKEN_SECRET: 'test_access_secret_123456789012345678901234',
  AUTH_REFRESH_TOKEN_SECRET: 'test_refresh_secret_123456789012345678901234',
  AUTH_ACCESS_TOKEN_TTL: '15m',
  AUTH_REFRESH_TOKEN_TTL: '30d',
  AUTH_ACCESS_COOKIE_NAME: 'access_token',
  AUTH_REFRESH_COOKIE_NAME: 'refresh_token',
  AUTH_COOKIE_SECURE: 'false',
  AUTH_COOKIE_SAME_SITE: 'lax',
  AUTH_RATE_LIMIT_LOGIN_LIMIT: '5',
  AUTH_RATE_LIMIT_LOGIN_TTL_SECONDS: '60',
  AUTH_RATE_LIMIT_RESEND_LIMIT: '3',
  AUTH_RATE_LIMIT_RESEND_TTL_SECONDS: '900',
  AUTH_RATE_LIMIT_SIGNUP_LIMIT: '10',
  AUTH_RATE_LIMIT_SIGNUP_TTL_SECONDS: '3600',
  AUTH_RATE_LIMIT_VERIFY_LIMIT: '10',
  AUTH_RATE_LIMIT_VERIFY_TTL_SECONDS: '60',
  AUTH_RATE_LIMIT_REFRESH_LIMIT: '30',
  AUTH_RATE_LIMIT_REFRESH_TTL_SECONDS: '60',
};

describe('validateEnvironment', () => {
  it('normalizes validated environment values', () => {
    const environment = validateEnvironment(validEnvironment);

    expect(environment.PORT).toBe(3001);
    expect(environment.SWAGGER_ENABLED).toBe(true);
    expect(environment.AUTH_ACCESS_TOKEN_TTL).toBe(900);
    expect(environment.AUTH_REFRESH_TOKEN_TTL).toBe(2_592_000);
    expect(environment.AUTH_COOKIE_SECURE).toBe(false);
    expect(environment.AUTH_RATE_LIMIT_RESEND_TTL_SECONDS).toBe(900);

    expect(
      validateEnvironment({ ...validEnvironment, SWAGGER_ENABLED: 'false' })
        .SWAGGER_ENABLED,
    ).toBe(false);
  });

  it('reports invalid settings without including secret values', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        AUTH_ACCESS_TOKEN_SECRET: 'short-secret',
        AUTH_REFRESH_TOKEN_SECRET: 'short-refresh-secret',
        PORT: '70000',
        AUTH_COOKIE_SECURE: 'invalid',
      }),
    ).toThrow(/AUTH_ACCESS_TOKEN_SECRET은 32자 이상이어야 합니다/);

    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        AUTH_ACCESS_TOKEN_SECRET: 'secret_value_that_is_long_enough_123456',
        AUTH_REFRESH_TOKEN_SECRET: 'secret_value_that_is_long_enough_123456',
      }),
    ).toThrow(/서로 달라야 합니다/);
  });

  it('disables Swagger by default in production', () => {
    const environment = validateEnvironment({
      ...validEnvironment,
      NODE_ENV: 'production',
      SWAGGER_ENABLED: undefined,
      FRONTEND_URL: 'https://shop.example.com',
      AUTH_COOKIE_SECURE: 'true',
      AUTH_COOKIE_SAME_SITE: 'none',
    });

    expect(environment.SWAGGER_ENABLED).toBe(false);
  });

  it('rejects Swagger being enabled in production', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        FRONTEND_URL: 'https://shop.example.com',
        AUTH_COOKIE_SECURE: 'true',
        AUTH_COOKIE_SAME_SITE: 'none',
      }),
    ).toThrow(
      /production 환경에서는 SWAGGER_ENABLED=true를 사용할 수 없습니다/,
    );
  });

  it('rejects invalid Swagger and environment values', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, SWAGGER_ENABLED: 'yes' }),
    ).toThrow(/SWAGGER_ENABLED은 true 또는 false여야 합니다/);

    expect(() =>
      validateEnvironment({ ...validEnvironment, NODE_ENV: 'staging' }),
    ).toThrow(/NODE_ENV는 development, test, production 중 하나여야 합니다/);

    expect(() =>
      validateEnvironment({ ...validEnvironment, DATABASE_URL: 'mysql://db' }),
    ).toThrow(/DATABASE_URL은 PostgreSQL URL이어야 합니다/);

    expect(() =>
      validateEnvironment({ ...validEnvironment, FRONTEND_URL: 'not-a-url' }),
    ).toThrow(/FRONTEND_URL 형식이 올바르지 않습니다/);

    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        AUTH_COOKIE_SAME_SITE: 'none',
        AUTH_COOKIE_SECURE: 'false',
      }),
    ).toThrow(
      /AUTH_COOKIE_SAME_SITE=none일 때 AUTH_COOKIE_SECURE=true여야 합니다/,
    );
  });

  it('requires production rate limit settings', () => {
    const productionEnvironment = { ...validEnvironment };
    delete productionEnvironment.AUTH_RATE_LIMIT_LOGIN_LIMIT;

    expect(() =>
      validateEnvironment({
        ...productionEnvironment,
        NODE_ENV: 'production',
        FRONTEND_URL: 'https://shop.example.com',
        AUTH_COOKIE_SECURE: 'true',
        AUTH_COOKIE_SAME_SITE: 'none',
      }),
    ).toThrow(/AUTH_RATE_LIMIT_LOGIN_LIMIT은 필수입니다/);
  });

  it.each([
    'DATABASE_URL',
    'FRONTEND_URL',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'EMAIL_VERIFICATION_TOKEN_TTL_MINUTES',
    'AUTH_ACCESS_TOKEN_SECRET',
    'AUTH_REFRESH_TOKEN_SECRET',
    'AUTH_ACCESS_TOKEN_TTL',
    'AUTH_REFRESH_TOKEN_TTL',
    'AUTH_ACCESS_COOKIE_NAME',
    'AUTH_REFRESH_COOKIE_NAME',
    'AUTH_COOKIE_SECURE',
    'AUTH_COOKIE_SAME_SITE',
  ])('requires %s', (name) => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, [name]: undefined }),
    ).toThrow(new RegExp(`${name}은 필수입니다`));
  });
});
