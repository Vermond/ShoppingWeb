import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import type { RefreshTokenRepository } from '../auth/refresh-token.repository';
import type { EmailVerificationService } from './email-verification.service';
import type { EmailVerificationRepository } from './email-verification.repository';
import { PasswordService } from './password.service';
import type { CreateUserInput } from './users.input';
import { UsersRepository, type UserRecord } from './users.repository';
import { UsersService } from './users.service';

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

describe('UsersService', () => {
  it('creates an unverified user and sends a verification email', async () => {
    const mocks = createMocks();
    const input: CreateUserInput = {
      email: user.email,
      password: 'password123',
      name: user.name,
    };
    const challenge = {
      token: 'verification-token',
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    mocks.passwordService.hash.mockResolvedValue('password-hash');
    mocks.usersRepository.create.mockResolvedValue(user);
    mocks.emailVerificationService.issueForUser.mockResolvedValue(challenge);

    await expect(mocks.service.create(input)).resolves.toBe(user);

    expect(mocks.usersRepository.create).toHaveBeenCalledWith(
      input.email,
      'password-hash',
      input.name,
      mocks.executor,
    );
    expect(
      mocks.emailVerificationService.sendVerificationEmail,
    ).toHaveBeenCalledWith({
      email: user.email,
      name: user.name,
      token: challenge.token,
    });
  });

  it('maps duplicate email errors to ConflictException', async () => {
    const mocks = createMocks();
    mocks.passwordService.hash.mockResolvedValue('password-hash');
    mocks.usersRepository.create.mockRejectedValue({ code: '23505' });

    await expect(
      mocks.service.create({
        email: user.email,
        password: 'password123',
        name: user.name,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps the user result while surfacing verification email failures', async () => {
    const mocks = createMocks();
    mocks.passwordService.hash.mockResolvedValue('password-hash');
    mocks.usersRepository.create.mockResolvedValue(user);
    mocks.emailVerificationService.issueForUser.mockResolvedValue({
      token: 'verification-token',
      expiresAt: new Date(),
    });
    mocks.emailVerificationService.sendVerificationEmail.mockRejectedValue(
      new ServiceUnavailableException('mail unavailable'),
    );

    await expect(
      mocks.service.create({
        email: user.email,
        password: 'password123',
        name: user.name,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('updates a name without resetting email verification', async () => {
    const mocks = createMocks();
    const verifiedUser = { ...user, email_verified: true, name: 'Updated' };
    mocks.usersRepository.findById.mockResolvedValue({
      ...user,
      email_verified: true,
    });
    mocks.usersRepository.update.mockResolvedValue(verifiedUser);

    await expect(
      mocks.service.update(user.id, { name: 'Updated' }),
    ).resolves.toBe(verifiedUser);

    expect(
      mocks.emailVerificationService.replaceForUser,
    ).not.toHaveBeenCalled();
    expect(
      mocks.refreshTokenRepository.revokeAllForUser,
    ).not.toHaveBeenCalled();
    expect(
      mocks.emailVerificationService.sendVerificationEmail,
    ).not.toHaveBeenCalled();
  });

  it('resets verification and revokes refresh tokens when email changes', async () => {
    const mocks = createMocks();
    const updatedUser = {
      ...user,
      email: 'new@example.com',
      email_verified: false,
    };
    const challenge = {
      token: 'new-verification-token',
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    mocks.usersRepository.findById.mockResolvedValue({
      ...user,
      email_verified: true,
    });
    mocks.usersRepository.update.mockResolvedValue(updatedUser);
    mocks.emailVerificationService.replaceForUser.mockResolvedValue(challenge);

    await expect(
      mocks.service.update(user.id, { email: updatedUser.email }),
    ).resolves.toBe(updatedUser);

    expect(mocks.usersRepository.update).toHaveBeenCalledWith(
      user.id,
      {
        email: updatedUser.email,
        name: undefined,
        passwordHash: undefined,
        emailChanged: true,
      },
      mocks.executor,
    );
    expect(mocks.refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
      user.id,
      mocks.executor,
    );
    expect(
      mocks.emailVerificationService.sendVerificationEmail,
    ).toHaveBeenCalledWith({
      email: updatedUser.email,
      name: updatedUser.name,
      token: challenge.token,
    });
  });

  it('rejects updates for a missing user and duplicate emails', async () => {
    const missingMocks = createMocks();
    missingMocks.usersRepository.findById.mockResolvedValue(null);

    await expect(
      missingMocks.service.update(user.id, { name: 'Updated' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const duplicateMocks = createMocks();
    duplicateMocks.usersRepository.findById.mockResolvedValue(user);
    duplicateMocks.usersRepository.update.mockRejectedValue({ code: '23505' });

    await expect(
      duplicateMocks.service.update(user.id, { email: 'new@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not reset verification when the email remains unchanged', async () => {
    const mocks = createMocks();
    const updatedUser = { ...user, name: 'Updated' };
    mocks.usersRepository.findById.mockResolvedValue({
      ...user,
      email_verified: true,
    });
    mocks.usersRepository.update.mockResolvedValue(updatedUser);

    await mocks.service.update(user.id, {
      email: user.email,
      name: 'Updated',
    });

    expect(
      mocks.emailVerificationService.replaceForUser,
    ).not.toHaveBeenCalled();
    expect(
      mocks.refreshTokenRepository.revokeAllForUser,
    ).not.toHaveBeenCalled();
  });

  it('maps unexpected create, update, withdraw, and login failures to 500', async () => {
    const createMocks = createMocksForUnexpectedError();
    await expect(
      createMocks.service.create({
        email: user.email,
        password: 'password123',
        name: user.name,
      }),
    ).rejects.toThrow('사용자를 생성하지 못했습니다.');

    const updateMocks = createMocksForUnexpectedError();
    updateMocks.usersRepository.findById.mockResolvedValue(user);
    updateMocks.usersRepository.update.mockRejectedValue(new Error('failed'));
    await expect(
      updateMocks.service.update(user.id, { name: 'Updated' }),
    ).rejects.toThrow('사용자 정보를 수정하지 못했습니다.');

    const withdrawMocks = createMocksForUnexpectedError();
    withdrawMocks.usersRepository.withdraw.mockRejectedValue(
      new Error('failed'),
    );
    await expect(withdrawMocks.service.withdraw(user.id)).rejects.toThrow(
      '사용자 탈퇴를 처리하지 못했습니다.',
    );

    const loginMocks = createMocksForUnexpectedError();
    loginMocks.usersRepository.findByEmail.mockRejectedValue(
      new Error('failed'),
    );
    await expect(login(loginMocks.service)).rejects.toThrow(
      '로그인하지 못했습니다.',
    );
  });

  it('withdraws the user and invalidates related tokens', async () => {
    const mocks = createMocks();
    const withdrawnUser = { ...user, status: 'withdrawn' };
    mocks.usersRepository.withdraw.mockResolvedValue(withdrawnUser);

    await expect(mocks.service.withdraw(user.id)).resolves.toBe(withdrawnUser);

    expect(
      mocks.emailVerificationRepository.invalidateForUser,
    ).toHaveBeenCalledWith(user.id, mocks.executor);
    expect(mocks.refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
      user.id,
      mocks.executor,
    );
  });

  it('returns NotFoundException when withdrawing a missing user', async () => {
    const mocks = createMocks();
    mocks.usersRepository.withdraw.mockResolvedValue(null);

    await expect(mocks.service.withdraw(user.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns a safe user record after successful login', async () => {
    const mocks = createMocks();
    const storedUser = { ...user, email_verified: true, password_hash: 'hash' };
    mocks.usersRepository.findByEmail.mockResolvedValue(storedUser);
    mocks.passwordService.verify.mockResolvedValue(true);

    await expect(
      mocks.service.login({
        email: user.email,
        password: 'password123',
      }),
    ).resolves.toEqual(userWithVerification(true));
  });

  it('rejects invalid credentials, inactive users, and unverified users', async () => {
    const wrongPasswordMocks = createMocks();
    wrongPasswordMocks.usersRepository.findByEmail.mockResolvedValue({
      ...user,
      password_hash: 'hash',
    });
    wrongPasswordMocks.passwordService.verify.mockResolvedValue(false);
    await expect(login(wrongPasswordMocks.service)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const missingUserMocks = createMocks();
    missingUserMocks.usersRepository.findByEmail.mockResolvedValue(null);
    await expect(login(missingUserMocks.service)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    const inactiveMocks = createMocks();
    inactiveMocks.usersRepository.findByEmail.mockResolvedValue({
      ...user,
      status: 'withdrawn',
      password_hash: 'hash',
    });
    inactiveMocks.passwordService.verify.mockResolvedValue(true);
    await expect(login(inactiveMocks.service)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const unverifiedMocks = createMocks();
    unverifiedMocks.usersRepository.findByEmail.mockResolvedValue({
      ...user,
      password_hash: 'hash',
    });
    unverifiedMocks.passwordService.verify.mockResolvedValue(true);
    await expect(login(unverifiedMocks.service)).rejects.toMatchObject({
      response: {
        code: 'EMAIL_NOT_VERIFIED',
      },
    });
  });
});

async function login(service: UsersService): Promise<UserRecord> {
  return service.login({ email: user.email, password: 'password123' });
}

function userWithVerification(emailVerified: boolean): UserRecord {
  return { ...user, email_verified: emailVerified };
}

function createMocks() {
  const executor = {
    query: jest.fn(),
  } as unknown as DatabaseQueryExecutor;
  const transaction = jest.fn(
    async (callback: (executor: DatabaseQueryExecutor) => Promise<unknown>) =>
      callback(executor),
  );
  const databaseService = { transaction } as unknown as DatabaseService;
  const usersRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    withdraw: jest.fn(),
  } as unknown as UsersRepository;
  const passwordService = {
    hash: jest.fn(),
    verify: jest.fn(),
  } as unknown as PasswordService;
  const emailVerificationRepository = {
    invalidateForUser: jest.fn(),
  };
  const emailVerificationService = {
    issueForUser: jest.fn(),
    replaceForUser: jest.fn(),
    sendVerificationEmail: jest.fn(),
  } as unknown as EmailVerificationService;
  const refreshTokenRepository = {
    revokeAllForUser: jest.fn(),
  } as unknown as RefreshTokenRepository;

  const service = new UsersService(
    databaseService,
    usersRepository,
    passwordService,
    emailVerificationRepository as unknown as EmailVerificationRepository,
    emailVerificationService,
    refreshTokenRepository,
  );

  return {
    service,
    executor,
    usersRepository,
    passwordService,
    emailVerificationRepository,
    emailVerificationService,
    refreshTokenRepository,
  };
}

function createMocksForUnexpectedError() {
  const mocks = createMocks();
  mocks.passwordService.hash.mockResolvedValue('password-hash');
  return mocks;
}
