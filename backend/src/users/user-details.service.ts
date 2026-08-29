import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type {
  CreateUserAddressInput,
  UpdateUserAddressInput,
  UpdateUserProfileInput,
} from './user-details.input';
import { UserDetailsRepository } from './user-details.repository';
import type {
  UserAddressRecord,
  UserProfileRecord,
} from './user-details.types';

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return error.code === '23505';
}

@Injectable()
export class UserDetailsService {
  private readonly logger = new Logger(UserDetailsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly repository: UserDetailsRepository,
  ) {}

  async findProfile(userId: string): Promise<UserProfileRecord> {
    return this.withDatabaseError(
      '사용자 프로필 조회에 실패했습니다.',
      async () => {
        const profile = await this.repository.findProfileByUserId(userId);

        if (!profile) {
          throw new NotFoundException({
            code: 'USER_PROFILE_NOT_FOUND',
            message: '사용자 프로필을 찾을 수 없습니다.',
          });
        }

        return profile;
      },
    );
  }

  async saveProfile(
    userId: string,
    input: UpdateUserProfileInput,
  ): Promise<UserProfileRecord> {
    return this.withDatabaseError('사용자 프로필 저장에 실패했습니다.', () =>
      this.repository.upsertProfile(userId, input.phone_number),
    );
  }

  async findAddresses(userId: string): Promise<UserAddressRecord[]> {
    return this.withDatabaseError('배송지 목록 조회에 실패했습니다.', () =>
      this.repository.findAddressesByUserId(userId),
    );
  }

  async createAddress(
    userId: string,
    input: CreateUserAddressInput,
  ): Promise<UserAddressRecord> {
    return this.withDatabaseError('배송지 생성에 실패했습니다.', async () =>
      this.databaseService.transaction(async (executor) => {
        await this.lockUser(userId, executor);
        const addresses = await this.repository.findAddressesByUserId(
          userId,
          executor,
        );
        const shouldBeDefault =
          input.is_default || !addresses.some((address) => address.is_default);

        if (shouldBeDefault) {
          await this.repository.clearDefaultAddress(userId, executor);
        }

        return this.repository.createAddress(
          userId,
          { ...input, is_default: shouldBeDefault },
          executor,
        );
      }),
    );
  }

  async updateAddress(
    userId: string,
    addressId: string,
    input: UpdateUserAddressInput,
  ): Promise<UserAddressRecord> {
    return this.withDatabaseError('배송지 수정에 실패했습니다.', async () =>
      this.databaseService.transaction(async (executor) => {
        await this.lockUser(userId, executor);
        const current = await this.requireAddress(userId, addressId, executor);

        if (input.is_default === true) {
          await this.repository.clearDefaultAddress(userId, executor);
        }

        if (input.is_default === false && current.is_default) {
          const updated = await this.repository.updateAddress(
            userId,
            addressId,
            input,
            executor,
          );

          if (!updated) {
            throw new NotFoundException({
              code: 'ADDRESS_NOT_FOUND',
              message: '배송지를 찾을 수 없습니다.',
            });
          }

          const promoted = await this.repository.promoteLatestAddress(
            userId,
            addressId,
            executor,
          );

          if (!promoted) {
            throw new ConflictException({
              code: 'DEFAULT_ADDRESS_REQUIRED',
              message:
                '배송지가 하나 이상 있을 때 기본 배송지를 해제할 수 없습니다.',
            });
          }

          return updated;
        }

        const updated = await this.repository.updateAddress(
          userId,
          addressId,
          input,
          executor,
        );

        if (!updated) {
          throw new NotFoundException({
            code: 'ADDRESS_NOT_FOUND',
            message: '배송지를 찾을 수 없습니다.',
          });
        }

        return updated;
      }),
    );
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await this.withDatabaseError('배송지 삭제에 실패했습니다.', async () =>
      this.databaseService.transaction(async (executor) => {
        await this.lockUser(userId, executor);
        const current = await this.requireAddress(userId, addressId, executor);
        const deleted = await this.repository.deleteAddress(
          userId,
          addressId,
          executor,
        );

        if (!deleted) {
          throw new NotFoundException({
            code: 'ADDRESS_NOT_FOUND',
            message: '배송지를 찾을 수 없습니다.',
          });
        }

        if (current.is_default) {
          await this.repository.promoteLatestAddress(
            userId,
            addressId,
            executor,
          );
        }
      }),
    );
  }

  private async lockUser(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    const locked = await this.repository.lockUser(userId, executor);

    if (!locked) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.',
      });
    }
  }

  private async requireAddress(
    userId: string,
    addressId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<UserAddressRecord> {
    const address = await this.repository.findAddressById(
      userId,
      addressId,
      executor,
    );

    if (!address) {
      throw new NotFoundException({
        code: 'ADDRESS_NOT_FOUND',
        message: '배송지를 찾을 수 없습니다.',
      });
    }

    return address;
  }

  private async withDatabaseError<T>(
    message: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'DEFAULT_ADDRESS_CONFLICT',
          message: '기본 배송지 처리 중 충돌이 발생했습니다.',
        });
      }

      this.logger.error(
        message,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        '사용자 추가 정보를 처리하지 못했습니다.',
      );
    }
  }
}
