import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import type {
  DatabaseQueryExecutor,
  DatabaseQueryValue,
} from '../../src/database/database.service';

type DatabaseTarget = {
  host: string;
  port: string;
  database: string;
};

export class IntegrationDatabase implements DatabaseQueryExecutor {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      max: 4,
    });
  }

  query<T extends QueryResultRow>(
    queryText: string,
    values?: DatabaseQueryValue[],
  ): Promise<QueryResult<T>> {
    if (values) {
      return this.pool.query<T>(queryText, values);
    }

    return this.pool.query<T>(queryText);
  }

  async transaction<T>(
    callback: (executor: DatabaseQueryExecutor) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
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
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createIntegrationDatabase(): IntegrationDatabase {
  validateIntegrationDatabaseEnvironment();

  return new IntegrationDatabase(process.env.INTEGRATION_DATABASE_URL!.trim());
}

export function validateIntegrationDatabaseEnvironment(): void {
  const connectionString = process.env.INTEGRATION_DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error(
      '실제 DB 통합 테스트에는 INTEGRATION_DATABASE_URL 환경변수가 필요합니다.',
    );
  }

  if (process.env.INTEGRATION_DB_ALLOW_WRITES !== 'true') {
    throw new Error(
      '통합 테스트 DB에 쓰려면 INTEGRATION_DB_ALLOW_WRITES=true가 필요합니다.',
    );
  }

  const integrationTarget = parseDatabaseTarget(connectionString);
  const applicationUrl = process.env.DATABASE_URL?.trim();

  if (applicationUrl) {
    const applicationTarget = parseDatabaseTarget(applicationUrl);

    if (
      integrationTarget.host === applicationTarget.host &&
      integrationTarget.port === applicationTarget.port &&
      integrationTarget.database === applicationTarget.database
    ) {
      throw new Error(
        'INTEGRATION_DATABASE_URL은 DATABASE_URL과 다른 데이터베이스여야 합니다.',
      );
    }
  }

  if (
    !/(^|[-_])(test|integration|ci)([-_]|$)/i.test(integrationTarget.database)
  ) {
    throw new Error(
      '통합 테스트 DB 이름에는 test, integration 또는 ci가 포함되어야 합니다.',
    );
  }
}

export async function assertRequiredSchema(
  database: IntegrationDatabase,
): Promise<void> {
  const result = await database.query<{
    table_schema: string;
    table_name: string;
  }>(
    `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema IN ('auth', 'catalog', 'cart', 'sales', 'wishlist')
        AND table_type = 'BASE TABLE'
    `,
  );
  const actual = new Set(
    result.rows.map((row) => `${row.table_schema}.${row.table_name}`),
  );
  const required = [
    'auth.users',
    'auth.refresh_tokens',
    'auth.email_verification_tokens',
    'auth.password_reset_tokens',
    'auth.user_addresses',
    'catalog.categories',
    'catalog.products',
    'catalog.product_images',
    'cart.carts',
    'cart.cart_items',
    'sales.orders',
    'sales.order_items',
    'sales.order_addresses',
    'sales.shipping_policy',
    'sales.order_status_history',
    'wishlist.wishlist_items',
  ];

  const missing = required.filter((table) => !actual.has(table));

  if (missing.length > 0) {
    throw new Error(
      `통합 테스트 DB의 스키마가 준비되지 않았습니다. 누락: ${missing.join(', ')}`,
    );
  }
}

function parseDatabaseTarget(connectionString: string): DatabaseTarget {
  let url: URL;

  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('PostgreSQL 연결 URL 형식이 올바르지 않습니다.');
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('PostgreSQL 연결 URL이어야 합니다.');
  }

  return {
    host: url.hostname,
    port: url.port || '5432',
    database: decodeURIComponent(url.pathname.replace(/^\/+/, '')),
  };
}
