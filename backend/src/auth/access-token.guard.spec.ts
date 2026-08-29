import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import type { EnvironmentVariables } from '../config/environment.validation';
import type { UsersRepository } from '../users/users.repository';
import type { UserRecord } from '../users/users.types';
import type { AuthenticatedRequest } from './auth.decorators';
import { AccessTokenGuard } from './access-token.guard';

const user: UserRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  name: 'User',
  role: 'customer',
  status: 'active',
  email_verified: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AccessTokenGuard', () => {
  it('authenticates an active and verified user', async () => {
    const mocks = createMocks('access-token');
    mocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      type: 'access',
    });
    mocks.usersRepository.findById.mockResolvedValue(user);

    const request = mocks.request;

    await expect(mocks.guard.canActivate(mocks.context)).resolves.toBe(true);
    expect(request.user).toBe(user);
    expect(mocks.jwtService.verifyAsync).toHaveBeenCalledWith('access-token', {
      secret: 'access-secret',
    });
  });

  it('rejects a missing or invalid access token', async () => {
    const missingMocks = createMocks(undefined);
    await expect(
      missingMocks.guard.canActivate(missingMocks.context),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const invalidMocks = createMocks('invalid');
    invalidMocks.jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
    await expect(
      invalidMocks.guard.canActivate(invalidMocks.context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an invalid payload or unusable account', async () => {
    const payloadMocks = createMocks('token');
    payloadMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      type: 'refresh',
    });
    await expect(
      payloadMocks.guard.canActivate(payloadMocks.context),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const missingUserMocks = createMocks('token');
    missingUserMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      type: 'access',
    });
    missingUserMocks.usersRepository.findById.mockResolvedValue(null);
    await expect(
      missingUserMocks.guard.canActivate(missingUserMocks.context),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const inactiveMocks = createMocks('token');
    inactiveMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      type: 'access',
    });
    inactiveMocks.usersRepository.findById.mockResolvedValue({
      ...user,
      status: 'withdrawn',
    });
    await expect(
      inactiveMocks.guard.canActivate(inactiveMocks.context),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const unverifiedMocks = createMocks('token');
    unverifiedMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      type: 'access',
    });
    unverifiedMocks.usersRepository.findById.mockResolvedValue({
      ...user,
      email_verified: false,
    });
    await expect(
      unverifiedMocks.guard.canActivate(unverifiedMocks.context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createMocks(cookieValue: string | undefined) {
  const request = {
    headers: cookieValue ? { cookie: `access_token=${cookieValue}` } : {},
  } as AuthenticatedRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const jwtService = {
    verifyAsync: jest.fn(),
  } as unknown as JwtService;
  const usersRepository = {
    findById: jest.fn(),
  } as unknown as UsersRepository;
  const configService = {
    getOrThrow: jest.fn((name: string) => {
      const values: Record<string, string | number | boolean> = {
        AUTH_ACCESS_TOKEN_SECRET: 'access-secret',
        AUTH_REFRESH_TOKEN_SECRET: 'refresh-secret',
        AUTH_ACCESS_TOKEN_TTL: 900,
        AUTH_REFRESH_TOKEN_TTL: 2_592_000,
        AUTH_ACCESS_COOKIE_NAME: 'access_token',
        AUTH_REFRESH_COOKIE_NAME: 'refresh_token',
        AUTH_COOKIE_SECURE: false,
        AUTH_COOKIE_SAME_SITE: 'lax',
      };

      return values[name];
    }),
  } as unknown as ConfigService<EnvironmentVariables>;
  const guard = new AccessTokenGuard(
    jwtService,
    usersRepository,
    configService,
  );

  return { guard, context, request, jwtService, usersRepository };
}
