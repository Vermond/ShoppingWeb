import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import { ProductsRepository } from './products.repository';
import type { ProductRow } from './products.types';

describe('ProductsRepository', () => {
  it('counts and selects the requested product page without SELECT *', async () => {
    const product: ProductRow = {
      id: 'product-1',
      category_id: '1',
      name: 'Product',
      description: null,
      price: '12900.00',
      stock: 3,
      status: 'active',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    };
    const executor = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ total_items: 21 }] })
        .mockResolvedValueOnce({ rows: [product] }),
    } as unknown as DatabaseQueryExecutor;
    const databaseService = {
      transaction: jest.fn((callback) => callback(executor)),
    } as unknown as DatabaseService;
    const repository = new ProductsRepository(databaseService);

    await expect(repository.findPage(20, 20)).resolves.toEqual({
      rows: [product],
      totalItems: 21,
    });

    const countQuery = executor.query.mock.calls[0]?.[0] as string;
    const productsQuery = executor.query.mock.calls[1]?.[0] as string;
    expect(countQuery).toContain('SELECT COUNT(*)::int AS total_items');
    expect(countQuery).toContain("WHERE status = 'active'");
    expect(productsQuery).toContain(
      'SELECT id, category_id, name, description, price, stock, status',
    );
    expect(productsQuery).toContain('created_at, updated_at');
    expect(productsQuery).toContain("WHERE status = 'active'");
    expect(productsQuery).toContain('ORDER BY created_at DESC, id DESC');
    expect(productsQuery).toContain('LIMIT $1 OFFSET $2');
    expect(productsQuery).not.toMatch(/SELECT\s+\*/i);
    expect(executor.query).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      [20, 20],
    );
  });

  it('selects an active product and its images in display order', async () => {
    const productId = '11111111-1111-4111-8111-111111111111';
    const queryRow = {
      id: productId,
      category_id: '1',
      name: 'Product',
      description: null,
      price: '12900.00',
      stock: 3,
      status: 'active',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      image_id: '1',
      image_url: 'https://example.com/product.png',
      image_sort_order: 0,
      image_created_at: new Date('2026-01-01T00:00:00.000Z'),
    };
    const executor = {
      query: jest.fn().mockResolvedValue({ rows: [queryRow] }),
    } as unknown as DatabaseService;
    const repository = new ProductsRepository(executor);

    await expect(repository.findById(productId)).resolves.toEqual({
      id: productId,
      category_id: '1',
      name: 'Product',
      description: null,
      price: '12900.00',
      stock: 3,
      status: 'active',
      created_at: queryRow.created_at,
      updated_at: queryRow.updated_at,
      images: [
        {
          id: '1',
          product_id: productId,
          image_url: 'https://example.com/product.png',
          sort_order: 0,
          created_at: queryRow.image_created_at,
        },
      ],
    });

    const query = executor.query.mock.calls[0]?.[0] as string;
    expect(query).toContain(
      'SELECT p.id, p.category_id, p.name, p.description, p.price, p.stock',
    );
    expect(query).toContain('LEFT JOIN catalog.product_images AS pi');
    expect(query).toContain("p.status = 'active'");
    expect(query).toContain('ORDER BY pi.sort_order ASC NULLS LAST, pi.id ASC');
    expect(query).not.toMatch(/SELECT\s+\*/i);
    expect(executor.query).toHaveBeenCalledWith(expect.any(String), [
      productId,
    ]);
  });

  it('returns null when an active product is not found', async () => {
    const databaseService = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseService;
    const repository = new ProductsRepository(databaseService);

    await expect(repository.findById('missing-product')).resolves.toBeNull();
  });
});
