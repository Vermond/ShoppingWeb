import {
  BadRequestException,
  GoneException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import type { EnvironmentVariables } from '../config/environment.validation';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import { EmailService } from '../email/email.service';
import { RefreshTokenRepository } from '../auth/refresh-token.repository';
import type { PasswordResetConfirmInput } from './password-reset.input';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordService } from './password.service';
import { UsersRepository } from './users.repository';

export type PasswordResetRequestResult = {
  status: 'sent';
};

type PendingPasswordResetEmail = {
  email: string;
  name: string;
  token: string;
};

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersRepository: UsersRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly passwordService: PasswordService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async request(email: string): Promise<PasswordResetRequestResult> {
    let pendingEmail: PendingPasswordResetEmail | undefined;

    try {
      await this.databaseService.transaction(async (executor) => {
        const user = await this.usersRepository.findByEmail(email, executor);

        if (!user || user.status !== 'active') {
          return;
        }

        await this.passwordResetRepository.invalidateForUser(user.id, executor);
        const challenge = await this.createChallenge(user.id, executor);
        pendingEmail = {
          email: user.email,
          name: user.name,
          token: challenge.token,
        };
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logError('비밀번호 재설정 토큰 생성에 실패했습니다.', error);
      throw new InternalServerErrorException(
        '비밀번호 재설정을 요청하지 못했습니다.',
      );
    }

    if (pendingEmail) {
      await this.sendResetEmail(pendingEmail);
    }

    return { status: 'sent' };
  }

  async confirm(input: PasswordResetConfirmInput): Promise<void> {
    try {
      await this.databaseService.transaction(async (executor) => {
        const tokenRecord =
          await this.passwordResetRepository.findByHashForUpdate(
            hashPasswordResetToken(input.token),
            executor,
          );

        if (!tokenRecord) {
          throw new BadRequestException({
            code: 'PASSWORD_RESET_TOKEN_INVALID',
            message: '유효하지 않은 비밀번호 재설정 토큰입니다.',
          });
        }

        if (tokenRecord.used_at) {
          throw new BadRequestException({
            code: 'PASSWORD_RESET_TOKEN_USED',
            message: '이미 사용된 비밀번호 재설정 토큰입니다.',
          });
        }

        if (new Date(tokenRecord.expires_at).getTime() <= Date.now()) {
          throw new GoneException({
            code: 'PASSWORD_RESET_TOKEN_EXPIRED',
            message: '비밀번호 재설정 토큰이 만료되었습니다.',
          });
        }

        const user = await this.usersRepository.findById(
          tokenRecord.user_id,
          executor,
        );

        if (!user || user.status !== 'active') {
          throw new BadRequestException({
            code: 'PASSWORD_RESET_TOKEN_INVALID',
            message: '유효하지 않은 비밀번호 재설정 요청입니다.',
          });
        }

        const passwordHash = await this.passwordService.hash(
          input.new_password,
        );
        const updatedUser = await this.usersRepository.updatePassword(
          user.id,
          passwordHash,
          executor,
        );

        if (!updatedUser) {
          throw new BadRequestException({
            code: 'PASSWORD_RESET_TOKEN_INVALID',
            message: '비밀번호를 변경할 수 없습니다.',
          });
        }

        await this.passwordResetRepository.markUsed(tokenRecord.id, executor);
        await this.passwordResetRepository.invalidateForUser(user.id, executor);
        await this.refreshTokenRepository.revokeAllForUser(user.id, executor);
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logError('비밀번호 재설정에 실패했습니다.', error);
      throw new InternalServerErrorException('비밀번호를 변경하지 못했습니다.');
    }
  }

  private async createChallenge(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<{ token: string }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() +
        this.configService.getOrThrow<number>(
          'PASSWORD_RESET_TOKEN_TTL_MINUTES',
        ) *
          60_000,
    );

    await this.passwordResetRepository.create(
      userId,
      hashPasswordResetToken(token),
      expiresAt,
      executor,
    );

    return { token };
  }

  private async sendResetEmail(
    input: PendingPasswordResetEmail,
  ): Promise<void> {
    try {
      await this.emailService.sendPasswordResetEmail(input);
    } catch (error) {
      this.logError('비밀번호 재설정 이메일 발송에 실패했습니다.', error);
      throw new ServiceUnavailableException(
        '비밀번호 재설정 이메일을 전송하지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
  }

  private logError(message: string, error: unknown): void {
    this.logger.error(
      message,
      error instanceof Error ? error.stack : String(error),
    );
  }
}

function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
