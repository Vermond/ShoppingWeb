import { randomUUID } from 'node:crypto';
import type { DatabaseService } from '../../src/database/database.service';
import { AdminReportsRepository } from '../../src/admin/admin-reports.repository';
import { AdminReportsService } from '../../src/admin/admin-reports.service';
import { parseAdminDashboardQuery } from '../../src/admin/admin-dashboard.input';
import {
  assertRequiredSchema,
  createIntegrationDatabase,
  type IntegrationDatabase,
} from './integration-database';

describe('Admin reports database integration', () => {
  let database: IntegrationDatabase | undefined;
  let service: AdminReportsService;
  let categoryIds: string[] = [];
  let productIds: string[] = [];
  let userIds: string[] = [];
  let orderIds: string[] = [];

  beforeAll(async () => {
    database = createIntegrationDatabase();
    await database.query('SELECT 1');
    await assertRequiredSchema(database);

    const fixture = await insertReportFixture(database);
    categoryIds = fixture.categoryIds;
    productIds = fixture.productIds;
    userIds = fixture.userIds;
    orderIds = fixture.orderIds;
    service = new AdminReportsService(
      new AdminReportsRepository(database as unknown as DatabaseService),
    );
  });

  afterAll(async () => {
    if (!database) {
      return;
    }

    if (orderIds.length > 0) {
      await database.query(
        `DELETE FROM sales.order_items WHERE order_id IN ($1, $2, $3, $4, $5, $6)`,
        orderIds,
      );
      await database.query(
        `DELETE FROM sales.orders WHERE id IN ($1, $2, $3, $4, $5, $6)`,
        orderIds,
      );
    }

    if (productIds.length > 0) {
      await database.query(
        `DELETE FROM catalog.products WHERE id IN ($1, $2)`,
        productIds,
      );
    }

    if (categoryIds.length > 0) {
      await database.query(
        `DELETE FROM catalog.categories WHERE id IN ($1, $2)`,
        categoryIds,
      );
    }

    if (userIds.length > 0) {
      await database.query(
        `DELETE FROM auth.users WHERE id IN ($1, $2)`,
        userIds,
      );
    }

    await database.close();
  });

  it('executes report SQL against PostgreSQL and excludes pending/cancelled orders', async () => {
    const period = parseAdminDashboardQuery({
      from: '2026-08-01',
      to: '2026-08-03',
    });

    const response = await service.findReports(period);

    expect(response.summary.revenue.value).toBe('4100.00');
    expect(response.summary.order_count.value).toBe(3);
    expect(response.summary.average_order_amount.value).toBe('1366.67');
    expect(response.summary.new_customer_count.value).toBe(1);
    expect(response.summary.repurchase_rate_percent.value).toBe(50);

    expect(response.daily_sales).toEqual([
      { date: '2026-08-01', revenue: '2000.00', order_count: 1 },
      { date: '2026-08-02', revenue: '1500.00', order_count: 1 },
      { date: '2026-08-03', revenue: '600.00', order_count: 1 },
    ]);

    const fixtureCategorySales = response.category_sales.filter((category) =>
      category.category_name.includes('Report Category'),
    );

    expect(fixtureCategorySales).toEqual([
      expect.objectContaining({
        category_name: expect.stringContaining('Report Category B'),
        revenue: '2100.00',
        sales_quantity: 4,
        sales_ratio_percent: 51.22,
      }),
      expect.objectContaining({
        category_name: expect.stringContaining('Report Category A'),
        revenue: '2000.00',
        sales_quantity: 2,
        sales_ratio_percent: 48.78,
      }),
    ]);

    expect(response.top_products[0]).toEqual(
      expect.objectContaining({
        product_name: expect.stringContaining('Report Product B'),
        sales_quantity: 4,
        revenue: '2100.00',
      }),
    );
    expect(response.top_products[1]).toEqual(
      expect.objectContaining({
        product_name: expect.stringContaining('Report Product A'),
        sales_quantity: 2,
        revenue: '2000.00',
      }),
    );
  });
});

async function insertReportFixture(database: IntegrationDatabase) {
  const fixtureId = randomUUID().slice(0, 8);
  const categoryA = await insertCategory(
    database,
    `Report Category A ${fixtureId}`,
  );
  const categoryB = await insertCategory(
    database,
    `Report Category B ${fixtureId}`,
  );
  const productA = randomUUID();
  const productB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const orderCurrentA1 = randomUUID();
  const orderCurrentA2 = randomUUID();
  const orderCurrentB = randomUUID();
  const orderCancelled = randomUUID();
  const orderPending = randomUUID();
  const orderPrevious = randomUUID();

  await database.query(
    `
      INSERT INTO catalog.products
        (id, category_id, name, price, stock, max_order_quantity, status)
      VALUES
        ($1, $2, $3, $4, 20, 10, 'active'),
        ($5, $6, $7, $8, 20, 10, 'active')
    `,
    [
      productA,
      categoryA,
      `Report Product A ${fixtureId}`,
      '1000.00',
      productB,
      categoryB,
      `Report Product B ${fixtureId}`,
      '500.00',
    ],
  );

  await database.query(
    `
      INSERT INTO auth.users
        (id, email, password_hash, name, role, status, email_verified, created_at)
      VALUES
        ($1, $2, NULL, $3, 'user', 'active', true, $4),
        ($5, $6, NULL, $7, 'user', 'active', true, $8)
    `,
    [
      userA,
      `report-a-${fixtureId}@example.com`,
      `Report User A ${fixtureId}`,
      seoulTimestamp('2026-08-01T08:00:00'),
      userB,
      `report-b-${fixtureId}@example.com`,
      `Report User B ${fixtureId}`,
      seoulTimestamp('2026-07-01T08:00:00'),
    ],
  );

  await insertOrder(
    database,
    orderCurrentA1,
    userA,
    'paid',
    '2000.00',
    '2026-08-01T10:00:00',
    productA,
    '1000.00',
    2,
  );
  await insertOrder(
    database,
    orderCurrentA2,
    userA,
    'shipped',
    '1500.00',
    '2026-08-02T10:00:00',
    productB,
    '500.00',
    3,
  );
  await insertOrder(
    database,
    orderCurrentB,
    userB,
    'completed',
    '600.00',
    '2026-08-03T10:00:00',
    productB,
    '600.00',
    1,
  );
  await insertOrder(
    database,
    orderCancelled,
    userB,
    'cancelled',
    '99900.00',
    '2026-08-02T11:00:00',
    productA,
    '1000.00',
    99,
  );
  await insertOrder(
    database,
    orderPending,
    userB,
    'pending',
    '888.00',
    '2026-08-03T11:00:00',
    productB,
    '888.00',
    1,
  );
  await insertOrder(
    database,
    orderPrevious,
    userB,
    'paid',
    '700.00',
    '2026-07-30T10:00:00',
    productA,
    '700.00',
    1,
  );

  return {
    categoryIds: [categoryA, categoryB],
    productIds: [productA, productB],
    userIds: [userA, userB],
    orderIds: [
      orderCurrentA1,
      orderCurrentA2,
      orderCurrentB,
      orderCancelled,
      orderPending,
      orderPrevious,
    ],
  };
}

async function insertCategory(
  database: IntegrationDatabase,
  name: string,
): Promise<string> {
  const result = await database.query<{ id: string }>(
    `INSERT INTO catalog.categories (name) VALUES ($1) RETURNING id::text AS id`,
    [name],
  );
  const id = result.rows[0]?.id;

  if (!id) {
    throw new Error('통합 테스트 카테고리를 생성하지 못했습니다.');
  }

  return id;
}

async function insertOrder(
  database: IntegrationDatabase,
  orderId: string,
  userId: string,
  status: string,
  totalAmount: string,
  createdAt: string,
  productId: string,
  unitPrice: string,
  quantity: number,
): Promise<void> {
  await database.query(
    `
      INSERT INTO sales.orders
        (id, user_id, status, total_amount, subtotal, shipping_fee, discount_amount, created_at)
      VALUES ($1, $2, $3, $4, $4, 0, 0, $5)
    `,
    [orderId, userId, status, totalAmount, seoulTimestamp(createdAt)],
  );
  await database.query(
    `
      INSERT INTO sales.order_items
        (order_id, product_id, product_name, unit_price, quantity)
      SELECT $1, p.id, p.name, $2, $3
      FROM catalog.products AS p
      WHERE p.id = $4
    `,
    [orderId, unitPrice, quantity, productId],
  );
}

function seoulTimestamp(value: string): Date {
  return new Date(`${value}+09:00`);
}
