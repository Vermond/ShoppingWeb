import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';

export type RefreshTokenRecord = Record<string, unknown> & {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  last_used_at: Date | null;
};

const CREATE_REFRESH_TOKEN_QUERY = `
  INSERT INTO auth.refresh_tokens
    (id, user_id, token_hash, expires_at)
  VALUES ($1, $2, $3, $4)
`;

const FIND_REFRESH_TOKEN_QUERY = `
  SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, last_used_at
  FROM auth.refresh_tokens
  WHERE id = $1
    AND token_hash = $2
  FOR UPDATE
`;

const FIND_REFRESH_TOKEN_BY_HASH_QUERY = `
  SELECT id, user_id, token_hash, expires_at, revoked_at, created_at, last_used_at
  FROM auth.refresh_tokens
  WHERE token_hash = $1
  FOR UPDATE
`;

const REVOKE_REFRESH_TOKEN_QUERY = `
  UPDATE auth.refresh_tokens
  SET revoked_at = COALESCE(revoked_at, now()),
      last_used_at = now()
  WHERE id = $1
`;

const REVOKE_ALL_USER_REFRESH_TOKENS_QUERY = `
  UPDATE auth.refresh_tokens
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE user_id = $1
    AND revoked_at IS NULL
`;

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(
    id: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<void> {
    await executor.query(CREATE_REFRESH_TOKEN_QUERY, [
      id,
      userId,
      tokenHash,
      expiresAt,
    ]);
  }

  async findByIdAndHashForUpdate(
    id: string,
    tokenHash: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<RefreshTokenRecord | null> {
    const result = await executor.query<RefreshTokenRecord>(
      FIND_REFRESH_TOKEN_QUERY,
      [id, tokenHash],
    );

    return result.rows[0] ?? null;
  }

  async findByHashForUpdate(
    tokenHash: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<RefreshTokenRecord | null> {
    const result = await executor.query<RefreshTokenRecord>(
      FIND_REFRESH_TOKEN_BY_HASH_QUERY,
      [tokenHash],
    );

    return result.rows[0] ?? null;
  }

  async revoke(
    id: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<void> {
    await executor.query(REVOKE_REFRESH_TOKEN_QUERY, [id]);
  }

  async revokeAllForUser(
    userId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<void> {
    await executor.query(REVOKE_ALL_USER_REFRESH_TOKENS_QUERY, [userId]);
  }
}
