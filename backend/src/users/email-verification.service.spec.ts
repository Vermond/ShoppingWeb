import {
  BadRequestException,
  GoneException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import type { EmailService } from '../email/email.service';
import type { EnvironmentVariables } from '../config/environment.validation';
import type { UsersRepository } from './users.repository';
import type { UserRecord } from './users.types';
import { EmailVerificationService } from './email-verification.service';
import type { EmailVerificationRepository } from './email-verification.repository';

const user: UserRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  name: 'User',
  role: 'customer',
  status: 'active',
  email_verified: false,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

describe('EmailVerificationService', () => {
  it('creates a random challenge and stores only its hash', async () => {
    const mocks = createMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const challenge = await mocks.service.issueForUser(user.id, mocks.executor);

    jest.useRealTimers();

    expect(challenge.token).toHaveLength(43);
    expect(challenge.expiresAt).toEqual(new Date('2026-01-02T00:00:00.000Z'));
    expect(mocks.emailVerificationRepository.create).toHaveBeenCalledTimes(1);
    expect(mocks.emailVerificationRepository.create).toHaveBeenCalledWith(
      user.id,
      createHash('sha256').update(challenge.token, 'utf8').digest('hex'),
      challenge.expiresAt,
      mocks.executor,
    );
  });

  it('invalidates old challenges before replacing a challenge', async () => {
    const mocks = createMocks();

    const challenge = await mocks.service.replaceForUser(
      user.id,
      mocks.executor,
    );

    expect(
      mocks.emailVerificationRepository.invalidateForUser,
    ).toHaveBeenCalledWith(user.id, mocks.executor);
    expect(mocks.emailVerificationRepository.create).toHaveBeenCalledWith(
      user.id,
      expect.any(String),
      challenge.expiresAt,
      mocks.executor,
    );
  });

  it('converts email transport failures to ServiceUnavailableException', async () => {
    const mocks = createMocks();
    mocks.emailService.sendVerificationEmail.mockRejectedValue(
      new Error('Resend failed'),
    );

    await expect(
      mocks.service.sendVerificationEmail({
        email: user.email,
        name: user.name,
        token: 'token',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('verifies a valid token and marks it as used', async () => {
    const mocks = createMocks();
    const token = 'valid-token';
    const tokenRecord = {
      id: '22222222-2222-4222-8222-222222222222',
      user_id: user.id,
      expires_at: new Date('2099-01-02T00:00:00.000Z'),
      used_at: null,
    };
    mocks.emailVerificationRepository.findByHashForUpdate.mockResolvedValue(
      tokenRecord,
    );
    mocks.usersRepository.findById.mockResolvedValue(user);
    mocks.usersRepository.markEmailVerified.mockResolvedValue({
      ...user,
      email_verified: true,
    });

    await expect(mocks.service.verify(token)).resolves.toEqual({
      status: 'verified',
    });
    expect(
      mocks.emailVerificationRepository.findByHashForUpdate,
    ).toHaveBeenCalledWith(
      createHash('sha256').update(token, 'utf8').digest('hex'),
      mocks.executor,
    );
    expect(mocks.usersRepository.markEmailVerified).toHaveBeenCalledWith(
      user.id,
      mocks.executor,
    );
    expect(mocks.emailVerificationRepository.markUsed).toHaveBeenCalledWith(
      tokenRecord.id,
      mocks.executor,
    );
  });

  it('returns already_verified without consuming a token for a verified user', async () => {
    const mocks = createMocks();
    mocks.emailVerificationRepository.findByHashForUpdate.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      user_id: user.id,
      expires_at: new Date('2026-01-02T00:00:00.000Z'),
      used_at: null,
    });
    mocks.usersRepository.findById.mockResolvedValue({
      ...user,
      email_verified: true,
    });

    await expect(mocks.service.verify('token')).resolves.toEqual({
      status: 'already_verified',
    });
    expect(mocks.usersRepository.markEmailVerified).not.toHaveBeenCalled();
    expect(mocks.emailVerificationRepository.markUsed).not.toHaveBeenCalled();
  });

  it('rejects missing, used, expired, and invalid-account tokens', async () => {
    const missingMocks = createMocks();
    missingMocks.emailVerificationRepository.findByHashForUpdate.mockResolvedValue(
      null,
    );
    await expect(missingMocks.service.verify('missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const usedMocks = createMocks();
    usedMocks.emailVerificationRepository.findByHashForUpdate.mockResolvedValue(
      {
        id: '22222222-2222-4222-8222-222222222222',
        user_id: user.id,
        expires_at: new Date('2026-01-02T00:00:00.000Z'),
        used_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    );
    usedMocks.usersRepository.findById.mockResolvedValue(user);
    await expect(usedMocks.service.verify('used')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const expiredMocks = createMocks();
    expiredMocks.emailVerificationRepository.findByHashForUpdate.mockResolvedValue(
      {
        id: '22222222-2222-4222-8222-222222222222',
        user_id: user.id,
        expires_at: new Date('2020-01-01T00:00:00.000Z'),
        used_at: null,
      },
    );
    expiredMocks.usersRepository.findById.mockResolvedValue(user);
    await expect(expiredMocks.service.verify('expired')).rejects.toBeInstanceOf(
      GoneException,
    );

    const inactiveMocks = createMocks();
    inactiveMocks.emailVerificationRepository.findByHashForUpdate.mockResolvedValue(
      {
        id: '22222222-2222-4222-8222-222222222222',
        user_id: user.id,
        expires_at: new Date('2026-01-02T00:00:00.000Z'),
        used_at: null,
      },
    );
    inactiveMocks.usersRepository.findById.mockResolvedValue({
      ...user,
      status: 'withdrawn',
    });
    await expect(
      inactiveMocks.service.verify('inactive'),
    ).rejects.toBeInstanceOf(BadRequestException);

    const updateMocks = createMocks();
    updateMocks.emailVerificationRepository.findByHashForUpdate.mockResolvedValue(
      {
        id: '22222222-2222-4222-8222-222222222222',
        user_id: user.id,
        expires_at: new Date('2099-01-02T00:00:00.000Z'),
        used_at: null,
      },
    );
    updateMocks.usersRepository.findById.mockResolvedValue(user);
    updateMocks.usersRepository.markEmailVerified.mockResolvedValue(null);
    await expect(
      updateMocks.service.verify('update-failed'),
    ).rejects.toBeInstanceOf(BadRequestException);

    const databaseMocks = createMocks();
    databaseMocks.emailVerificationRepository.findByHashForUpdate.mockRejectedValue(
      new Error('database failed'),
    );
    await expect(
      databaseMocks.service.verify('database-failed'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('resends a challenge for an unverified user', async () => {
    const mocks = createMocks();
    mocks.usersRepository.findByEmail.mockResolvedValue({
      ...user,
      password_hash: 'hash',
    });

    await expect(mocks.service.resend(user.email)).resolves.toEqual({
      status: 'sent',
    });
    expect(
      mocks.emailVerificationRepository.invalidateForUser,
    ).toHaveBeenCalledWith(user.id, mocks.executor);
    expect(mocks.emailService.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: user.email, name: user.name }),
    );
  });

  it('does not reveal whether an unknown or inactive email exists', async () => {
    const unknownMocks = createMocks();
    unknownMocks.usersRepository.findByEmail.mockResolvedValue(null);
    await expect(unknownMocks.service.resend(user.email)).resolves.toEqual({
      status: 'sent',
    });
    expect(
      unknownMocks.emailService.sendVerificationEmail,
    ).not.toHaveBeenCalled();

    const inactiveMocks = createMocks();
    inactiveMocks.usersRepository.findByEmail.mockResolvedValue({
      ...user,
      status: 'withdrawn',
      password_hash: 'hash',
    });
    await expect(inactiveMocks.service.resend(user.email)).resolves.toEqual({
      status: 'sent',
    });
    expect(
      inactiveMocks.emailService.sendVerificationEmail,
    ).not.toHaveBeenCalled();
  });

  it('returns already_verified without sending another email', async () => {
    const mocks = createMocks();
    mocks.usersRepository.findByEmail.mockResolvedValue({
      ...user,
      email_verified: true,
      password_hash: 'hash',
    });

    await expect(mocks.service.resend(user.email)).resolves.toEqual({
      status: 'already_verified',
    });
    expect(mocks.emailService.sendVerificationEmail).not.toHaveBeenCalled();
    expect(mocks.emailVerificationRepository.create).not.toHaveBeenCalled();
  });

  it('maps unexpected resend failures to an internal server error', async () => {
    const mocks = createMocks();
    mocks.usersRepository.findByEmail.mockRejectedValue(
      new Error('database failed'),
    );

    await expect(mocks.service.resend(user.email)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});

function createMocks() {
  const executor = { query: jest.fn() } as unknown as DatabaseQueryExecutor;
  const databaseService = {
    transaction: jest.fn(
      async (callback: (executor: DatabaseQueryExecutor) => Promise<unknown>) =>
        callback(executor),
    ),
  } as unknown as DatabaseService;
  const usersRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    markEmailVerified: jest.fn(),
  } as unknown as UsersRepository;
  const emailVerificationRepository = {
    create: jest.fn(),
    invalidateForUser: jest.fn(),
    findByHashForUpdate: jest.fn(),
    markUsed: jest.fn(),
  } as unknown as EmailVerificationRepository;
  const emailService = {
    sendVerificationEmail: jest.fn(),
  } as unknown as EmailService;
  const configService = {
    getOrThrow: jest.fn(() => 1_440),
  } as unknown as ConfigService<EnvironmentVariables>;
  const service = new EmailVerificationService(
    databaseService,
    usersRepository,
    emailVerificationRepository,
    emailService,
    configService,
  );

  return {
    service,
    executor,
    usersRepository,
    emailVerificationRepository,
    emailService,
  };
}
