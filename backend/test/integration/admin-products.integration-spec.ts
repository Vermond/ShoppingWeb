import { randomUUID } from 'node:crypto';
import type { DatabaseService } from '../../src/database/database.service';
import {
  parseAdminProductListQuery,
  type AdminProductCreateInput,
} from '../../src/admin/admin-products.input';
import { AdminProductsRepository } from '../../src/admin/admin-products.repository';
import { AdminProductsService } from '../../src/admin/admin-products.service';
import {
  assertRequiredSchema,
  createIntegrationDatabase,
  type IntegrationDatabase,
} from './integration-database';

describe('Admin products database integration', () => {
  let database: IntegrationDatabase | undefined;
  let categoryId: string | undefined;
  let productId: string | undefined;

  beforeAll(async () => {
    database = createIntegrationDatabase();
    await database.query('SELECT 1');
    await assertRequiredSchema(database);

    const categoryResult = await database.query<{ id: string }>(
      `
        INSERT INTO catalog.categories (name)
        VALUES ($1)
        RETURNING id::text AS id
      `,
      [`Admin Product Category ${randomUUID().slice(0, 8)}`],
    );
    categoryId = categoryResult.rows[0]?.id;

    if (!categoryId) {
      throw new Error('통합 테스트 카테고리를 생성하지 못했습니다.');
    }
  });

  afterAll(async () => {
    if (!database) {
      return;
    }

    if (productId) {
      await database.query(
        'DELETE FROM catalog.product_images WHERE product_id = $1',
        [productId],
      );
      await database.query('DELETE FROM catalog.products WHERE id = $1', [
        productId,
      ]);
    }

    if (categoryId) {
      await database.query('DELETE FROM catalog.categories WHERE id = $1', [
        categoryId,
      ]);
    }

    await database.close();
  });

  it('creates, lists, updates, and locks a product row using real PostgreSQL', async () => {
    const repository = new AdminProductsRepository(
      database as unknown as DatabaseService,
    );
    const service = new AdminProductsService(repository);
    const input: AdminProductCreateInput = {
      name: `Admin Product ${randomUUID().slice(0, 8)}`,
      category_id: categoryId!,
      description: '통합 테스트 상품',
      price: '12900.00',
      stock: 10,
      max_order_quantity: 3,
      status: 'draft',
      images: [
        {
          image_url: 'https://example.com/integration-product.png',
          sort_order: 0,
        },
      ],
    };

    const created = await service.create(input);
    productId = created.id;

    expect(created.price.toFixed(2)).toBe('12900.00');
    expect(created.status).toBe('draft');
    expect(created.images).toHaveLength(1);

    const listed = await service.findPage(
      parseAdminProductListQuery({
        search: input.name,
        status: 'draft',
        page: '1',
        page_size: '10',
      }),
    );

    expect(listed.totalCount).toBe(1);
    expect(listed.products[0]?.id).toBe(created.id);
    expect(listed.products[0]?.price.toFixed(2)).toBe('12900.00');

    const updated = await service.update(created.id, {
      price: '13000.00',
      status: 'active',
      images: [],
    });
    expect(updated.price.toFixed(2)).toBe('13000.00');
    expect(updated.status).toBe('active');
    expect(updated.images).toEqual([]);

    const stockUpdated = await service.updateStock(created.id, { stock: 4 });
    expect(stockUpdated.stock).toBe(4);

    const detail = await service.findOne(created.id);
    expect(detail.stock).toBe(4);
    expect(detail.price.toFixed(2)).toBe('13000.00');
  });
});
