import type { ConfigService } from '@nestjs/config';
import {
  createRateLimitConfig,
  getRateLimitConfig,
  setRateLimitConfig,
} from './rate-limit.config';
import type { EnvironmentVariables } from '../config/environment.validation';

describe('rate limit configuration', () => {
  it('converts configured seconds to milliseconds', () => {
    const values: Record<string, number> = {
      AUTH_RATE_LIMIT_LOGIN_LIMIT: 5,
      AUTH_RATE_LIMIT_LOGIN_TTL_SECONDS: 60,
      AUTH_RATE_LIMIT_RESEND_LIMIT: 3,
      AUTH_RATE_LIMIT_RESEND_TTL_SECONDS: 900,
      AUTH_RATE_LIMIT_SIGNUP_LIMIT: 10,
      AUTH_RATE_LIMIT_SIGNUP_TTL_SECONDS: 3_600,
      AUTH_RATE_LIMIT_VERIFY_LIMIT: 10,
      AUTH_RATE_LIMIT_VERIFY_TTL_SECONDS: 60,
      AUTH_RATE_LIMIT_REFRESH_LIMIT: 30,
      AUTH_RATE_LIMIT_REFRESH_TTL_SECONDS: 60,
    };
    const configService = {
      getOrThrow: jest.fn((name: string) => values[name]),
    } as unknown as ConfigService<EnvironmentVariables>;

    expect(createRateLimitConfig(configService)).toEqual({
      login: { limit: 5, ttlMilliseconds: 60_000 },
      resend: { limit: 3, ttlMilliseconds: 900_000 },
      signup: { limit: 10, ttlMilliseconds: 3_600_000 },
      verify: { limit: 10, ttlMilliseconds: 60_000 },
      refresh: { limit: 30, ttlMilliseconds: 60_000 },
    });
  });

  it('returns the registered configuration after initialization', () => {
    const config = {
      login: { limit: 1, ttlMilliseconds: 1_000 },
      resend: { limit: 1, ttlMilliseconds: 1_000 },
      signup: { limit: 1, ttlMilliseconds: 1_000 },
      verify: { limit: 1, ttlMilliseconds: 1_000 },
      refresh: { limit: 1, ttlMilliseconds: 1_000 },
    };

    setRateLimitConfig(config);

    expect(getRateLimitConfig()).toBe(config);
  });
});
