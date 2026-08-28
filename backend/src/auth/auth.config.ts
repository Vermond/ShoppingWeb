import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/environment.validation';

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

export function getAuthConfig(
  configService: ConfigService<EnvironmentVariables>,
): AuthConfig {
  return {
    accessTokenSecret: configService.getOrThrow<string>(
      'AUTH_ACCESS_TOKEN_SECRET',
    ),
    refreshTokenSecret: configService.getOrThrow<string>(
      'AUTH_REFRESH_TOKEN_SECRET',
    ),
    accessTokenTtlSeconds: configService.getOrThrow<number>(
      'AUTH_ACCESS_TOKEN_TTL',
    ),
    refreshTokenTtlSeconds: configService.getOrThrow<number>(
      'AUTH_REFRESH_TOKEN_TTL',
    ),
    accessCookieName: configService.getOrThrow<string>(
      'AUTH_ACCESS_COOKIE_NAME',
    ),
    refreshCookieName: configService.getOrThrow<string>(
      'AUTH_REFRESH_COOKIE_NAME',
    ),
    cookieSecure: configService.getOrThrow<boolean>('AUTH_COOKIE_SECURE'),
    cookieSameSite: configService.getOrThrow<
      Exclude<CookieOptions['sameSite'], boolean | undefined>
    >('AUTH_COOKIE_SAME_SITE'),
  };
}
