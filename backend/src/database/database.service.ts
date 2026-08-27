import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';

export type DatabaseQueryValue =
  string | number | boolean | Date | Buffer | null;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool?: Pool;

  async query<T extends QueryResultRow>(
    queryText: string,
    values?: DatabaseQueryValue[],
  ): Promise<QueryResult<T>> {
    if (values) {
      return this.getPool().query<T>(queryText, values);
    }

    return this.getPool().query<T>(queryText);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  private getPool(): Pool {
    if (this.pool) {
      return this.pool;
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      max: 10,
    });

    return this.pool;
  }
}
