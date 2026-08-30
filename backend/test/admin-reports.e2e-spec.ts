import { Test, TestingModule } from '@nestjs/testing';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AccessTokenGuard } from './../src/auth/access-token.guard';
import type { AuthenticatedRequest } from './../src/auth/auth.decorators';
import type { UserRecord } from './../src/users/users.types';
import { AdminReportsService } from './../src/admin/admin-reports.service';
import type { AdminReportResponse } from './../src/admin/admin-reports.types';
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

const user: UserRecord = {
  ...admin,
  id: '22222222-2222-4222-8222-222222222222',
  email: 'user@example.com',
  name: 'User',
  role: 'user',
};

const reportResponse: AdminReportResponse = {
  period: { from: '2026-08-01', to: '2026-08-03' },
  comparison_period: { from: '2026-07-29', to: '2026-07-31' },
  summary: {
    revenue: { value: '100.00', change_rate_percent: 25 },
    order_count: { value: 2, change_rate_percent: 100 },
    average_order_amount: { value: '50.00', change_rate_percent: 10 },
    new_customer_count: { value: 1, change_rate_percent: null },
    repurchase_rate_percent: { value: 50, change_rate_percent: null },
  },
  daily_sales: [
    { date: '2026-08-01', revenue: '100.00', order_count: 2 },
    { date: '2026-08-02', revenue: '0.00', order_count: 0 },
    { date: '2026-08-03', revenue: '0.00', order_count: 0 },
  ],
  category_sales: [
    {
      category_id: '1',
      category_name: 'Category',
      revenue: '100.00',
      sales_quantity: 2,
      sales_ratio_percent: 100,
    },
  ],
  top_products: [],
};

describe('Admin reports API (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let currentUser: UserRecord | undefined = admin;
  let reportsService: { findReports: jest.Mock };

  beforeAll(async () => {
    reportsService = {
      findReports: jest.fn().mockResolvedValue(reportResponse),
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
      .overrideProvider(AdminReportsService)
      .useValue(reportsService)
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
    reportsService.findReports.mockClear();
  });

  it('allows an administrator to query a filtered report period', async () => {
    await request(baseUrl)
      .get('/api/admin/reports?from=2026-08-01&to=2026-08-03')
      .expect(200)
      .expect(reportResponse);

    expect(reportsService.findReports).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '2026-08-01',
        to: '2026-08-03',
        comparisonFrom: '2026-07-29',
        comparisonTo: '2026-07-31',
      }),
    );
  });

  it('returns 401 for unauthenticated requests and 403 for normal users', async () => {
    currentUser = undefined;
    await request(baseUrl).get('/api/admin/reports').expect(401);

    currentUser = user;
    await request(baseUrl).get('/api/admin/reports').expect(403);

    expect(reportsService.findReports).not.toHaveBeenCalled();
  });

  it('rejects invalid or partial date filters before calling the service', async () => {
    await request(baseUrl)
      .get('/api/admin/reports?from=2026-08-03&to=2026-08-01')
      .expect(400);
    await request(baseUrl)
      .get('/api/admin/reports?from=2026-08-01')
      .expect(400);

    expect(reportsService.findReports).not.toHaveBeenCalled();
  });

  it('exposes the report route, parameters, cookie auth, and response schema in Swagger', async () => {
    const response = await request(baseUrl).get('/docs-json').expect(200);
    const operation = response.body.paths['/api/admin/reports'].get;

    expect(operation.tags).toContain('admin');
    expect(operation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'from' }),
        expect.objectContaining({ name: 'to' }),
      ]),
    );
    expect(operation.responses['200']).toEqual(
      expect.objectContaining({
        content: expect.objectContaining({
          'application/json': expect.objectContaining({
            schema: {
              $ref: '#/components/schemas/AdminReportResponseDto',
            },
          }),
        }),
      }),
    );
    expect(operation.responses['401']).toBeDefined();
    expect(operation.responses['403']).toBeDefined();
    expect(operation.responses['400']).toBeDefined();
    expect(response.body.components.securitySchemes.access_token).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
