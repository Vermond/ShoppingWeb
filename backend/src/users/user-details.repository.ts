import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type { UserAddressRecord } from './user-details.types';
import type { UpdateUserAddressInput } from './user-details.input';

const ADDRESS_COLUMNS = `
  id, user_id, recipient_name, phone_number, postal_code,
  address_line1, address_line2, is_default, created_at, updated_at
`;

const FIND_ADDRESSES_QUERY = `
  SELECT ${ADDRESS_COLUMNS}
  FROM auth.user_addresses
  WHERE user_id = $1
  ORDER BY is_default DESC, created_at DESC, id DESC
`;

const FIND_ADDRESS_QUERY = `
  SELECT ${ADDRESS_COLUMNS}
  FROM auth.user_addresses
  WHERE user_id = $1 AND id = $2
`;

const LOCK_USER_QUERY = `
  SELECT id
  FROM auth.users
  WHERE id = $1
  FOR UPDATE
`;

const CLEAR_DEFAULT_ADDRESS_QUERY = `
  UPDATE auth.user_addresses
  SET is_default = false,
      updated_at = now()
  WHERE user_id = $1 AND is_default = true
`;

const CREATE_ADDRESS_QUERY = `
  INSERT INTO auth.user_addresses (
    user_id, recipient_name, phone_number, postal_code,
    address_line1, address_line2, is_default
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING ${ADDRESS_COLUMNS}
`;

const UPDATE_ADDRESS_QUERY = `
  UPDATE auth.user_addresses
  SET recipient_name = COALESCE($3, recipient_name),
      phone_number = COALESCE($4, phone_number),
      postal_code = COALESCE($5, postal_code),
      address_line1 = COALESCE($6, address_line1),
      address_line2 = CASE
        WHEN $7 THEN $8
        ELSE address_line2
      END,
      is_default = COALESCE($9, is_default),
      updated_at = now()
  WHERE id = $1 AND user_id = $2
  RETURNING ${ADDRESS_COLUMNS}
`;

const DELETE_ADDRESS_QUERY = `
  DELETE FROM auth.user_addresses
  WHERE user_id = $1 AND id = $2
  RETURNING ${ADDRESS_COLUMNS}
`;

const PROMOTE_LATEST_ADDRESS_QUERY = `
  UPDATE auth.user_addresses
  SET is_default = true,
      updated_at = now()
  WHERE id = (
    SELECT id
    FROM auth.user_addresses
    WHERE user_id = $1 AND id <> $2
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  )
  RETURNING id
`;

type UserIdRow = { id: string };

@Injectable()
export class UserDetailsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAddressesByUserId(
    userId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<UserAddressRecord[]> {
    const result = await executor.query<UserAddressRecord>(
      FIND_ADDRESSES_QUERY,
      [userId],
    );

    return result.rows;
  }

  async findAddressById(
    userId: string,
    addressId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<UserAddressRecord | null> {
    const result = await executor.query<UserAddressRecord>(FIND_ADDRESS_QUERY, [
      userId,
      addressId,
    ]);

    return result.rows[0] ?? null;
  }

  async lockUser(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<boolean> {
    const result = await executor.query<UserIdRow>(LOCK_USER_QUERY, [userId]);

    return result.rows.length === 1;
  }

  async clearDefaultAddress(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    await executor.query(CLEAR_DEFAULT_ADDRESS_QUERY, [userId]);
  }

  async createAddress(
    userId: string,
    input: {
      recipient_name: string;
      phone_number: string;
      postal_code: string;
      address_line1: string;
      address_line2: string | null;
      is_default: boolean;
    },
    executor: DatabaseQueryExecutor,
  ): Promise<UserAddressRecord> {
    const result = await executor.query<UserAddressRecord>(
      CREATE_ADDRESS_QUERY,
      [
        userId,
        input.recipient_name,
        input.phone_number,
        input.postal_code,
        input.address_line1,
        input.address_line2,
        input.is_default,
      ],
    );
    const address = result.rows[0];

    if (!address) {
      throw new Error('배송지 생성 결과를 확인할 수 없습니다.');
    }

    return address;
  }

  async updateAddress(
    userId: string,
    addressId: string,
    input: UpdateUserAddressInput,
    executor: DatabaseQueryExecutor,
  ): Promise<UserAddressRecord | null> {
    const result = await executor.query<UserAddressRecord>(
      UPDATE_ADDRESS_QUERY,
      [
        addressId,
        userId,
        input.recipient_name ?? null,
        input.phone_number ?? null,
        input.postal_code ?? null,
        input.address_line1 ?? null,
        input.address_line2 !== undefined,
        input.address_line2 ?? null,
        input.is_default ?? null,
      ],
    );

    return result.rows[0] ?? null;
  }

  async deleteAddress(
    userId: string,
    addressId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<UserAddressRecord | null> {
    const result = await executor.query<UserAddressRecord>(
      DELETE_ADDRESS_QUERY,
      [userId, addressId],
    );

    return result.rows[0] ?? null;
  }

  async promoteLatestAddress(
    userId: string,
    excludedAddressId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<boolean> {
    const result = await executor.query<{ id: string }>(
      PROMOTE_LATEST_ADDRESS_QUERY,
      [userId, excludedAddressId],
    );

    return result.rows.length === 1;
  }
}
