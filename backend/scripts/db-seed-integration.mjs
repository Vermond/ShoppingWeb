import { resolve } from 'node:path';
import {
  createDatabaseClient,
  getIntegrationDatabaseUrl,
  runSeeds,
} from './db-runner.mjs';

const client = createDatabaseClient(getIntegrationDatabaseUrl());

try {
  await client.connect();
  await runSeeds(client, resolve(import.meta.dirname, '..', 'sql', 'seeds'));
} catch (error) {
  console.error('Integration database seed failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
