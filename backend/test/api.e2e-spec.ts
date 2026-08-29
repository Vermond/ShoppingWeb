import { Test, TestingModule } from '@nestjs/testing';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AuthService } from './../src/auth/auth.service';
import { AccessTokenGuard } from './../src/auth/access-token.guard';
import type { AuthenticatedRequest } from './../src/auth/auth.decorators';
import { CategoriesService } from './../src/categories/categories.service';
import { DatabaseService } from './../src/database/database.service';
import { EmailVerificationService } from './../src/users/email-verification.service';
import { ProductsService } from './../src/products/products.service';
import { RateLimitGuard } from './../src/rate-limit/rate-limit.guard';
import type { UserRecord } from './../src/users/users.types';
import { UsersService } from './../src/users/users.service';
import Decimal from 'decimal.js';
import type { ProductRecord } from './../src/products/products.types';
import type { CategoryRow } from './../src/categories/categories.types';

const user: UserRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  name: 'User',
  role: 'customer',
  status: 'active',
  email_verified: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

const serializedUser = {
  ...user,
  created_at: user.created_at.toISOString(),
  updated_at: user.updated_at.toISOString(),
};

const product: ProductRecord = {
  id: '11111111-1111-4111-8111-111111111112',
  category_id: '1',
  name: 'Product',
  description: null,
  price: new Decimal('12900.00'),
  stock: 3,
  status: 'active',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

const serializedProduct = {
  ...product,
  price: '12900.00',
  created_at: product.created_at.toISOString(),
  updated_at: product.updated_at.toISOString(),
};

const category: CategoryRow = {
  id: '1',
  name: 'Category',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

const serializedCategory = {
  ...category,
  created_at: category.created_at.toISOString(),
  updated_at: category.updated_at.toISOString(),
};

describe('API contracts (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let client: ReturnType<typeof createClient>;
  let databaseService: { checkConnection: jest.Mock };
  let productsService: { findPage: jest.Mock };
  let categoriesService: { findAll: jest.Mock };
  let usersService: {
    create: jest.Mock;
    update: jest.Mock;
    withdraw: jest.Mock;
  };
  let authService: {
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };
  let emailVerificationService: {
    verify: jest.Mock;
    resend: jest.Mock;
  };
  let databaseReady = true;

  beforeAll(async () => {
    databaseService = { checkConnection: jest.fn() };
    productsService = {
      findPage: jest.fn().mockResolvedValue({
        products: [],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    };
    categoriesService = { findAll: jest.fn().mockResolvedValue([]) };
    usersService = {
      create: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue(user),
      withdraw: jest.fn().mockResolvedValue({ ...user, status: 'withdrawn' }),
    };
    authService = {
      login: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user,
      }),
      refresh: jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user,
      }),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    emailVerificationService = {
      verify: jest.fn().mockResolvedValue({ status: 'verified' }),
      resend: jest.fn().mockResolvedValue({ status: 'sent' }),
    };

    const accessTokenGuard = {
      canActivate: (context: ExecutionContext): boolean => {
        const request = context
          .switchToHttp()
          .getRequest<AuthenticatedRequest>();
        request.user = user;
        return true;
      },
    };
    const allowRateLimitGuard = { canActivate: () => true };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue(databaseService)
      .overrideProvider(ProductsService)
      .useValue(productsService)
      .overrideProvider(CategoriesService)
      .useValue(categoriesService)
      .overrideProvider(UsersService)
      .useValue(usersService)
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideProvider(EmailVerificationService)
      .useValue(emailVerificationService)
      .overrideGuard(AccessTokenGuard)
      .useValue(accessTokenGuard)
      .overrideGuard(RateLimitGuard)
      .useValue(allowRateLimitGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
    await request(baseUrl).get('/health/live').expect(200);
  });

  beforeEach(() => {
    client = createClient(baseUrl);
  });

  it('returns product and category envelopes', async () => {
    const products = [product];
    const categories = [category];
    productsService.findPage.mockResolvedValue({
      products,
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    categoriesService.findAll.mockResolvedValue(categories);

    await client
      .get('/api/products')
      .expect(200)
      .expect({
        products: [serializedProduct],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    expect(productsService.findPage).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
    await client
      .get('/api/categories')
      .expect(200)
      .expect({ categories: [serializedCategory] });
  });

  it('supports custom product pagination parameters', async () => {
    productsService.findPage.mockResolvedValue({
      products: [],
      pagination: {
        page: 3,
        limit: 5,
        totalItems: 12,
        totalPages: 3,
        hasNextPage: false,
        hasPreviousPage: true,
      },
    });

    await client
      .get('/api/products?page=3&limit=5')
      .expect(200)
      .expect({
        products: [],
        pagination: {
          page: 3,
          limit: 5,
          totalItems: 12,
          totalPages: 3,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      });
    expect(productsService.findPage).toHaveBeenCalledWith({
      page: 3,
      limit: 5,
    });
  });

  it('rejects invalid product pagination parameters', async () => {
    const callCount = productsService.findPage.mock.calls.length;

    await client.get('/api/products?page=0&limit=101').expect(400);
    await client.get('/api/products?page=1002&limit=100').expect(400);

    expect(productsService.findPage.mock.calls).toHaveLength(callCount);
  });

  it('creates, updates, and withdraws users through the HTTP contract', async () => {
    await client
      .post('/api/users')
      .send({ email: 'new@example.com', password: 'password123', name: 'New' })
      .expect(201)
      .expect({ user: serializedUser });

    await client
      .patch(`/api/users/${user.id}`)
      .send({ name: 'Updated' })
      .expect(200)
      .expect({ user: serializedUser });

    await client
      .delete(`/api/users/${user.id}`)
      .expect(200)
      .expect({
        user: {
          ...serializedUser,
          status: 'withdrawn',
        },
      });
  });

  it('enforces the self-only user update and withdrawal rule', async () => {
    const otherUserId = '33333333-3333-4333-8333-333333333333';

    await client
      .patch(`/api/users/${otherUserId}`)
      .send({ name: 'Not allowed' })
      .expect(403);
    await client.delete(`/api/users/${otherUserId}`).expect(403);
    expect(usersService.update).not.toHaveBeenCalledWith(
      otherUserId,
      expect.anything(),
    );
    expect(usersService.withdraw).not.toHaveBeenCalledWith(otherUserId);
  });

  it('sets authentication cookies for login and refresh', async () => {
    const loginResponse = await client
      .post('/api/auth/login')
      .send({ email: 'USER@example.com', password: 'password123' })
      .expect(200)
      .expect({ user: serializedUser });

    const loginCookies = loginResponse.headers['set-cookie'] ?? [];
    expect(loginCookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token=access-token; Max-Age='),
        expect.stringContaining('refresh_token=refresh-token; Max-Age='),
      ]),
    );
    expect(loginCookies).toHaveLength(2);
    expect(
      loginCookies.every(
        (cookie) =>
          cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax'),
      ),
    ).toBe(true);
    expect(authService.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });

    const refreshResponse = await client
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=refresh-token')
      .expect(200)
      .expect({ user: serializedUser });

    expect(refreshResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token=new-access-token'),
        expect.stringContaining('refresh_token=new-refresh-token'),
      ]),
    );
  });

  it('clears authentication cookies when refresh fails', async () => {
    authService.refresh.mockRejectedValueOnce(
      new UnauthorizedException('invalid refresh token'),
    );

    const response = await client
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=invalid-refresh-token')
      .expect(401);

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token=;'),
        expect.stringContaining('refresh_token=;'),
      ]),
    );
  });

  it('returns the current user and clears cookies on logout', async () => {
    await client
      .get('/api/auth/me')
      .set('Cookie', 'access_token=access-token')
      .expect(200)
      .expect({ user: serializedUser });

    const response = await client
      .post('/api/auth/logout')
      .set('Cookie', 'refresh_token=refresh-token')
      .expect(200)
      .expect({ message: '로그아웃되었습니다.' });

    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('access_token=;'),
        expect.stringContaining('refresh_token=;'),
      ]),
    );
  });

  it('returns the expected email verification responses', async () => {
    await client
      .post('/api/users/email-verification/verify')
      .send({ token: 'raw-token' })
      .expect(200)
      .expect({
        code: 'EMAIL_VERIFIED',
        message: '이메일 인증이 완료되었습니다.',
      });

    emailVerificationService.verify.mockImplementation((token: string) =>
      Promise.resolve(
        token === 'already-token'
          ? { status: 'already_verified' }
          : { status: 'verified' },
      ),
    );
    await client
      .post('/api/users/email-verification/verify')
      .send({ token: 'already-token' })
      .expect(200)
      .expect({
        code: 'EMAIL_ALREADY_VERIFIED',
        message: '이미 인증된 이메일입니다.',
      });

    await client
      .post('/api/users/email-verification/resend')
      .send({ email: 'USER@example.com' })
      .expect(200)
      .expect({
        code: 'EMAIL_VERIFICATION_SENT',
        message: '인증 메일을 전송했습니다.',
      });
  });

  it('preserves authentication and validation error status codes', async () => {
    authService.login.mockImplementation((input: { email: string }) =>
      input.email === 'failure@example.com'
        ? Promise.reject(new UnauthorizedException('invalid credentials'))
        : Promise.resolve({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user,
          }),
    );
    await client
      .post('/api/auth/login')
      .send({ email: 'failure@example.com', password: 'password123' })
      .expect(401);

    await client
      .patch('/api/users/not-a-uuid')
      .send({ name: 'Updated' })
      .expect(400);
  });

  it('returns 400 for malformed request bodies', async () => {
    await client
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'short', extra: true })
      .expect(400);
    await client
      .post('/api/users')
      .send({ email: 'not-an-email', password: 'password123', name: 'User' })
      .expect(400);
  });

  it('returns the correct readiness response for DB availability', async () => {
    databaseReady = true;
    databaseService.checkConnection.mockImplementation(() =>
      databaseReady
        ? Promise.resolve(undefined)
        : Promise.reject(new Error('down')),
    );
    await client
      .get('/health/ready')
      .expect(200)
      .expect({ status: 'ok', database: 'ok' });

    databaseReady = false;
    await client
      .get('/health/ready')
      .expect(503)
      .expect({ status: 'unavailable', database: 'unavailable' });
  });

  afterAll(async () => {
    await app.close();
  });
});

function createClient(baseUrl: string) {
  return {
    get: (path: string) =>
      request(baseUrl).get(path).retry(2, retryOnConnectionReset),
    post: (path: string) =>
      request(baseUrl).post(path).retry(2, retryOnConnectionReset),
    patch: (path: string) =>
      request(baseUrl).patch(path).retry(2, retryOnConnectionReset),
    delete: (path: string) =>
      request(baseUrl).delete(path).retry(2, retryOnConnectionReset),
  };
}

function retryOnConnectionReset(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ECONNRESET'
  );
}
