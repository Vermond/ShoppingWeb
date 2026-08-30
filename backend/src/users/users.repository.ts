import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type { StoredUserRecord, UserRecord } from './users.types';

const USER_COLUMNS = `
  id, email, "name", "role", status, email_verified, created_at, updated_at
`;

const USER_COLUMNS_WITH_PASSWORD = `
  ${USER_COLUMNS}, password_hash
`;

const CREATE_USER_QUERY = `
  INSERT INTO auth.users (email, password_hash, "name", email_verified)
  VALUES (lower($1), $2, $3, false)
  RETURNING ${USER_COLUMNS}
`;

const UPDATE_USER_QUERY = `
  UPDATE auth.users
  SET email = COALESCE(lower($2), email),
      "name" = COALESCE($3, "name"),
      password_hash = COALESCE($4, password_hash),
      email_verified = CASE WHEN $5 THEN false ELSE email_verified END,
      updated_at = now()
  WHERE id = $1
  RETURNING ${USER_COLUMNS}
`;

const UPDATE_PASSWORD_QUERY = `
  UPDATE auth.users
  SET password_hash = $2,
      updated_at = now()
  WHERE id = $1
  RETURNING ${USER_COLUMNS}
`;

const FIND_USER_BY_ID_QUERY = `
  SELECT ${USER_COLUMNS}
  FROM auth.users
  WHERE id = $1
`;

const FIND_USER_BY_ID_WITH_PASSWORD_QUERY = `
  SELECT ${USER_COLUMNS_WITH_PASSWORD}
  FROM auth.users
  WHERE id = $1
  FOR UPDATE
`;

const FIND_USER_BY_EMAIL_QUERY = `
  SELECT ${USER_COLUMNS_WITH_PASSWORD}
  FROM auth.users
  WHERE lower(email) = lower($1)
`;

const VERIFY_USER_EMAIL_QUERY = `
  UPDATE auth.users
  SET email_verified = true,
      updated_at = now()
  WHERE id = $1
    AND status = 'active'
  RETURNING ${USER_COLUMNS}
`;

const WITHDRAW_USER_QUERY = `
  UPDATE auth.users
  SET status = 'withdrawn',
      updated_at = now()
  WHERE id = $1
  RETURNING ${USER_COLUMNS}
`;

@Injectable()
export class UsersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(
    email: string,
    passwordHash: string,
    name: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<UserRecord> {
    const result = await executor.query<UserRecord>(CREATE_USER_QUERY, [
      email,
      passwordHash,
      name,
    ]);

    const user = result.rows[0];

    if (!user) {
      throw new Error('사용자 생성 결과를 확인할 수 없습니다.');
    }

    return user;
  }

  async update(
    id: string,
    input: {
      email?: string;
      passwordHash?: string;
      name?: string;
      emailChanged?: boolean;
    },
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<UserRecord | null> {
    const result = await executor.query<UserRecord>(UPDATE_USER_QUERY, [
      id,
      input.email ?? null,
      input.name ?? null,
      input.passwordHash ?? null,
      input.emailChanged ?? false,
    ]);

    return result.rows[0] ?? null;
  }

  async updatePassword(
    id: string,
    passwordHash: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<UserRecord | null> {
    const result = await executor.query<UserRecord>(UPDATE_PASSWORD_QUERY, [
      id,
      passwordHash,
    ]);

    return result.rows[0] ?? null;
  }

  async findById(
    id: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<UserRecord | null> {
    const result = await executor.query<UserRecord>(FIND_USER_BY_ID_QUERY, [
      id,
    ]);

    return result.rows[0] ?? null;
  }

  async findByIdWithPassword(
    id: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<StoredUserRecord | null> {
    const result = await executor.query<StoredUserRecord>(
      FIND_USER_BY_ID_WITH_PASSWORD_QUERY,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async findByEmail(
    email: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<StoredUserRecord | null> {
    const result = await executor.query<StoredUserRecord>(
      FIND_USER_BY_EMAIL_QUERY,
      [email],
    );

    return result.rows[0] ?? null;
  }

  async markEmailVerified(
    id: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<UserRecord | null> {
    const result = await executor.query<UserRecord>(VERIFY_USER_EMAIL_QUERY, [
      id,
    ]);

    return result.rows[0] ?? null;
  }

  async withdraw(
    id: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<UserRecord | null> {
    const result = await executor.query<UserRecord>(WITHDRAW_USER_QUERY, [id]);

    return result.rows[0] ?? null;
  }
}
