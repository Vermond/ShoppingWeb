import { InternalServerErrorException } from '@nestjs/common';
import type { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import type { CategoryRow } from './categories.types';

describe('CategoriesService', () => {
  it('returns all categories from the repository', async () => {
    const categories: CategoryRow[] = [
      {
        id: '1',
        name: 'Category',
        product_count: 3,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        updated_at: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];
    const repository = {
      findAll: jest.fn().mockResolvedValue(categories),
    } as unknown as CategoriesRepository;
    const service = new CategoriesService(repository);

    await expect(service.findAll()).resolves.toBe(categories);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
  });

  it('maps repository failures to an internal server error', async () => {
    const repository = {
      findAll: jest.fn().mockRejectedValue(new Error('database failed')),
    } as unknown as CategoriesRepository;
    const service = new CategoriesService(repository);

    await expect(service.findAll()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
