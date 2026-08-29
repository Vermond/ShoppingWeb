import { Test, TestingModule } from '@nestjs/testing';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import Decimal from 'decimal.js';
import { AppModule } from './../src/app.module';
import { AccessTokenGuard } from './../src/auth/access-token.guard';
import type { AuthenticatedRequest } from './../src/auth/auth.decorators';
import type { AuthenticatedUser } from './../src/auth/auth.types';
import { OrdersService } from './../src/orders/orders.service';
import type {
  OrderRecord,
  OrderSummaryRecord,
} from './../src/orders/orders.types';

const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  name: 'User',
  role: 'customer',
  status: 'active',
  email_verified: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

const order: OrderRecord = {
  id: '22222222-2222-4222-8222-222222222222',
  user_id: user.id,
  status: 'paid',
  total_amount: new Decimal('25800.00'),
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  items: [
    {
      id: '1',
      order_id: '22222222-2222-4222-8222-222222222222',
      product_id: '33333333-3333-4333-8333-333333333333',
      product_name: 'Product',
      unit_price: new Decimal('12900.00'),
      quantity: 2,
      subtotal: new Decimal('25800.00'),
    },
  ],
  address: {
    order_id: '22222222-2222-4222-8222-222222222222',
    recipient_name: '홍길동',
    phone_number: '01012345678',
    postal_code: '06236',
    address_line1: '서울특별시 강남구 테헤란로 1',
    address_line2: '101호',
    delivery_request: '문 앞에 놓아주세요',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  },
};

const summary: OrderSummaryRecord = {
  id: order.id,
  user_id: order.user_id,
  status: order.status,
  total_amount: order.total_amount,
  created_at: order.created_at,
  updated_at: order.updated_at,
};

describe('Orders API (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let ordersService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    cancel: jest.Mock;
  };

  beforeAll(async () => {
    ordersService = {
      create: jest.fn().mockResolvedValue(order),
      findAll: jest.fn().mockResolvedValue([summary]),
      findOne: jest.fn().mockResolvedValue(order),
      cancel: jest.fn().mockResolvedValue({ ...order, status: 'cancelled' }),
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OrdersService)
      .useValue(ordersService)
      .overrideGuard(AccessTokenGuard)
      .useValue(accessTokenGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  it('creates an order from the selected address', async () => {
    await request(baseUrl)
      .post('/api/orders')
      .send({
        address_id: '44444444-4444-4444-8444-444444444444',
        delivery_request: '문 앞에 놓아주세요',
      })
      .retry(2, retryOnConnectionReset)
      .expect(201)
      .expect({ order: serializeOrderForTest(order) });

    expect(ordersService.create).toHaveBeenCalledWith(user.id, {
      address_id: '44444444-4444-4444-8444-444444444444',
      delivery_request: '문 앞에 놓아주세요',
    });
  });

  it('gets the order list and detail, then cancels an order', async () => {
    await request(baseUrl)
      .get('/api/orders')
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ orders: [serializeSummaryForTest(summary)] });

    await request(baseUrl)
      .get(`/api/orders/${order.id}`)
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ order: serializeOrderForTest(order) });

    await request(baseUrl)
      .post(`/api/orders/${order.id}/cancel`)
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({
        order: serializeOrderForTest({ ...order, status: 'cancelled' }),
      });

    expect(ordersService.findAll).toHaveBeenCalledWith(user.id);
    expect(ordersService.findOne).toHaveBeenCalledWith(user.id, order.id);
    expect(ordersService.cancel).toHaveBeenCalledWith(user.id, order.id);
  });

  it('rejects an invalid create request before calling the service', async () => {
    const callCount = ordersService.create.mock.calls.length;

    const response = await request(baseUrl)
      .post('/api/orders')
      .send({ address_id: 'not-a-uuid' })
      .retry(2, retryOnConnectionReset)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(ordersService.create.mock.calls).toHaveLength(callCount);
  });

  afterAll(async () => {
    await app.close();
  });
});

function serializeOrderForTest(value: OrderRecord) {
  return {
    id: value.id,
    user_id: value.user_id,
    status: value.status,
    total_amount: value.total_amount.toFixed(2),
    created_at: value.created_at.toISOString(),
    updated_at: value.updated_at.toISOString(),
    items: value.items.map((item) => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price.toFixed(2),
      quantity: item.quantity,
      subtotal: item.subtotal.toFixed(2),
    })),
    address: {
      ...value.address,
      created_at: value.address.created_at.toISOString(),
    },
  };
}

function serializeSummaryForTest(value: OrderSummaryRecord) {
  return {
    id: value.id,
    user_id: value.user_id,
    status: value.status,
    total_amount: value.total_amount.toFixed(2),
    created_at: value.created_at.toISOString(),
    updated_at: value.updated_at.toISOString(),
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
