import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import { RefreshTokenRepository } from './refresh-token.repository';

describe('RefreshTokenRepository', () => {
  it('creates a refresh token record with parameterized values', async () => {
    const { repository, query } = createRepository();
    const expiresAt = new Date('2099-01-01T00:00:00.000Z');

    await repository.create(
      'token-id',
      'user-id',
      'session-id',
      'token-hash',
      expiresAt,
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auth.refresh_tokens'),
      ['token-id', 'user-id', 'session-id', 'token-hash', expiresAt],
    );
    expect(query.mock.calls[0]?.[0]).not.toContain('token-hash');
  });

  it('locks refresh token lookups by id/hash or hash', async () => {
    const { repository, query } = createRepository();

    await repository.findByIdAndHashForUpdate('token-id', 'hash');
    await repository.findByHashForUpdate('hash');

    expect(query.mock.calls[0]?.[0]).toContain('WHERE id = $1');
    expect(query.mock.calls[0]?.[0]).toContain('AND token_hash = $2');
    expect(query.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE token_hash = $1'),
      ['hash'],
    );
  });

  it('revokes one token, all active tokens for a user, or a session', async () => {
    const { repository, query } = createRepository();

    await repository.revoke('token-id');
    await repository.revokeAllForUser('user-id');
    await repository.revokeAllForSession('session-id');

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE id = $1'),
      ['token-id'],
    );
    expect(query.mock.calls[0]?.[0]).toContain('revoked_at = COALESCE');
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE user_id = $1'),
      ['user-id'],
    );
    expect(query.mock.calls[1]?.[0]).toContain('revoked_at IS NULL');
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('WHERE session_id = $1'),
      ['session-id'],
    );
    expect(query.mock.calls[2]?.[0]).toContain('revoked_at IS NULL');
  });

  it('uses the supplied transaction executor', async () => {
    const { repository } = createRepository();
    const executor = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseQueryExecutor;

    await repository.revoke('token-id', executor);

    expect(executor.query).toHaveBeenCalled();
  });
});

function createRepository() {
  const query = jest.fn().mockResolvedValue({ rows: [] });
  const databaseService = { query } as unknown as DatabaseService;

  return { repository: new RefreshTokenRepository(databaseService), query };
}
