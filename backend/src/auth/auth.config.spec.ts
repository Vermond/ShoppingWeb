import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/environment.validation';
import { getAuthConfig } from './auth.config';

describe('getAuthConfig', () => {
  it('reads normalized authentication settings from ConfigService', () => {
    const values: Record<string, string | number | boolean> = {
      AUTH_ACCESS_TOKEN_SECRET: 'access-secret',
      AUTH_REFRESH_TOKEN_SECRET: 'refresh-secret',
      AUTH_ACCESS_TOKEN_TTL: 900,
      AUTH_REFRESH_TOKEN_TTL: 2_592_000,
      AUTH_ACCESS_COOKIE_NAME: 'access_token',
      AUTH_REFRESH_COOKIE_NAME: 'refresh_token',
      AUTH_COOKIE_SECURE: true,
      AUTH_COOKIE_SAME_SITE: 'none',
    };
    const configService = {
      getOrThrow: jest.fn((name: string) => values[name]),
    } as unknown as ConfigService<EnvironmentVariables>;

    expect(getAuthConfig(configService)).toEqual({
      accessTokenSecret: 'access-secret',
      refreshTokenSecret: 'refresh-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 2_592_000,
      accessCookieName: 'access_token',
      refreshCookieName: 'refresh_token',
      cookieSecure: true,
      cookieSameSite: 'none',
    });
  });
});
