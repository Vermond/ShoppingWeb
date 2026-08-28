import type { DatabaseService } from '../database/database.service';
import { ProductsRepository } from './products.repository';
import type { ProductRow } from './products.types';

describe('ProductsRepository', () => {
  it('selects the required product columns without SELECT *', async () => {
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
    const databaseService = {
      query: jest.fn().mockResolvedValue({ rows: [product] }),
    } as unknown as DatabaseService;
    const repository = new ProductsRepository(databaseService);

    await expect(repository.findAll()).resolves.toEqual([product]);

    const query = databaseService.query.mock.calls[0]?.[0] as string;
    expect(query).toContain(
      'SELECT id, category_id, name, description, price, stock, status',
    );
    expect(query).toContain('created_at, updated_at');
    expect(query).not.toMatch(/SELECT\s+\*/i);
  });
});
