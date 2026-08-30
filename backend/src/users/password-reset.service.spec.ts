import {
  BadRequestException,
  GoneException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import type { EmailService } from '../email/email.service';
import type { EnvironmentVariables } from '../config/environment.validation';
import type { RefreshTokenRepository } from '../auth/refresh-token.repository';
import type { StoredUserRecord, UserRecord } from './users.types';
import type { PasswordResetConfirmInput } from './password-reset.input';
import type { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetService } from './password-reset.service';
import type { PasswordService } from './password.service';
import type { UsersRepository } from './users.repository';

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

const storedUser: StoredUserRecord = {
  ...user,
  password_hash: 'old-password-hash',
};

const tokenRecord = {
  id: '22222222-2222-4222-8222-222222222222',
  user_id: user.id,
  expires_at: new Date(Date.now() + 60_000),
  used_at: null,
};

function createMocks() {
  const executor = {} as DatabaseQueryExecutor;
  const usersRepository = {
    findByEmail: jest.fn().mockResolvedValue(storedUser),
    findById: jest.fn().mockResolvedValue(user),
    findByIdWithPassword: jest.fn().mockResolvedValue(storedUser),
    updatePassword: jest.fn().mockResolvedValue(user),
  } as unknown as jest.Mocked<UsersRepository>;
  const passwordResetRepository = {
    create: jest.fn().mockResolvedValue(undefined),
    findByHashForUpdate: jest.fn().mockResolvedValue(tokenRecord),
    invalidateForUser: jest.fn().mockResolvedValue(undefined),
    markUsed: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<PasswordResetRepository>;
  const passwordService = {
    hash: jest.fn().mockResolvedValue('new-password-hash'),
    verify: jest.fn().mockResolvedValue(false),
  } as unknown as jest.Mocked<PasswordService>;
  const refreshTokenRepository = {
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<RefreshTokenRepository>;
  const emailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<EmailService>;
  const configService = {
    getOrThrow: jest.fn().mockReturnValue(30),
  } as unknown as ConfigService<EnvironmentVariables>;
  const databaseService = {
    transaction: jest.fn(
      (callback: (executor: DatabaseQueryExecutor) => Promise<unknown>) =>
        callback(executor),
    ),
  } as unknown as DatabaseService;

  return {
    service: new PasswordResetService(
      databaseService,
      usersRepository,
      passwordResetRepository,
      passwordService,
      refreshTokenRepository,
      emailService,
      configService,
    ),
    usersRepository,
    passwordResetRepository,
    passwordService,
    refreshTokenRepository,
    emailService,
  };
}

describe('PasswordResetService', () => {
  it('returns a generic result for an unknown email', async () => {
    const mocks = createMocks();
    mocks.usersRepository.findByEmail.mockResolvedValue(null);

    await expect(mocks.service.request('unknown@example.com')).resolves.toEqual(
      { status: 'sent' },
    );
    expect(mocks.passwordResetRepository.create).not.toHaveBeenCalled();
    expect(mocks.emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('invalidates old tokens, creates a hashed token, and sends an email', async () => {
    const mocks = createMocks();

    await expect(mocks.service.request(user.email)).resolves.toEqual({
      status: 'sent',
    });
    expect(
      mocks.passwordResetRepository.invalidateForUser,
    ).toHaveBeenCalledWith(user.id, expect.anything());
    expect(mocks.passwordResetRepository.create).toHaveBeenCalledWith(
      user.id,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
      expect.anything(),
    );
    expect(mocks.emailService.sendPasswordResetEmail).toHaveBeenCalledWith({
      email: user.email,
      name: user.name,
      token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    });
  });

  it('changes the password, consumes the token, and revokes all refresh tokens', async () => {
    const mocks = createMocks();
    const input: PasswordResetConfirmInput = {
      token: 'raw-reset-token',
      new_password: 'new-password123',
    };

    await expect(mocks.service.confirm(input)).resolves.toBeUndefined();
    expect(mocks.passwordService.hash).toHaveBeenCalledWith(input.new_password);
    expect(mocks.passwordService.verify).toHaveBeenCalledWith(
      input.new_password,
      storedUser.password_hash,
    );
    expect(mocks.usersRepository.updatePassword).toHaveBeenCalledWith(
      user.id,
      'new-password-hash',
      expect.anything(),
    );
    expect(mocks.passwordResetRepository.markUsed).toHaveBeenCalledWith(
      tokenRecord.id,
      expect.anything(),
    );
    expect(
      mocks.passwordResetRepository.invalidateForUser,
    ).toHaveBeenCalledWith(user.id, expect.anything());
    expect(mocks.refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
      user.id,
      expect.anything(),
    );
  });

  it('rejects invalid, used, and expired tokens', async () => {
    const invalid = createMocks();
    invalid.passwordResetRepository.findByHashForUpdate.mockResolvedValue(null);
    await expect(
      invalid.service.confirm({
        token: 'invalid',
        new_password: 'password123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const used = createMocks();
    used.passwordResetRepository.findByHashForUpdate.mockResolvedValue({
      ...tokenRecord,
      used_at: new Date(),
    });
    await expect(
      used.service.confirm({ token: 'used', new_password: 'password123' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const expired = createMocks();
    expired.passwordResetRepository.findByHashForUpdate.mockResolvedValue({
      ...tokenRecord,
      expires_at: new Date(Date.now() - 1),
    });
    await expect(
      expired.service.confirm({
        token: 'expired',
        new_password: 'password123',
      }),
    ).rejects.toBeInstanceOf(GoneException);
  });

  it('converts reset email failures into service unavailable responses', async () => {
    const mocks = createMocks();
    mocks.emailService.sendPasswordResetEmail.mockRejectedValue(
      new Error('delivery failed'),
    );

    await expect(mocks.service.request(user.email)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects reusing the current password without consuming the reset token', async () => {
    const mocks = createMocks();
    mocks.passwordService.verify.mockResolvedValue(true);

    await expect(
      mocks.service.confirm({
        token: 'same-password',
        new_password: 'old-password',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'PASSWORD_REUSE_NOT_ALLOWED',
      },
    });

    expect(mocks.passwordService.hash).not.toHaveBeenCalled();
    expect(mocks.usersRepository.updatePassword).not.toHaveBeenCalled();
    expect(mocks.passwordResetRepository.markUsed).not.toHaveBeenCalled();
    expect(
      mocks.passwordResetRepository.invalidateForUser,
    ).not.toHaveBeenCalled();
    expect(
      mocks.refreshTokenRepository.revokeAllForUser,
    ).not.toHaveBeenCalled();
  });
});
