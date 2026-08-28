import type { DatabaseService } from '../database/database.service';
import { CategoriesRepository } from './categories.repository';
import type { CategoryRow } from './categories.types';

describe('CategoriesRepository', () => {
  it('selects category columns in a stable order', async () => {
    const category: CategoryRow = {
      id: '1',
      name: 'Category',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    };
    const databaseService = {
      query: jest.fn().mockResolvedValue({ rows: [category] }),
    } as unknown as DatabaseService;
    const repository = new CategoriesRepository(databaseService);

    await expect(repository.findAll()).resolves.toEqual([category]);

    const query = databaseService.query.mock.calls[0]?.[0] as string;
    expect(query).toContain('SELECT id, name, created_at, updated_at');
    expect(query).toContain('ORDER BY created_at ASC, id ASC');
    expect(query).not.toMatch(/SELECT\s+\*/i);
  });
});
