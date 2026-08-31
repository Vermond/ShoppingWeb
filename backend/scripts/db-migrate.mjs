import { resolve } from 'node:path';
import { createDatabaseClient, runMigrations } from './db-runner.mjs';

const client = createDatabaseClient();

try {
  await client.connect();
  await runMigrations(client, resolve(import.meta.dirname, '..', 'sql'));
} catch (error) {
  console.error('Database migration failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
