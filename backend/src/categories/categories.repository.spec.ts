import type { DatabaseService } from '../database/database.service';
import { CategoriesRepository } from './categories.repository';

describe('CategoriesRepository', () => {
  it('selects category columns in a stable order', async () => {
    const databaseService = {
      query: jest.fn().mockResolvedValue({ rows: [{ id: 1 }] }),
    } as unknown as DatabaseService;
    const repository = new CategoriesRepository(databaseService);

    await expect(repository.findAll()).resolves.toEqual([{ id: 1 }]);

    const query = databaseService.query.mock.calls[0]?.[0] as string;
    expect(query).toContain('SELECT id, name, created_at, updated_at');
    expect(query).toContain('ORDER BY created_at ASC, id ASC');
    expect(query).not.toMatch(/SELECT\s+\*/i);
  });
});
