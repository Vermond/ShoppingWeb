import { Test, TestingModule } from '@nestjs/testing';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AccessTokenGuard } from './../src/auth/access-token.guard';
import type { AuthenticatedRequest } from './../src/auth/auth.decorators';
import type { UserRecord } from './../src/users/users.types';
import { AdminCustomersService } from './../src/admin/admin-customers.service';
import { setupSwagger } from './../src/swagger/swagger.setup';

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

const customer: UserRecord = {
  ...admin,
  id: '22222222-2222-4222-8222-222222222222',
  email: 'customer@example.com',
  name: 'Customer',
  role: 'user',
};

const listResponse = {
  customers: [],
  total_count: 0,
  status_counts: { active: 0, withdrawn: 0 },
  summary: {
    total_customer_count: 0,
    active_customer_count: 0,
    new_customer_count: 0,
    repurchase_rate_percent: 0,
  },
  pagination: {
    page: 1,
    page_size: 20,
    total_count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  },
};

const detailResponse = {
  id: '33333333-3333-4333-8333-333333333333',
  name: '홍길동',
  email: 'user@example.com',
  status: 'active',
  email_verified: true,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
  order_count: 1,
  total_spent: '53000.00',
  last_order_at: '2026-08-20T00:00:00.000Z',
  orders: [
    {
      order_id: '44444444-4444-4444-8444-444444444444',
      status: 'paid',
      total_amount: '53000.00',
      created_at: '2026-08-20T00:00:00.000Z',
      product_summary: [],
      product_count: 0,
    },
  ],
};

describe('Admin customers API (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let currentUser: UserRecord | undefined = admin;
  let adminCustomersService: {
    findPage: jest.Mock;
    findOne: jest.Mock;
  };

  beforeAll(async () => {
    adminCustomersService = {
      findPage: jest.fn().mockResolvedValue({
        customers: [],
        totalCount: 0,
        statusCounts: { active: 0, withdrawn: 0 },
        summary: {
          total_customer_count: 0,
          active_customer_count: 0,
          new_customer_count: 0,
          repurchase_rate_percent: 0,
        },
      }),
      findOne: jest.fn().mockResolvedValue(detailResponse),
    };

    const accessTokenGuard = {
      canActivate: (context: ExecutionContext): boolean => {
        if (!currentUser) {
          throw new UnauthorizedException('로그인이 필요합니다.');
        }

        const request = context
          .switchToHttp()
          .getRequest<AuthenticatedRequest>();
        request.user = currentUser;
        return true;
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AdminCustomersService)
      .useValue(adminCustomersService)
      .overrideGuard(AccessTokenGuard)
      .useValue(accessTokenGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app, true);
    await app.init();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  beforeEach(() => {
    currentUser = admin;
    Object.values(adminCustomersService).forEach((method) =>
      method.mockClear(),
    );
  });

  it('allows an administrator to query filtered customers', async () => {
    await request(baseUrl)
      .get(
        '/api/admin/customers?search=홍길동&status=active&email_verified=true&from=2026-08-01&to=2026-08-30&sort=order_count_desc&page=1&page_size=20',
      )
      .expect(200)
      .expect({ ...listResponse });

    expect(adminCustomersService.findPage).toHaveBeenCalledWith(
      expect.objectContaining({
        search: '홍길동',
        status: 'active',
        emailVerified: true,
        from: '2026-08-01',
        to: '2026-08-30',
        sort: 'order_count_desc',
        page: 1,
        pageSize: 20,
      }),
    );
  });

  it('returns customer detail and keeps the customer endpoint read-only', async () => {
    const id = detailResponse.id;

    await request(baseUrl)
      .get(`/api/admin/customers/${id}`)
      .expect(200)
      .expect({ customer: detailResponse });

    expect(adminCustomersService.findOne).toHaveBeenCalledWith(id);
  });

  it('returns 401 for unauthenticated requests and 403 for customers', async () => {
    currentUser = undefined;
    await request(baseUrl).get('/api/admin/customers').expect(401);

    currentUser = customer;
    await request(baseUrl).get('/api/admin/customers').expect(403);

    expect(adminCustomersService.findPage).not.toHaveBeenCalled();
  });

  it('exposes customer routes and filters in Swagger JSON', async () => {
    const response = await request(baseUrl).get('/docs-json').expect(200);
    const listOperation = response.body.paths['/api/admin/customers'].get;
    const detailOperation =
      response.body.paths['/api/admin/customers/{id}'].get;

    expect(listOperation.tags).toContain('admin');
    expect(listOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'search' }),
        expect.objectContaining({ name: 'status' }),
        expect.objectContaining({ name: 'email_verified' }),
        expect.objectContaining({ name: 'from' }),
        expect.objectContaining({ name: 'to' }),
        expect.objectContaining({ name: 'sort' }),
        expect.objectContaining({ name: 'page' }),
        expect.objectContaining({ name: 'page_size' }),
      ]),
    );
    expect(detailOperation.tags).toContain('admin');
  });

  afterAll(async () => {
    await app.close();
  });
});
