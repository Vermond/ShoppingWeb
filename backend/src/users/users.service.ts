import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerificationService } from './email-verification.service';
import { PasswordService } from './password.service';
import { UsersRepository } from './users.repository';
import type { UserRecord } from './users.repository';
import type {
  CreateUserInput,
  LoginInput,
  UpdateUserInput,
} from './users.input';

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return error.code === '23505';
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      const passwordHash = await this.passwordService.hash(input.password);
      const { user, challenge } = await this.databaseService.transaction(
        async (executor) => {
          const user = await this.usersRepository.create(
            input.email,
            passwordHash,
            input.name,
            executor,
          );
          const challenge = await this.emailVerificationService.issueForUser(
            user.id,
            executor,
          );

          return { user, challenge };
        },
      );

      await this.emailVerificationService.sendVerificationEmail({
        email: user.email,
        name: user.name,
        token: challenge.token,
      });

      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }

      if (error instanceof HttpException) {
        throw error;
      }

      this.logError('사용자 생성에 실패했습니다.', error);
      throw new InternalServerErrorException('사용자를 생성하지 못했습니다.');
    }
  }

  async update(id: string, input: UpdateUserInput): Promise<UserRecord> {
    try {
      const passwordHash = input.password
        ? await this.passwordService.hash(input.password)
        : undefined;
      const { user, challenge } = await this.databaseService.transaction(
        async (executor) => {
          const currentUser = await this.usersRepository.findById(id, executor);

          if (!currentUser) {
            throw new NotFoundException('사용자를 찾을 수 없습니다.');
          }

          const emailChanged =
            input.email !== undefined && input.email !== currentUser.email;
          const user = await this.usersRepository.update(
            id,
            {
              email: input.email,
              name: input.name,
              passwordHash,
              emailChanged,
            },
            executor,
          );

          if (!user) {
            throw new NotFoundException('사용자를 찾을 수 없습니다.');
          }

          const challenge = emailChanged
            ? await this.emailVerificationService.replaceForUser(
                user.id,
                executor,
              )
            : undefined;

          return { user, challenge };
        },
      );

      if (challenge) {
        await this.emailVerificationService.sendVerificationEmail({
          email: user.email,
          name: user.name,
          token: challenge.token,
        });
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof HttpException) {
        throw error;
      }

      if (isUniqueViolation(error)) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }

      this.logError('사용자 정보 수정에 실패했습니다.', error);
      throw new InternalServerErrorException(
        '사용자 정보를 수정하지 못했습니다.',
      );
    }
  }

  async withdraw(id: string): Promise<UserRecord> {
    try {
      const user = await this.databaseService.transaction(async (executor) => {
        const user = await this.usersRepository.withdraw(id, executor);

        if (user) {
          await this.emailVerificationRepository.invalidateForUser(
            user.id,
            executor,
          );
        }

        return user;
      });

      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logError('사용자 탈퇴 처리에 실패했습니다.', error);
      throw new InternalServerErrorException(
        '사용자 탈퇴를 처리하지 못했습니다.',
      );
    }
  }

  async login(input: LoginInput): Promise<UserRecord> {
    try {
      const user = await this.usersRepository.findByEmail(input.email);
      const passwordMatches = await this.passwordService.verify(
        input.password,
        user?.password_hash ?? null,
      );

      if (!user || !passwordMatches) {
        throw new UnauthorizedException(
          '이메일 또는 비밀번호가 올바르지 않습니다.',
        );
      }

      if (user.status !== 'active') {
        throw new ForbiddenException({
          code: 'USER_INACTIVE',
          message: '사용할 수 없는 계정입니다.',
        });
      }

      if (!user.email_verified) {
        throw new ForbiddenException({
          code: 'EMAIL_NOT_VERIFIED',
          message: '로그인하려면 이메일 인증이 필요합니다.',
        });
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logError('로그인 처리에 실패했습니다.', error);
      throw new InternalServerErrorException('로그인하지 못했습니다.');
    }
  }

  private logError(message: string, error: unknown): void {
    this.logger.error(
      message,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
