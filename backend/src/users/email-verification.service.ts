import {
  BadRequestException,
  GoneException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { EmailService } from '../email/email.service';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import { EmailVerificationRepository } from './email-verification.repository';
import { UsersRepository } from './users.repository';

export type EmailVerificationResult = {
  status: 'verified' | 'already_verified';
};

export type ResendVerificationResult = {
  status: 'sent' | 'already_verified';
};

export type EmailVerificationChallenge = {
  token: string;
  expiresAt: Date;
};

type PendingVerificationEmail = {
  email: string;
  name: string;
  token: string;
};

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersRepository: UsersRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly emailService: EmailService,
  ) {}

  async issueForUser(
    userId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<EmailVerificationChallenge> {
    return this.createChallenge(userId, executor);
  }

  async replaceForUser(
    userId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<EmailVerificationChallenge> {
    await this.emailVerificationRepository.invalidateForUser(userId, executor);

    return this.createChallenge(userId, executor);
  }

  async sendVerificationEmail(input: PendingVerificationEmail): Promise<void> {
    try {
      await this.emailService.sendVerificationEmail(input);
    } catch (error) {
      this.logger.error(
        '인증 이메일 발송에 실패했습니다.',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        '인증 이메일을 전송하지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
  }

  async verify(token: string): Promise<EmailVerificationResult> {
    try {
      return await this.databaseService.transaction(async (executor) => {
        const tokenHash = hashVerificationToken(token);
        const tokenRecord =
          await this.emailVerificationRepository.findByHashForUpdate(
            tokenHash,
            executor,
          );

        if (!tokenRecord) {
          throw new BadRequestException('유효하지 않은 인증 토큰입니다.');
        }

        const user = await this.usersRepository.findById(
          tokenRecord.user_id,
          executor,
        );

        if (!user || user.status !== 'active') {
          throw new BadRequestException('유효하지 않은 인증 요청입니다.');
        }

        if (user.email_verified) {
          return { status: 'already_verified' };
        }

        if (tokenRecord.used_at) {
          throw new BadRequestException('이미 사용된 인증 토큰입니다.');
        }

        if (new Date(tokenRecord.expires_at).getTime() <= Date.now()) {
          throw new GoneException('인증 토큰이 만료되었습니다.');
        }

        const verifiedUser = await this.usersRepository.markEmailVerified(
          user.id,
          executor,
        );

        if (!verifiedUser) {
          throw new BadRequestException('이메일 인증을 처리할 수 없습니다.');
        }

        await this.emailVerificationRepository.markUsed(
          tokenRecord.id,
          executor,
        );

        return { status: 'verified' };
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logError('이메일 인증 처리에 실패했습니다.', error);
      throw new InternalServerErrorException(
        '이메일 인증을 처리하지 못했습니다.',
      );
    }
  }

  async resend(email: string): Promise<ResendVerificationResult> {
    let pendingEmail: PendingVerificationEmail | undefined;
    let result: ResendVerificationResult;

    try {
      result = await this.databaseService.transaction(async (executor) => {
        const user = await this.usersRepository.findByEmail(email, executor);

        if (!user || user.status !== 'active') {
          return { status: 'sent' };
        }

        if (user.email_verified) {
          return { status: 'already_verified' };
        }

        const challenge = await this.replaceForUser(user.id, executor);
        pendingEmail = {
          email: user.email,
          name: user.name,
          token: challenge.token,
        };

        return { status: 'sent' };
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logError('인증 토큰 재생성에 실패했습니다.', error);
      throw new InternalServerErrorException(
        '인증 메일 재전송을 처리하지 못했습니다.',
      );
    }

    if (pendingEmail) {
      await this.sendVerificationEmail(pendingEmail);
    }

    return result;
  }

  private async createChallenge(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<EmailVerificationChallenge> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.readTtlMinutes() * 60_000);

    await this.emailVerificationRepository.create(
      userId,
      hashVerificationToken(token),
      expiresAt,
      executor,
    );

    return { token, expiresAt };
  }

  private readTtlMinutes(): number {
    const value = process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? '1440';
    const minutes = Number(value);

    if (!Number.isInteger(minutes) || minutes <= 0) {
      throw new Error(
        'EMAIL_VERIFICATION_TOKEN_TTL_MINUTES는 양의 정수여야 합니다.',
      );
    }

    return minutes;
  }

  private logError(message: string, error: unknown): void {
    this.logger.error(
      message,
      error instanceof Error ? error.stack : String(error),
    );
  }
}

function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
