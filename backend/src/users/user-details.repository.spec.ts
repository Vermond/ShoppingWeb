import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import { UserDetailsRepository } from './user-details.repository';

const userId = '11111111-1111-4111-8111-111111111111';
const addressId = '22222222-2222-4222-8222-222222222222';

describe('UserDetailsRepository', () => {
  it('queries and maps a profile using explicit columns', async () => {
    const row = {
      user_id: userId,
      phone_number: '01012345678',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z'),
    };
    const executor = {
      query: jest.fn().mockResolvedValue({ rows: [row] }),
    } as unknown as DatabaseQueryExecutor;
    const repository = new UserDetailsRepository(
      executor as unknown as DatabaseService,
    );

    await expect(
      repository.findProfileByUserId(userId, executor),
    ).resolves.toEqual(row);

    const query = executor.query.mock.calls[0]?.[0] as string;
    expect(query).toContain('FROM auth.user_profiles');
    expect(query).not.toMatch(/SELECT\s+\*/i);
    expect(executor.query).toHaveBeenCalledWith(expect.any(String), [userId]);
  });

  it('returns only addresses owned by the requested user', async () => {
    const row = {
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
    const executor = {
      query: jest.fn().mockResolvedValue({ rows: [row] }),
    } as unknown as DatabaseQueryExecutor;
    const repository = new UserDetailsRepository(
      executor as unknown as DatabaseService,
    );

    await expect(
      repository.findAddressById(userId, addressId, executor),
    ).resolves.toEqual(row);

    expect(executor.query).toHaveBeenCalledWith(expect.any(String), [
      userId,
      addressId,
    ]);
    expect(executor.query.mock.calls[0]?.[0]).toContain(
      'WHERE user_id = $1 AND id = $2',
    );
  });
});
