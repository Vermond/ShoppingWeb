import { ConflictException, NotFoundException } from '@nestjs/common';
import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import { UserDetailsRepository } from './user-details.repository';
import { UserDetailsService } from './user-details.service';
import type { UserAddressRecord } from './user-details.types';

const userId = '11111111-1111-4111-8111-111111111111';
const addressId = '22222222-2222-4222-8222-222222222222';
const otherAddressId = '33333333-3333-4333-8333-333333333333';

const address: UserAddressRecord = {
  id: addressId,
  user_id: userId,
  recipient_name: '홍길동',
  phone_number: '01012345678',
  postal_code: '06236',
  address_line1: '서울특별시 강남구 테헤란로 1',
  address_line2: null,
  is_default: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-02T00:00:00.000Z'),
};

function createService() {
  const executor = {} as DatabaseQueryExecutor;
  const repository = {
    findAddressesByUserId: jest.fn().mockResolvedValue([address]),
    findAddressById: jest.fn().mockResolvedValue(address),
    lockUser: jest.fn().mockResolvedValue(true),
    clearDefaultAddress: jest.fn().mockResolvedValue(undefined),
    createAddress: jest.fn().mockResolvedValue(address),
    updateAddress: jest.fn().mockResolvedValue(address),
    deleteAddress: jest.fn().mockResolvedValue(address),
    promoteLatestAddress: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<UserDetailsRepository>;
  const databaseService = {
    transaction: jest.fn(
      (
        callback: (
          transactionExecutor: DatabaseQueryExecutor,
        ) => Promise<unknown>,
      ) => callback(executor),
    ),
  } as unknown as DatabaseService;

  return {
    service: new UserDetailsService(databaseService, repository),
    repository,
  };
}

describe('UserDetailsService', () => {
  it('makes the first address the default address', async () => {
    const { service, repository } = createService();
    repository.findAddressesByUserId.mockResolvedValue([]);

    await service.createAddress(userId, {
      recipient_name: '홍길동',
      phone_number: '01012345678',
      postal_code: '06236',
      address_line1: '주소',
      address_line2: null,
      is_default: false,
    });

    expect(repository.createAddress).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ is_default: true }),
      expect.anything(),
    );
  });

  it('promotes another address before unsetting the current default', async () => {
    const { service, repository } = createService();
    repository.updateAddress.mockResolvedValue({
      ...address,
      is_default: false,
    });

    await service.updateAddress(userId, addressId, { is_default: false });

    expect(repository.updateAddress).toHaveBeenCalledWith(
      userId,
      addressId,
      { is_default: false },
      expect.anything(),
    );
    expect(repository.promoteLatestAddress).toHaveBeenCalledWith(
      userId,
      addressId,
      expect.anything(),
    );
    expect(repository.updateAddress.mock.invocationCallOrder[0]).toBeLessThan(
      repository.promoteLatestAddress.mock.invocationCallOrder[0],
    );
  });

  it('does not allow removing the only default address', async () => {
    const { service, repository } = createService();
    repository.promoteLatestAddress.mockResolvedValue(false);

    await expect(
      service.updateAddress(userId, addressId, { is_default: false }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('promotes another address when the default address is deleted', async () => {
    const { service, repository } = createService();

    await service.deleteAddress(userId, addressId);

    expect(repository.promoteLatestAddress).toHaveBeenCalledWith(
      userId,
      addressId,
      expect.anything(),
    );
  });

  it('returns not found for an address that does not exist', async () => {
    const { service, repository } = createService();
    repository.findAddressById.mockResolvedValue(null);

    await expect(
      service.updateAddress(userId, otherAddressId, {
        recipient_name: '새 이름',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
