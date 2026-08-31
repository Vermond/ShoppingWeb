import type { DatabaseService } from '../database/database.service';
import { CategoriesRepository } from './categories.repository';
import type { CategoryRow } from './categories.types';

describe('CategoriesRepository', () => {
  it('selects category columns in a stable order', async () => {
    const category: CategoryRow = {
      id: '1',
      name: 'Category',
      product_count: 3,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    };
    const databaseService = {
      query: jest.fn().mockResolvedValue({ rows: [category] }),
    } as unknown as DatabaseService;
    const repository = new CategoriesRepository(databaseService);

    await expect(repository.findAll()).resolves.toEqual([category]);

    const query = databaseService.query.mock.calls[0]?.[0] as string;
    expect(query).toContain('SELECT c.id');
    expect(query).toContain('COUNT(p.id)::int AS product_count');
    expect(query).toContain("p.status = 'active'");
    expect(query).toContain('GROUP BY c.id, c.name, c.created_at, c.updated_at');
    expect(query).toContain('ORDER BY c.created_at ASC, c.id ASC');
    expect(query).not.toMatch(/SELECT\s+\*/i);
  });
});
