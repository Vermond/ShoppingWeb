import type { Request, Response } from 'express';
import { clearAuthCookies, readCookie, setAuthCookies } from './cookie.util';
import type { AuthConfig } from './auth.config';

const authConfig: AuthConfig = {
  accessTokenSecret: 'access-secret',
  refreshTokenSecret: 'refresh-secret',
  accessTokenTtlSeconds: 15,
  refreshTokenTtlSeconds: 60,
  accessCookieName: 'access_token',
  refreshCookieName: 'refresh_token',
  cookieSecure: true,
  cookieSameSite: 'strict',
};

describe('cookie utilities', () => {
  it('reads a named and URL-encoded cookie', () => {
    const request = requestWithCookies(
      'other=value; access_token=token%20value; refresh_token=refresh',
    );

    expect(readCookie(request, 'access_token')).toBe('token value');
    expect(readCookie(request, 'refresh_token')).toBe('refresh');
  });

  it('returns undefined for missing or malformed cookies', () => {
    expect(readCookie(requestWithCookies(undefined), 'access_token')).toBe(
      undefined,
    );
    expect(readCookie(requestWithCookies('other=value'), 'access_token')).toBe(
      undefined,
    );
    expect(
      readCookie(requestWithCookies('access_token=%E0%A4%A'), 'access_token'),
    ).toBe('%E0%A4%A');
  });

  it('sets both authentication cookies with secure options', () => {
    const response = mockResponse();

    setAuthCookies(response, authConfig, 'access-value', 'refresh-value');

    expect(response.cookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      'access-value',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 15_000,
      }),
    );
    expect(response.cookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      'refresh-value',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 60_000,
      }),
    );
  });

  it('clears both authentication cookies with matching options', () => {
    const response = mockResponse();

    clearAuthCookies(response, authConfig);

    expect(response.clearCookie).toHaveBeenNthCalledWith(
      1,
      'access_token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      }),
    );
    expect(response.clearCookie).toHaveBeenNthCalledWith(
      2,
      'refresh_token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      }),
    );
  });
});

function requestWithCookies(cookie: string | undefined): Request {
  return {
    headers: cookie === undefined ? {} : { cookie },
  } as Request;
}

function mockResponse(): Response & {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
} {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response & {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };
}
