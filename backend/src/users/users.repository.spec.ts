import type { DatabaseService } from '../database/database.service';
import { UsersRepository, type UserRecord } from './users.repository';

const user: UserRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  name: 'User',
  role: 'customer',
  status: 'active',
  email_verified: false,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

describe('UsersRepository', () => {
  it('creates a user with email verification disabled', async () => {
    const { repository, query } = createRepository([{ rows: [user] }]);

    await expect(
      repository.create(user.email, 'password-hash', user.name),
    ).resolves.toBe(user);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO auth.users'),
      [user.email, 'password-hash', user.name],
    );
    expect(query.mock.calls[0]?.[0]).toContain('email_verified');
  });

  it('updates user fields and resets verification when requested', async () => {
    const { repository, query } = createRepository([{ rows: [user] }]);

    await repository.update(user.id, {
      email: 'new@example.com',
      name: 'New User',
      passwordHash: 'new-password-hash',
      emailChanged: true,
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE auth.users'),
      [user.id, 'new@example.com', 'New User', 'new-password-hash', true],
    );
    expect(query.mock.calls[0]?.[0]).toContain('email_verified = CASE');
    expect(query.mock.calls[0]?.[0]).toContain('updated_at = now()');
  });

  it('returns null when lookup or update returns no rows', async () => {
    const { repository } = createRepository([{ rows: [] }]);

    await expect(repository.findById(user.id)).resolves.toBeNull();
    await expect(repository.findByEmail(user.email)).resolves.toBeNull();
    await expect(repository.update(user.id, {})).resolves.toBeNull();
    await expect(repository.markEmailVerified(user.id)).resolves.toBeNull();
    await expect(repository.withdraw(user.id)).resolves.toBeNull();
  });

  it('uses parameterized lookups and excludes the password from public records', async () => {
    const { repository, query } = createRepository([{ rows: [user] }]);

    await repository.findById(user.id);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1'),
      [user.id],
    );
    expect(query.mock.calls[0]?.[0]).not.toContain('password_hash');

    query.mockResolvedValueOnce({ rows: [{ ...user, password_hash: 'hash' }] });
    await repository.findByEmail(user.email);
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('WHERE email = $1'),
      [user.email],
    );
    expect(query.mock.calls[1]?.[0]).toContain('password_hash');
  });

  it('passes the executor through transactional operations', async () => {
    const { repository } = createRepository([{ rows: [user] }]);
    const executor = { query: jest.fn().mockResolvedValue({ rows: [user] }) };

    await repository.findById(user.id, executor);

    expect(executor.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1'),
      [user.id],
    );
  });
});

function createRepository(results: Array<{ rows: unknown[] }>) {
  const query = jest.fn().mockResolvedValue({ rows: [] });
  for (const result of results) {
    query.mockResolvedValueOnce(result);
  }
  const databaseService = { query } as unknown as DatabaseService;

  return { repository: new UsersRepository(databaseService), query };
}
