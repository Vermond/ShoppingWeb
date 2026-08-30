import { serializeUser, type UserRecord } from './users.types';

const user: UserRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  name: 'User',
  role: 'user',
  status: 'active',
  email_verified: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-02T00:00:00.000Z'),
};

describe('serializeUser', () => {
  it('serializes timestamps as ISO strings and excludes stored fields', () => {
    const storedUser = { ...user, password_hash: 'secret' };
    const response = serializeUser(storedUser);

    expect(response).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      email_verified: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });
    expect(response).not.toHaveProperty('password_hash');
  });
});
