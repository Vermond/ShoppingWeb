import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { resolve } from 'node:path';
import {
  createDatabaseClient,
  runSeeds,
  withDatabaseLock,
} from './db-runner.mjs';

const client = createDatabaseClient();

try {
  await client.connect();
  await runSeeds(client, resolve(import.meta.dirname, '..', 'sql', 'seeds'));
  await seedOptionalAdmin(client);
} catch (error) {
  console.error('Database seed failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}

async function seedOptionalAdmin(client) {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Administrator';

  if (!email && !password) {
    return;
  }

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL과 SEED_ADMIN_PASSWORD는 함께 설정해야 합니다.',
    );
  }

  const passwordHash = await hashPassword(password);

  await withDatabaseLock(client, async () => {
    await client.query('BEGIN');

    try {
      await client.query(
        `
          INSERT INTO auth.users (
            email, password_hash, "name", "role", status, email_verified
          )
          VALUES (lower($1), $2, $3, 'admin', 'active', true)
          ON CONFLICT DO NOTHING
        `,
        [email, passwordHash, name],
      );
      await client.query('COMMIT');
      console.log(`Applied optional admin seed: ${email}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

function hashPassword(password) {
  const salt = randomBytes(16);

  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      64,
      { N: 16_384, r: 8, p: 1 },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(
          [
            'scrypt',
            16_384,
            8,
            1,
            salt.toString('base64'),
            derivedKey.toString('base64'),
          ].join('$'),
        );
      },
    );
  });
}
