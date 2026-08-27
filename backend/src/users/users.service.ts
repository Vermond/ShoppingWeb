import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PasswordService } from './password.service';
import { UsersRepository } from './users.repository';
import type { UserRecord } from './users.repository';
import type { CreateUserInput, UpdateUserInput } from './users.input';

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
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      const passwordHash = await this.passwordService.hash(input.password);

      return await this.usersRepository.create(
        input.email,
        passwordHash,
        input.name,
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
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
      const user = await this.usersRepository.update(id, {
        email: input.email,
        name: input.name,
        passwordHash,
      });

      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
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
      const user = await this.usersRepository.withdraw(id);

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

  private logError(message: string, error: unknown): void {
    this.logger.error(
      message,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
