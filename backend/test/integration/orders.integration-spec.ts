import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import type { DatabaseService } from '../../src/database/database.service';
import { MockPaymentService } from '../../src/orders/mock-payment.service';
import { OrdersRepository } from '../../src/orders/orders.repository';
import { OrdersService } from '../../src/orders/orders.service';
import {
  assertRequiredSchema,
  createIntegrationDatabase,
  type IntegrationDatabase,
} from './integration-database';

describe('Orders database integration', () => {
  let database: IntegrationDatabase | undefined;
  let service: OrdersService;
  let userId: string;
  let categoryId: string;
  let productId: string;
  let cartId: string;
  let addressId: string;
  let orderId: string | undefined;

  beforeAll(async () => {
    database = createIntegrationDatabase();
    await database.query('SELECT 1');
    await assertRequiredSchema(database);

    const fixture = await insertOrderFixture(database);
    userId = fixture.userId;
    categoryId = fixture.categoryId;
    productId = fixture.productId;
    cartId = fixture.cartId;
    addressId = fixture.addressId;

    service = new OrdersService(
      database as unknown as DatabaseService,
      new OrdersRepository(database as unknown as DatabaseService),
      new MockPaymentService(),
    );
  });

  afterAll(async () => {
    if (!database) {
      return;
    }

    if (orderId) {
      await database.query(
        'DELETE FROM sales.order_items WHERE order_id = $1',
        [orderId],
      );
      await database.query('DELETE FROM sales.orders WHERE id = $1', [orderId]);
    }

    await database.query('DELETE FROM cart.cart_items WHERE cart_id = $1', [
      cartId,
    ]);
    await database.query('DELETE FROM cart.carts WHERE id = $1', [cartId]);
    await database.query('DELETE FROM auth.user_addresses WHERE id = $1', [
      addressId,
    ]);
    await database.query('DELETE FROM catalog.products WHERE id = $1', [
      productId,
    ]);
    await database.query('DELETE FROM catalog.categories WHERE id = $1', [
      categoryId,
    ]);
    await database.query('DELETE FROM auth.users WHERE id = $1', [userId]);
    await database.close();
  });

  it('creates an order with real SQL, locks stock, clears the cart, and restores stock on cancellation', async () => {
    const policyResult = await database.query<{
      base_fee: string;
      free_threshold: string;
    }>(
      `
        SELECT base_fee, free_threshold
        FROM sales.shipping_policy
        WHERE is_active = true
        ORDER BY id DESC
        LIMIT 1
      `,
    );
    const policy = policyResult.rows[0];

    if (!policy) {
      throw new Error(
        '활성 배송 정책이 없습니다. 통합 테스트 DB에 db:seed:integration을 먼저 실행하세요.',
      );
    }

    const created = await service.create(userId, {
      address_id: addressId,
      delivery_request: '통합 테스트 배송 요청',
    });
    orderId = created.id;

    const subtotal = new Decimal('2400.00');
    const shippingFee = subtotal.gte(new Decimal(policy.free_threshold))
      ? new Decimal(0)
      : new Decimal(policy.base_fee);

    expect(created.status).toBe('paid');
    expect(created.subtotal.toFixed(2)).toBe(subtotal.toFixed(2));
    expect(created.shipping_fee.toFixed(2)).toBe(shippingFee.toFixed(2));
    expect(created.total_amount.toFixed(2)).toBe(
      subtotal.add(shippingFee).toFixed(2),
    );

    const afterCreate = await database.query<{
      stock: number;
      cart_item_count: number;
      order_item_count: number;
      address_count: number;
    }>(
      `
        SELECT
          (SELECT stock FROM catalog.products WHERE id = $1) AS stock,
          (SELECT COUNT(*)::int FROM cart.cart_items WHERE cart_id = $2) AS cart_item_count,
          (SELECT COUNT(*)::int FROM sales.order_items WHERE order_id = $3) AS order_item_count,
          (SELECT COUNT(*)::int FROM sales.order_addresses WHERE order_id = $3) AS address_count
      `,
      [productId, cartId, orderId],
    );

    expect(afterCreate.rows[0]).toEqual({
      stock: 3,
      cart_item_count: 0,
      order_item_count: 1,
      address_count: 1,
    });

    const cancelled = await service.cancel(userId, orderId);

    expect(cancelled.status).toBe('cancelled');

    const afterCancel = await database.query<{ stock: number }>(
      'SELECT stock FROM catalog.products WHERE id = $1',
      [productId],
    );

    expect(afterCancel.rows[0]?.stock).toBe(5);
  });
});

async function insertOrderFixture(database: IntegrationDatabase) {
  const fixtureId = randomUUID().slice(0, 8);
  const userId = randomUUID();
  const productId = randomUUID();
  const cartId = randomUUID();
  const addressId = randomUUID();
  const categoryResult = await database.query<{ id: string }>(
    `
      INSERT INTO catalog.categories (name)
      VALUES ($1)
      RETURNING id::text AS id
    `,
    [`Order Category ${fixtureId}`],
  );
  const categoryId = categoryResult.rows[0]?.id;

  if (!categoryId) {
    throw new Error('통합 테스트 카테고리를 생성하지 못했습니다.');
  }

  await database.query(
    `
      INSERT INTO auth.users
        (id, email, password_hash, name, role, status, email_verified)
      VALUES ($1, $2, NULL, $3, 'user', 'active', true)
    `,
    [userId, `order-${fixtureId}@example.com`, `Order User ${fixtureId}`],
  );
  await database.query(
    `
      INSERT INTO catalog.products
        (id, category_id, name, price, stock, max_order_quantity, status)
      VALUES ($1, $2, $3, '1200.00', 5, 3, 'active')
    `,
    [productId, categoryId, `Order Product ${fixtureId}`],
  );
  await database.query('INSERT INTO cart.carts (id, user_id) VALUES ($1, $2)', [
    cartId,
    userId,
  ]);
  await database.query(
    'INSERT INTO cart.cart_items (cart_id, product_id, quantity) VALUES ($1, $2, 2)',
    [cartId, productId],
  );
  await database.query(
    `
      INSERT INTO auth.user_addresses
        (id, user_id, recipient_name, phone_number, postal_code, address_line1, is_default)
      VALUES ($1, $2, '통합 테스트 수령인', '01012345678', '06236', '서울시 테스트 주소', true)
    `,
    [addressId, userId],
  );

  return { userId, categoryId, productId, cartId, addressId };
}
