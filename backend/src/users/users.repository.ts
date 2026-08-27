import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type UserRecord = Record<string, unknown> & {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

const USER_COLUMNS = `
  id, email, "name", "role", status, created_at, updated_at
`;

const CREATE_USER_QUERY = `
  INSERT INTO auth.users (email, password_hash, "name")
  VALUES ($1, $2, $3)
  RETURNING ${USER_COLUMNS}
`;

const UPDATE_USER_QUERY = `
  UPDATE auth.users
  SET email = COALESCE($2, email),
      "name" = COALESCE($3, "name"),
      password_hash = COALESCE($4, password_hash),
      updated_at = now()
  WHERE id = $1
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
  ): Promise<UserRecord> {
    const result = await this.databaseService.query<UserRecord>(
      CREATE_USER_QUERY,
      [email, passwordHash, name],
    );

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
    },
  ): Promise<UserRecord | null> {
    const result = await this.databaseService.query<UserRecord>(
      UPDATE_USER_QUERY,
      [id, input.email ?? null, input.name ?? null, input.passwordHash ?? null],
    );

    return result.rows[0] ?? null;
  }

  async withdraw(id: string): Promise<UserRecord | null> {
    const result = await this.databaseService.query<UserRecord>(
      WITHDRAW_USER_QUERY,
      [id],
    );

    return result.rows[0] ?? null;
  }
}
