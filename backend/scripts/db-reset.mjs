import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createDatabaseClient, resetManagedSchemas } from './db-runner.mjs';

if (!process.argv.includes('--confirm')) {
  throw new Error(
    '모든 애플리케이션 데이터를 삭제하려면 db:reset -- --confirm을 사용해야 합니다.',
  );
}

const client = createDatabaseClient();

try {
  await client.connect();
  await resetManagedSchemas(client);
  console.log('Managed database schemas were reset.');
} finally {
  await client.end().catch(() => undefined);
}

const scriptsDirectory = resolve(import.meta.dirname);
const childEnvironment = { ...process.env };

execFileSync(process.execPath, [resolve(scriptsDirectory, 'db-migrate.mjs')], {
  stdio: 'inherit',
  env: childEnvironment,
});
execFileSync(process.execPath, [resolve(scriptsDirectory, 'db-seed.mjs')], {
  stdio: 'inherit',
  env: childEnvironment,
});
