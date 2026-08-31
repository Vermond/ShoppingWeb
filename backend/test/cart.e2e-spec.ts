import { Test, TestingModule } from '@nestjs/testing';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import Decimal from 'decimal.js';
import { AppModule } from './../src/app.module';
import { AccessTokenGuard } from './../src/auth/access-token.guard';
import type { AuthenticatedRequest } from './../src/auth/auth.decorators';
import type { AuthenticatedUser } from './../src/auth/auth.types';
import { CartService } from './../src/cart/cart.service';
import type { CartRecord } from './../src/cart/cart.types';
import type { ProductRecord } from './../src/products/products.types';

const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  name: 'User',
  role: 'user',
  status: 'active',
  email_verified: true,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

const product: ProductRecord = {
  id: '22222222-2222-4222-8222-222222222222',
  category_id: '1',
  name: 'Product',
  description: null,
  price: new Decimal('12900.00'),
  stock: 5,
  max_order_quantity: 3,
  status: 'active',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

const cart: CartRecord = {
  id: '33333333-3333-4333-8333-333333333333',
  user_id: user.id,
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  items: [
    {
      id: '1',
      cart_id: '33333333-3333-4333-8333-333333333333',
      product_id: product.id,
      quantity: 2,
      product,
      image_url: 'https://example.com/product.png',
      available: true,
      unavailable_reason: null,
      subtotal: new Decimal('25800.00'),
    },
  ],
  total_quantity: 2,
  total_price: new Decimal('25800.00'),
};

const serializedCart = {
  id: cart.id,
  items: [
    {
      id: '1',
      product_id: product.id,
      quantity: 2,
      product: {
        id: product.id,
        category_id: '1',
        name: 'Product',
        description: null,
        price: '12900.00',
        stock: 5,
        max_order_quantity: 3,
        status: 'active',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        image_url: 'https://example.com/product.png',
      },
      available: true,
      unavailable_reason: null,
      subtotal: '25800.00',
    },
  ],
  total_quantity: 2,
  total_price: '25800.00',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('Cart API (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let cartService: {
    findByUserId: jest.Mock;
    addItem: jest.Mock;
    mergeItems: jest.Mock;
    updateItem: jest.Mock;
    removeItem: jest.Mock;
  };

  beforeAll(async () => {
    cartService = {
      findByUserId: jest.fn().mockResolvedValue(cart),
      addItem: jest.fn().mockResolvedValue(cart),
      mergeItems: jest.fn().mockResolvedValue(cart),
      updateItem: jest.fn().mockResolvedValue(cart),
      removeItem: jest.fn().mockResolvedValue(cart),
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
      .overrideProvider(CartService)
      .useValue(cartService)
      .overrideGuard(AccessTokenGuard)
      .useValue(accessTokenGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  it('gets the current user cart', async () => {
    await request(baseUrl)
      .get('/api/cart')
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ cart: serializedCart });

    expect(cartService.findByUserId).toHaveBeenCalledWith(user.id);
  });

  it('adds, updates, and removes cart items', async () => {
    await request(baseUrl)
      .post('/api/cart/items')
      .send({ product_id: product.id, quantity: 1 })
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ cart: serializedCart });
    expect(cartService.addItem).toHaveBeenCalledWith(user.id, {
      product_id: product.id,
      quantity: 1,
    });

    await request(baseUrl)
      .patch(`/api/cart/items/${product.id}`)
      .send({ quantity: 2 })
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ cart: serializedCart });
    expect(cartService.updateItem).toHaveBeenCalledWith(user.id, product.id, {
      quantity: 2,
    });

    await request(baseUrl)
      .delete(`/api/cart/items/${product.id}`)
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ cart: serializedCart });
    expect(cartService.removeItem).toHaveBeenCalledWith(user.id, product.id);
  });

  it('merges the guest cart into the authenticated user cart', async () => {
    await request(baseUrl)
      .post('/api/cart/merge')
      .send({
        items: [
          { product_id: product.id, quantity: 1 },
          {
            product_id: '44444444-4444-4444-8444-444444444444',
            quantity: 2,
          },
        ],
      })
      .retry(2, retryOnConnectionReset)
      .expect(200)
      .expect({ cart: serializedCart });

    expect(cartService.mergeItems).toHaveBeenCalledWith(user.id, {
      items: [
        { product_id: product.id, quantity: 1 },
        {
          product_id: '44444444-4444-4444-8444-444444444444',
          quantity: 2,
        },
      ],
    });
  });

  it('rejects malformed cart item requests before calling the service', async () => {
    const callCount = cartService.addItem.mock.calls.length;

    const response = await request(baseUrl)
      .post('/api/cart/items')
      .send({ product_id: product.id, quantity: 1, extra: true })
      .retry(2, retryOnConnectionReset)
      .expect(400);

    expect(response.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: '지원하지 않는 필드입니다: extra',
    });
    expect(cartService.addItem.mock.calls).toHaveLength(callCount);
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
