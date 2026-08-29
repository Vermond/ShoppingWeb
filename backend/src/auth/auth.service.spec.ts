import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import type { EnvironmentVariables } from '../config/environment.validation';
import type { UsersService } from '../users/users.service';
import type { UsersRepository } from '../users/users.repository';
import type { UserRecord } from '../users/users.types';
import type {
  RefreshTokenRecord,
  RefreshTokenRepository,
} from './refresh-token.repository';
import { AuthService } from './auth.service';

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

const tokenRecord: RefreshTokenRecord = {
  id: '22222222-2222-4222-8222-222222222222',
  user_id: user.id,
  session_id: '44444444-4444-4444-8444-444444444444',
  token_hash: 'stored-hash',
  expires_at: new Date('2099-01-01T00:00:00.000Z'),
  revoked_at: null,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  last_used_at: null,
};

describe('AuthService', () => {
  it('issues access and refresh tokens and stores a hashed refresh token', async () => {
    const mocks = createMocks();
    mocks.usersService.login.mockResolvedValue(user);
    mocks.jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    await expect(
      mocks.service.login({ email: user.email, password: 'password123' }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user,
    });

    expect(mocks.jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      { sub: user.id, type: 'access' },
      { secret: 'access-secret', expiresIn: 900 },
    );
    expect(mocks.jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sub: user.id, type: 'refresh' }),
      { secret: 'refresh-secret', expiresIn: 2_592_000 },
    );
    expect(mocks.refreshTokenRepository.create).toHaveBeenCalledWith(
      expect.any(String),
      user.id,
      expect.any(String),
      createHash('sha256').update('refresh-token', 'utf8').digest('hex'),
      expect.any(Date),
      mocks.databaseService,
    );
  });

  it('rotates a valid refresh token and revokes the old token', async () => {
    const mocks = createMocks();
    const refreshToken = 'old-refresh-token';
    mocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      jti: tokenRecord.id,
      type: 'refresh',
    });
    mocks.refreshTokenRepository.findByIdAndHashForUpdate.mockResolvedValue({
      ...tokenRecord,
      token_hash: createHash('sha256')
        .update(refreshToken, 'utf8')
        .digest('hex'),
    });
    mocks.usersRepository.findById.mockResolvedValue(user);
    mocks.jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    await expect(mocks.service.refresh(refreshToken)).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user,
    });
    expect(mocks.refreshTokenRepository.revoke).toHaveBeenCalledWith(
      tokenRecord.id,
      mocks.executor,
    );
    expect(mocks.refreshTokenRepository.create).toHaveBeenCalledWith(
      expect.any(String),
      user.id,
      tokenRecord.session_id,
      createHash('sha256').update('new-refresh-token', 'utf8').digest('hex'),
      expect.any(Date),
      mocks.executor,
    );
    expect(mocks.getTransactionState()).toEqual({
      committed: true,
      rolledBack: false,
    });
  });

  it('rejects invalid, missing, mismatched, and revoked refresh tokens', async () => {
    const invalidJwtMocks = createMocks();
    invalidJwtMocks.jwtService.verifyAsync.mockRejectedValue(
      new Error('bad jwt'),
    );
    await expect(
      invalidJwtMocks.service.refresh('invalid'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const wrongTypeMocks = createMocks();
    wrongTypeMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      jti: tokenRecord.id,
      type: 'access',
    });
    await expect(
      wrongTypeMocks.service.refresh('wrong-type'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const missingMocks = createMocks();
    missingMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      jti: tokenRecord.id,
      type: 'refresh',
    });
    missingMocks.refreshTokenRepository.findByIdAndHashForUpdate.mockResolvedValue(
      null,
    );
    await expect(
      missingMocks.service.refresh('missing'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const mismatchMocks = createMocks();
    mismatchMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: '33333333-3333-4333-8333-333333333333',
      jti: tokenRecord.id,
      type: 'refresh',
    });
    mismatchMocks.refreshTokenRepository.findByIdAndHashForUpdate.mockResolvedValue(
      tokenRecord,
    );
    await expect(
      mismatchMocks.service.refresh('mismatch'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const revokedMocks = createMocks();
    revokedMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      jti: tokenRecord.id,
      type: 'refresh',
    });
    revokedMocks.refreshTokenRepository.findByIdAndHashForUpdate.mockResolvedValue(
      { ...tokenRecord, revoked_at: new Date() },
    );
    await expect(
      revokedMocks.service.refresh('revoked'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(
      revokedMocks.refreshTokenRepository.revokeAllForSession,
    ).toHaveBeenCalledWith(tokenRecord.session_id, revokedMocks.executor);

    const missingJtiMocks = createMocks();
    missingJtiMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      type: 'refresh',
    });
    await expect(
      missingJtiMocks.service.refresh('missing-jti'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes an expired refresh token', async () => {
    const mocks = createMocks();
    mocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      jti: tokenRecord.id,
      type: 'refresh',
    });
    mocks.refreshTokenRepository.findByIdAndHashForUpdate.mockResolvedValue({
      ...tokenRecord,
      expires_at: new Date('2020-01-01T00:00:00.000Z'),
    });

    await expect(mocks.service.refresh('expired')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(mocks.refreshTokenRepository.revoke).toHaveBeenCalledWith(
      tokenRecord.id,
      mocks.executor,
    );
    expect(mocks.getTransactionState()).toEqual({
      committed: true,
      rolledBack: false,
    });
  });

  it('revokes all refresh tokens when the account is unusable', async () => {
    const inactiveMocks = createMocks();
    inactiveMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      jti: tokenRecord.id,
      type: 'refresh',
    });
    inactiveMocks.refreshTokenRepository.findByIdAndHashForUpdate.mockResolvedValue(
      tokenRecord,
    );
    inactiveMocks.usersRepository.findById.mockResolvedValue({
      ...user,
      status: 'withdrawn',
    });

    await expect(
      inactiveMocks.service.refresh('inactive'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      inactiveMocks.refreshTokenRepository.revokeAllForUser,
    ).toHaveBeenCalledWith(user.id, inactiveMocks.executor);
    expect(inactiveMocks.getTransactionState()).toEqual({
      committed: true,
      rolledBack: false,
    });

    const unverifiedMocks = createMocks();
    unverifiedMocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      jti: tokenRecord.id,
      type: 'refresh',
    });
    unverifiedMocks.refreshTokenRepository.findByIdAndHashForUpdate.mockResolvedValue(
      tokenRecord,
    );
    unverifiedMocks.usersRepository.findById.mockResolvedValue({
      ...user,
      email_verified: false,
    });

    await expect(
      unverifiedMocks.service.refresh('unverified'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      unverifiedMocks.refreshTokenRepository.revokeAllForUser,
    ).toHaveBeenCalledWith(user.id, unverifiedMocks.executor);
    expect(unverifiedMocks.getTransactionState()).toEqual({
      committed: true,
      rolledBack: false,
    });
  });

  it('rolls back rotation when storing the replacement token fails', async () => {
    const mocks = createMocks();
    const refreshToken = 'old-refresh-token';
    mocks.jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      jti: tokenRecord.id,
      type: 'refresh',
    });
    mocks.refreshTokenRepository.findByIdAndHashForUpdate.mockResolvedValue({
      ...tokenRecord,
      token_hash: createHash('sha256')
        .update(refreshToken, 'utf8')
        .digest('hex'),
    });
    mocks.usersRepository.findById.mockResolvedValue(user);
    mocks.jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');
    mocks.refreshTokenRepository.create.mockRejectedValue(
      new Error('storage failed'),
    );

    await expect(mocks.service.refresh(refreshToken)).rejects.toThrow(
      'storage failed',
    );
    expect(mocks.getTransactionState()).toEqual({
      committed: false,
      rolledBack: true,
    });
  });

  it('revokes only the current session during logout', async () => {
    const mocks = createMocks();
    mocks.refreshTokenRepository.findByHashForUpdate.mockResolvedValue(
      tokenRecord,
    );

    await expect(
      mocks.service.logout('refresh-token'),
    ).resolves.toBeUndefined();
    expect(
      mocks.refreshTokenRepository.revokeAllForSession,
    ).toHaveBeenCalledWith(tokenRecord.session_id, mocks.executor);
    expect(mocks.refreshTokenRepository.revoke).not.toHaveBeenCalled();

    const emptyMocks = createMocks();
    await expect(emptyMocks.service.logout(undefined)).resolves.toBeUndefined();
    expect(
      emptyMocks.refreshTokenRepository.findByHashForUpdate,
    ).not.toHaveBeenCalled();

    const revokedMocks = createMocks();
    revokedMocks.refreshTokenRepository.findByHashForUpdate.mockResolvedValue({
      ...tokenRecord,
      revoked_at: new Date(),
    });
    await revokedMocks.service.logout('already-revoked');
    expect(
      revokedMocks.refreshTokenRepository.revokeAllForSession,
    ).not.toHaveBeenCalled();
  });
});

function createMocks() {
  const executor = { query: jest.fn() } as unknown as DatabaseQueryExecutor;
  let transactionCommitted = false;
  let transactionRolledBack = false;
  const transaction = jest.fn(
    async (callback: (executor: DatabaseQueryExecutor) => Promise<unknown>) => {
      try {
        const result = await callback(executor);
        transactionCommitted = true;
        return result;
      } catch (error) {
        transactionRolledBack = true;
        throw error;
      }
    },
  );
  const databaseService = {
    transaction,
  } as unknown as DatabaseService;
  const usersService = {
    login: jest.fn(),
  } as unknown as UsersService;
  const usersRepository = {
    findById: jest.fn(),
  } as unknown as UsersRepository;
  const jwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as JwtService;
  const refreshTokenRepository = {
    create: jest.fn(),
    findByIdAndHashForUpdate: jest.fn(),
    findByHashForUpdate: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
    revokeAllForSession: jest.fn(),
  } as unknown as RefreshTokenRepository;
  const values: Record<string, string | number> = {
    AUTH_ACCESS_TOKEN_SECRET: 'access-secret',
    AUTH_REFRESH_TOKEN_SECRET: 'refresh-secret',
    AUTH_ACCESS_TOKEN_TTL: 900,
    AUTH_REFRESH_TOKEN_TTL: 2_592_000,
    AUTH_ACCESS_COOKIE_NAME: 'access_token',
    AUTH_REFRESH_COOKIE_NAME: 'refresh_token',
    AUTH_COOKIE_SECURE: 'false',
    AUTH_COOKIE_SAME_SITE: 'lax',
  };
  const configService = {
    getOrThrow: jest.fn((name: string) => values[name]),
  } as unknown as ConfigService<EnvironmentVariables>;
  const service = new AuthService(
    databaseService,
    jwtService,
    usersService,
    usersRepository,
    refreshTokenRepository,
    configService,
  );

  return {
    service,
    databaseService,
    executor,
    getTransactionState: () => ({
      committed: transactionCommitted,
      rolledBack: transactionRolledBack,
    }),
    usersService,
    usersRepository,
    jwtService,
    refreshTokenRepository,
  };
}
