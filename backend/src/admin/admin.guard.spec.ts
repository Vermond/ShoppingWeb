import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.decorators';
import type { UserRecord } from '../users/users.types';
import { AdminGuard } from './admin.guard';

const admin: UserRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  name: 'Admin',
  role: 'admin',
  status: 'active',
  email_verified: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

describe('AdminGuard', () => {
  it('allows an administrator', () => {
    const guard = new AdminGuard();

    expect(guard.canActivate(createContext(admin))).toBe(true);
  });

  it('rejects a non-administrator', () => {
    const guard = new AdminGuard();

    expect(() =>
      guard.canActivate(createContext({ ...admin, role: 'user' })),
    ).toThrow(ForbiddenException);
  });
});

function createContext(user?: UserRecord): ExecutionContext {
  const request = { user } as AuthenticatedRequest;

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}
