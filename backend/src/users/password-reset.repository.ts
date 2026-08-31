import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';

export type PasswordResetTokenRecord = {
  id: string;
  user_id: string;
  expires_at: Date;
  used_at: Date | null;
};

const CREATE_TOKEN_QUERY = `
  INSERT INTO auth.password_reset_tokens
    (user_id, token_hash, expires_at)
  VALUES ($1, $2, $3)
`;

const FIND_TOKEN_BY_HASH_QUERY = `
  SELECT id, user_id, expires_at, used_at
  FROM auth.password_reset_tokens
  WHERE token_hash = $1
  FOR UPDATE
`;

const INVALIDATE_USER_TOKENS_QUERY = `
  UPDATE auth.password_reset_tokens
  SET used_at = COALESCE(used_at, now())
  WHERE user_id = $1
    AND used_at IS NULL
`;

const MARK_TOKEN_USED_QUERY = `
  UPDATE auth.password_reset_tokens
  SET used_at = now()
  WHERE id = $1
    AND used_at IS NULL
`;

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<void> {
    await executor.query(CREATE_TOKEN_QUERY, [userId, tokenHash, expiresAt]);
  }

  async findByHashForUpdate(
    tokenHash: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<PasswordResetTokenRecord | null> {
    const result = await executor.query<PasswordResetTokenRecord>(
      FIND_TOKEN_BY_HASH_QUERY,
      [tokenHash],
    );

    return result.rows[0] ?? null;
  }

  async invalidateForUser(
    userId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<void> {
    await executor.query(INVALIDATE_USER_TOKENS_QUERY, [userId]);
  }

  async markUsed(
    tokenId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<void> {
    await executor.query(MARK_TOKEN_USED_QUERY, [tokenId]);
  }
}
