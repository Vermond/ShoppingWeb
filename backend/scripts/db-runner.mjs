import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const LOCK_KEY = 1_940_831_031;

export function createDatabaseClient(
  connectionString = process.env.DATABASE_URL,
) {
  if (!connectionString) {
    throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  }

  return new Client({ connectionString });
}

export function getIntegrationDatabaseUrl() {
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

  return connectionString;
}

export async function withDatabaseLock(client, callback) {
  await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);

  try {
    return await callback();
  } finally {
    await client
      .query('SELECT pg_advisory_unlock($1)', [LOCK_KEY])
      .catch(() => undefined);
  }
}

export async function listSqlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && /^\d+_.+\.sql$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));
}

export async function runMigrations(client, directory) {
  await withDatabaseLock(client, async () => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz DEFAULT now() NOT NULL
      )
    `);

    for (const fileName of await listSqlFiles(directory)) {
      const applied = await client.query(
        'SELECT 1 FROM public.schema_migrations WHERE version = $1',
        [fileName],
      );

      if (applied.rowCount === 1) {
        continue;
      }

      const sql = await readFile(resolve(directory, fileName), 'utf8');

      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO public.schema_migrations (version) VALUES ($1)',
          [fileName],
        );
        await client.query('COMMIT');
        console.log(`Applied migration: ${fileName}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  });
}

export async function runSeeds(client, directory) {
  await withDatabaseLock(client, async () => {
    await client.query('BEGIN');

    try {
      for (const fileName of await listSqlFiles(directory)) {
        const sql = await readFile(resolve(directory, fileName), 'utf8');
        await client.query(sql);
        console.log(`Applied seed: ${fileName}`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function resetManagedSchemas(client) {
  await withDatabaseLock(client, async () => {
    await client.query('BEGIN');

    try {
      await client.query(`
        DROP SCHEMA IF EXISTS auth, catalog, cart, sales, wishlist CASCADE
      `);
      await client.query('DROP TABLE IF EXISTS public.schema_migrations');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

function parseDatabaseTarget(connectionString) {
  let url;

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
