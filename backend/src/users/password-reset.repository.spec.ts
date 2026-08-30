import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import { PasswordResetRepository } from './password-reset.repository';

describe('PasswordResetRepository', () => {
  it('creates and locks reset tokens with explicit columns', async () => {
    const databaseService = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseService;
    const executor = databaseService as unknown as DatabaseQueryExecutor;
    const repository = new PasswordResetRepository(databaseService);
    const expiresAt = new Date('2026-01-01T00:30:00.000Z');

    await repository.create('user-1', 'token-hash', expiresAt, executor);
    await expect(
      repository.findByHashForUpdate('token-hash', executor),
    ).resolves.toBeNull();

    expect(databaseService.query).toHaveBeenCalledTimes(2);
    expect(databaseService.query.mock.calls[0]?.[0]).toContain(
      'INSERT INTO auth.password_reset_tokens',
    );
    expect(databaseService.query.mock.calls[0]?.[1]).toEqual([
      'user-1',
      'token-hash',
      expiresAt,
    ]);
    expect(databaseService.query.mock.calls[1]?.[0]).toContain('FOR UPDATE');
  });

  it('invalidates tokens only once and marks a token as used', async () => {
    const databaseService = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseService;
    const repository = new PasswordResetRepository(databaseService);

    await repository.invalidateForUser('user-1');
    await repository.markUsed('token-1');

    expect(databaseService.query.mock.calls[0]?.[0]).toContain(
      'used_at = COALESCE(used_at, now())',
    );
    expect(databaseService.query.mock.calls[1]?.[0]).toContain(
      'SET used_at = now()',
    );
  });
});
