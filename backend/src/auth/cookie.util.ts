import type { Request, Response } from 'express';
import type { AuthConfig } from './auth.config';

export function readCookie(
  request: Request,
  cookieName: string,
): string | undefined {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const name = cookie.slice(0, separatorIndex).trim();

    if (name !== cookieName) {
      continue;
    }

    const value = cookie.slice(separatorIndex + 1).trim();

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return undefined;
}

export function setAuthCookies(
  response: Response,
  config: AuthConfig,
  accessToken: string,
  refreshToken: string,
): void {
  const options = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/',
  } as const;

  response.cookie(config.accessCookieName, accessToken, {
    ...options,
    maxAge: config.accessTokenTtlSeconds * 1_000,
  });
  response.cookie(config.refreshCookieName, refreshToken, {
    ...options,
    maxAge: config.refreshTokenTtlSeconds * 1_000,
  });
}

export function clearAuthCookies(response: Response, config: AuthConfig): void {
  const options = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/',
  } as const;

  response.clearCookie(config.accessCookieName, options);
  response.clearCookie(config.refreshCookieName, options);
}
