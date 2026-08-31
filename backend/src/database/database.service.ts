import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import type { EnvironmentVariables } from '../config/environment.validation';

export type DatabaseQueryValue =
  string | number | boolean | Date | Buffer | null;

export interface DatabaseQueryExecutor {
  query<T extends QueryResultRow>(
    queryText: string,
    values?: DatabaseQueryValue[],
  ): Promise<QueryResult<T>>;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool?: Pool;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async query<T extends QueryResultRow>(
    queryText: string,
    values?: DatabaseQueryValue[],
  ): Promise<QueryResult<T>> {
    if (values) {
      return this.getPool().query<T>(queryText, values);
    }

    return this.getPool().query<T>(queryText);
  }

  async transaction<T>(
    callback: (executor: DatabaseQueryExecutor) => Promise<T>,
  ): Promise<T> {
    const client = await this.getPool().connect();
    const executor: DatabaseQueryExecutor = {
      query: <R extends QueryResultRow>(
        queryText: string,
        values?: DatabaseQueryValue[],
      ) =>
        values
          ? client.query<R>(queryText, values)
          : client.query<R>(queryText),
    };

    try {
      await client.query('BEGIN');
      const result = await callback(executor);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Keep the original database error as the one reported to the caller.
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async checkConnection(): Promise<void> {
    await this.query('SELECT 1');
  }

  private getPool(): Pool {
    if (this.pool) {
      return this.pool;
    }

    this.pool = new Pool({
      connectionString: this.configService.getOrThrow<string>('DATABASE_URL'),
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      max: 10,
    });
    this.pool.on('error', (error) => {
      this.logger.error(
        'PostgreSQL 유휴 연결에서 오류가 발생했습니다.',
        error instanceof Error ? error.stack : String(error),
      );
    });

    return this.pool;
  }
}
