import { Test, TestingModule } from '@nestjs/testing';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdminOrdersService } from './../src/admin/admin-orders.service';
import type {
  AdminOrderDetailResponse,
  AdminOrderListResponse,
} from './../src/admin/admin-orders.types';
import { AppModule } from './../src/app.module';
import { AccessTokenGuard } from './../src/auth/access-token.guard';
import type { AuthenticatedRequest } from './../src/auth/auth.decorators';
import type { UserRecord } from './../src/users/users.types';
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

const orderId = '33333333-3333-4333-8333-333333333333';

const listResponse: AdminOrderListResponse = {
  orders: [],
  total_count: 0,
  status_counts: {
    pending: 0,
    paid: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
  },
  pagination: {
    page: 2,
    page_size: 20,
    total_count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: true,
  },
};

const detailResponse: AdminOrderDetailResponse = {
  order_id: orderId,
  customer: {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone_number: '010-1234-5678',
  },
  status: 'paid',
  subtotal: '0.00',
  shipping_fee: '0.00',
  discount_amount: '0.00',
  total_amount: '0.00',
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
  items: [],
  address: null,
  payment: {
    provider: 'mock',
    status: 'paid',
    method: null,
    transaction_id: null,
    approved_at: null,
  },
  shipping: {
    status: 'preparing',
    carrier: null,
    tracking_number: null,
  },
  status_history: [],
};

describe('Admin orders API (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let currentUser: UserRecord | undefined = admin;
  let adminOrdersService: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeAll(async () => {
    adminOrdersService = {
      findAll: jest.fn().mockResolvedValue(listResponse),
      findOne: jest.fn().mockResolvedValue(detailResponse),
      updateStatus: jest.fn().mockResolvedValue({
        ...detailResponse,
        status: 'shipped',
      }),
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
      .overrideProvider(AdminOrdersService)
      .useValue(adminOrdersService)
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
    adminOrdersService.findAll.mockClear();
    adminOrdersService.findOne.mockClear();
    adminOrdersService.updateStatus.mockClear();
  });

  it('allows administrators to query a filtered, paginated order list', async () => {
    await request(baseUrl)
      .get(
        '/api/admin/orders?from=2026-08-01&to=2026-08-30&status=paid&search=홍길동&page=2&page_size=20',
      )
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect(listResponse);

    expect(adminOrdersService.findAll).toHaveBeenCalledWith({
      from: '2026-08-01',
      to: '2026-08-30',
      fromTimestamp: new Date('2026-07-31T15:00:00.000Z'),
      toExclusiveTimestamp: new Date('2026-08-30T15:00:00.000Z'),
      status: 'paid',
      search: '홍길동',
      page: 2,
      pageSize: 20,
    });
  });

  it('allows administrators to query detail and change status', async () => {
    await request(baseUrl)
      .get(`/api/admin/orders/${orderId}`)
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ order: detailResponse });

    await request(baseUrl)
      .patch(`/api/admin/orders/${orderId}/status`)
      .send({ status: 'shipped' })
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ order: { ...detailResponse, status: 'shipped' } });

    expect(adminOrdersService.findOne).toHaveBeenCalledWith(orderId);
    expect(adminOrdersService.updateStatus).toHaveBeenCalledWith(
      orderId,
      admin.id,
      { status: 'shipped' },
    );
  });

  it('returns 401 for unauthenticated requests and 403 for customers', async () => {
    currentUser = undefined;
    await request(baseUrl)
      .get('/api/admin/orders')
      .retry(2, retryOnConnectionReset)
      .expect(401);

    currentUser = customer;
    await request(baseUrl)
      .get('/api/admin/orders')
      .retry(2, retryOnConnectionReset)
      .expect(403);

    expect(adminOrdersService.findAll).not.toHaveBeenCalled();
  });

  it('exposes all administrator order routes and parameters in Swagger JSON', async () => {
    const response = await request(baseUrl)
      .get('/docs-json')
      .retry(2, retryOnConnectionReset)
      .expect(200);
    const listOperation = response.body.paths['/api/admin/orders'].get;
    const detailOperation = response.body.paths['/api/admin/orders/{id}'].get;
    const updateOperation =
      response.body.paths['/api/admin/orders/{id}/status'].patch;

    expect(listOperation.tags).toContain('admin');
    expect(listOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'from' }),
        expect.objectContaining({ name: 'to' }),
        expect.objectContaining({ name: 'status' }),
        expect.objectContaining({ name: 'search' }),
        expect.objectContaining({ name: 'page' }),
        expect.objectContaining({ name: 'page_size' }),
      ]),
    );
    expect(detailOperation.tags).toContain('admin');
    expect(updateOperation.tags).toContain('admin');
    expect(response.body.components.securitySchemes.access_token).toBeDefined();
    expect(updateOperation.responses['409']).toBeDefined();
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
