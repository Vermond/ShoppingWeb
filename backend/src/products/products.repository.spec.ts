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
    expect(productsQuery).toContain(
      'SELECT id, category_id, name, description, price, stock, status',
    );
    expect(productsQuery).toContain('created_at, updated_at');
    expect(productsQuery).toContain('ORDER BY created_at DESC, id DESC');
    expect(productsQuery).toContain('LIMIT $1 OFFSET $2');
    expect(productsQuery).not.toMatch(/SELECT\s+\*/i);
    expect(executor.query).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      [20, 20],
    );
  });
});
