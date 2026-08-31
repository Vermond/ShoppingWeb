import { Test, TestingModule } from '@nestjs/testing';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AdminProductsService } from './../src/admin/admin-products.service';
import type {
  AdminProductDetailResponse,
  AdminProductListResponse,
} from './../src/admin/admin-products.types';
import { toAdminProductDetailRecord } from './../src/admin/admin-products.types';
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

const productId = '33333333-3333-4333-8333-333333333333';

const listResponse: AdminProductListResponse = {
  products: [],
  total_count: 0,
  status_counts: { active: 0, inactive: 0, draft: 0, archived: 0 },
  pagination: {
    page: 1,
    page_size: 20,
    total_count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  },
};

const detailResponse: AdminProductDetailResponse = {
  id: productId,
  name: '세라믹 머그',
  description: null,
  representative_image_url: null,
  category_id: '1',
  category_name: '리빙',
  price: '28000.00',
  stock: 10,
  max_order_quantity: 5,
  sales_quantity: 0,
  status: 'draft',
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
  images: [],
};

const detailRecord = toAdminProductDetailRecord({
  ...detailResponse,
  price: detailResponse.price,
  created_at: new Date(detailResponse.created_at),
  updated_at: new Date(detailResponse.updated_at),
  images: [],
});

describe('Admin products API (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let currentUser: UserRecord | undefined = admin;
  let adminProductsService: {
    findPage: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateStatus: jest.Mock;
    updateStock: jest.Mock;
  };

  beforeAll(async () => {
    adminProductsService = {
      findPage: jest.fn().mockResolvedValue({
        products: [],
        totalCount: 0,
        statusCounts: { active: 0, inactive: 0, draft: 0, archived: 0 },
      }),
      findOne: jest.fn().mockResolvedValue(detailRecord),
      create: jest.fn().mockResolvedValue(detailRecord),
      update: jest.fn().mockResolvedValue(detailRecord),
      updateStatus: jest.fn().mockResolvedValue(detailRecord),
      updateStock: jest.fn().mockResolvedValue(detailRecord),
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
      .overrideProvider(AdminProductsService)
      .useValue(adminProductsService)
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
    Object.values(adminProductsService).forEach((method) => method.mockClear());
  });

  it('allows administrators to query filtered products', async () => {
    await request(baseUrl)
      .get(
        '/api/admin/products?search=머그&category_id=1&status=active&low_stock_threshold=10&sort=sales_desc&page=1&page_size=20',
      )
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({
        ...listResponse,
        pagination: { ...listResponse.pagination, page: 1, page_size: 20 },
      });

    expect(adminProductsService.findPage).toHaveBeenCalledWith({
      search: '머그',
      categoryId: '1',
      status: 'active',
      lowStockThreshold: 10,
      sort: 'sales_desc',
      page: 1,
      pageSize: 20,
    });
  });

  it('supports create, update, status, stock, and detail endpoints', async () => {
    await request(baseUrl)
      .post('/api/admin/products')
      .send({
        name: '세라믹 머그',
        category_id: '1',
        price: '28000',
        stock: 10,
        max_order_quantity: 5,
      })
      .retry(2, retryOnConnectionReset)
      .expect(201)
      .expect({ product: detailResponse });

    await request(baseUrl)
      .patch(`/api/admin/products/${productId}`)
      .send({ price: '30000.00', images: [] })
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ product: detailResponse });

    await request(baseUrl)
      .patch(`/api/admin/products/${productId}/status`)
      .send({ status: 'active' })
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ product: detailResponse });

    await request(baseUrl)
      .patch(`/api/admin/products/${productId}/stock`)
      .send({ stock: 20 })
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ product: detailResponse });

    await request(baseUrl)
      .get(`/api/admin/products/${productId}`)
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ product: detailResponse });

    expect(adminProductsService.create).toHaveBeenCalledWith({
      name: '세라믹 머그',
      category_id: '1',
      description: null,
      price: '28000.00',
      stock: 10,
      max_order_quantity: 5,
      status: 'draft',
      images: [],
    });
    expect(adminProductsService.update).toHaveBeenCalledWith(productId, {
      price: '30000.00',
      images: [],
    });
    expect(adminProductsService.updateStatus).toHaveBeenCalledWith(productId, {
      status: 'active',
    });
    expect(adminProductsService.updateStock).toHaveBeenCalledWith(productId, {
      stock: 20,
    });
    expect(adminProductsService.findOne).toHaveBeenCalledWith(productId);
  });

  it('returns 401 for unauthenticated requests and 403 for customers', async () => {
    currentUser = undefined;
    await request(baseUrl)
      .get('/api/admin/products')
      .retry(2, retryOnConnectionReset)
      .expect(401);

    currentUser = customer;
    await request(baseUrl)
      .get('/api/admin/products')
      .retry(2, retryOnConnectionReset)
      .expect(403);

    expect(adminProductsService.findPage).not.toHaveBeenCalled();
  });

  it('exposes administrator product routes and filters in Swagger JSON', async () => {
    const response = await request(baseUrl)
      .get('/docs-json')
      .retry(2, retryOnConnectionReset)
      .expect(200);
    const listOperation = response.body.paths['/api/admin/products'].get;
    const detailOperation = response.body.paths['/api/admin/products/{id}'].get;
    const updateOperation =
      response.body.paths['/api/admin/products/{id}'].patch;
    const statusOperation =
      response.body.paths['/api/admin/products/{id}/status'].patch;
    const stockOperation =
      response.body.paths['/api/admin/products/{id}/stock'].patch;

    expect(listOperation.tags).toContain('admin');
    expect(listOperation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'search' }),
        expect.objectContaining({ name: 'category_id' }),
        expect.objectContaining({ name: 'status' }),
        expect.objectContaining({ name: 'low_stock_threshold' }),
        expect.objectContaining({ name: 'sort' }),
        expect.objectContaining({ name: 'page' }),
        expect.objectContaining({ name: 'page_size' }),
      ]),
    );
    expect(detailOperation.tags).toContain('admin');
    expect(updateOperation.tags).toContain('admin');
    expect(statusOperation.tags).toContain('admin');
    expect(stockOperation.tags).toContain('admin');
    expect(response.body.components.securitySchemes.access_token).toBeDefined();
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
