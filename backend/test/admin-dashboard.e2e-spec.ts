import { Test, TestingModule } from '@nestjs/testing';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AccessTokenGuard } from './../src/auth/access-token.guard';
import type { AuthenticatedRequest } from './../src/auth/auth.decorators';
import type { UserRecord } from './../src/users/users.types';
import { AdminDashboardService } from './../src/admin/admin-dashboard.service';
import type { AdminDashboardResponse } from './../src/admin/admin-dashboard.types';
import { DatabaseService } from './../src/database/database.service';
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

const dashboardResponse: AdminDashboardResponse = {
  period: { from: '2026-08-01', to: '2026-08-03' },
  comparison_period: { from: '2026-07-29', to: '2026-07-31' },
  summary: {
    revenue: { value: '100.00', change_rate_percent: 25 },
    order_count: { value: 2, change_rate_percent: 100 },
    new_customer_count: { value: 1, change_rate_percent: null },
  },
  daily_sales: [
    { date: '2026-08-01', revenue: '100.00' },
    { date: '2026-08-02', revenue: '0.00' },
    { date: '2026-08-03', revenue: '0.00' },
  ],
  category_sales: [
    {
      category_id: '1',
      category_name: 'Category',
      revenue: '100.00',
      sales_ratio_percent: 100,
    },
  ],
  recent_orders: [],
  inventory: [],
};

describe('Admin dashboard API (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let currentUser: UserRecord | undefined = admin;
  let dashboardService: { findDashboard: jest.Mock };

  beforeAll(async () => {
    dashboardService = {
      findDashboard: jest.fn().mockResolvedValue(dashboardResponse),
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
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(AdminDashboardService)
      .useValue(dashboardService)
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
    dashboardService.findDashboard.mockClear();
  });

  it('allows administrators to query a filtered dashboard period', async () => {
    await request(baseUrl)
      .get('/api/admin/dashboard?from=2026-08-01&to=2026-08-03')
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect(dashboardResponse);

    expect(dashboardService.findDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '2026-08-01',
        to: '2026-08-03',
        comparisonFrom: '2026-07-29',
        comparisonTo: '2026-07-31',
      }),
    );
  });

  it('returns 401 for unauthenticated requests and 403 for customers', async () => {
    currentUser = undefined;
    await request(baseUrl)
      .get('/api/admin/dashboard')
      .retry(2, retryOnConnectionReset)
      .expect(401);

    currentUser = customer;
    await request(baseUrl)
      .get('/api/admin/dashboard')
      .retry(2, retryOnConnectionReset)
      .expect(403);

    expect(dashboardService.findDashboard).not.toHaveBeenCalled();
  });

  it('rejects invalid dashboard periods before calling the service', async () => {
    await request(baseUrl)
      .get('/api/admin/dashboard?from=2026-08-03&to=2026-08-01')
      .retry(2, retryOnConnectionReset)
      .expect(400);

    expect(dashboardService.findDashboard).not.toHaveBeenCalled();
  });

  it('exposes the admin route and cookie authentication in Swagger JSON', async () => {
    const response = await request(baseUrl)
      .get('/docs-json')
      .retry(2, retryOnConnectionReset)
      .expect(200);

    expect(response.body.paths['/api/admin/dashboard'].get).toBeDefined();
    expect(response.body.paths['/api/admin/dashboard'].get.tags).toContain(
      'admin',
    );
    expect(response.body.paths['/api/admin/dashboard'].get.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'from' }),
        expect.objectContaining({ name: 'to' }),
      ]),
    );
    expect(response.body.components.securitySchemes.access_token).toBeDefined();
    expect(
      response.body.paths['/api/admin/dashboard'].get.responses['200'],
    ).toEqual(
      expect.objectContaining({
        content: expect.objectContaining({
          'application/json': expect.objectContaining({
            schema: {
              $ref: '#/components/schemas/AdminDashboardResponseDto',
            },
          }),
        }),
      }),
    );
    expect(
      response.body.paths['/api/admin/dashboard'].get.responses['401'],
    ).toBeDefined();
    expect(
      response.body.paths['/api/admin/dashboard'].get.responses['403'],
    ).toBeDefined();
    expect(
      response.body.paths['/api/admin/dashboard'].get.responses['400'],
    ).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });
});

function retryOnConnectionReset(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ECONNRESET'
  );
}
