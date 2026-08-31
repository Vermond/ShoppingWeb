import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import { EmailVerificationRepository } from './email-verification.repository';

describe('EmailVerificationRepository', () => {
  it('stores a token hash and expiration as parameters', async () => {
    const { repository, query } = createRepository();
    const expiresAt = new Date('2099-01-01T00:00:00.000Z');

    await repository.create('user-id', 'token-hash', expiresAt);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auth.email_verification_tokens'),
      ['user-id', 'token-hash', expiresAt],
    );
    expect(query.mock.calls[0]?.[0]).not.toContain('token-hash');
  });

  it('locks token lookups and returns null for missing rows', async () => {
    const { repository, query } = createRepository();

    await expect(repository.findByHashForUpdate('hash')).resolves.toBeNull();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE token_hash = $1'),
      ['hash'],
    );
    expect(query.mock.calls[0]?.[0]).toContain('FOR UPDATE');
  });

  it('invalidates all active tokens and marks one token as used', async () => {
    const { repository, query } = createRepository();

    await repository.invalidateForUser('user-id');
    await repository.markUsed('token-id');

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE user_id = $1'),
      ['user-id'],
    );
    expect(query.mock.calls[0]?.[0]).toContain('used_at IS NULL');
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE id = $1'),
      ['token-id'],
    );
  });

  it('uses the supplied transaction executor', async () => {
    const { repository } = createRepository();
    const executor = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseQueryExecutor;

    await repository.findByHashForUpdate('hash', executor);

    expect(executor.query).toHaveBeenCalled();
  });
});

function createRepository() {
  const query = jest.fn().mockResolvedValue({ rows: [] });
  const databaseService = { query } as unknown as DatabaseService;

  return {
    repository: new EmailVerificationRepository(databaseService),
    query,
  };
}
