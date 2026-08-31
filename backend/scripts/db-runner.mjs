import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const LOCK_KEY = 1_940_831_031;

export function createDatabaseClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL 환경변수가 필요합니다.');
  }

  return new Client({ connectionString });
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
