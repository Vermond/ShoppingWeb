import type { DatabaseService } from '../database/database.service';
import { ProductsRepository } from './products.repository';

describe('ProductsRepository', () => {
  it('selects the required product columns without SELECT *', async () => {
    const databaseService = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: 'product-1' }] }),
    } as unknown as DatabaseService;
    const repository = new ProductsRepository(databaseService);

    await expect(repository.findAll()).resolves.toEqual([{ id: 'product-1' }]);

    const query = databaseService.query.mock.calls[0]?.[0] as string;
    expect(query).toContain(
      'SELECT id, category_id, name, description, price, stock, status',
    );
    expect(query).toContain('created_at, updated_at');
    expect(query).not.toMatch(/SELECT\s+\*/i);
  });
});
