import { InternalServerErrorException } from '@nestjs/common';
import type { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';
import Decimal from 'decimal.js';
import type { ProductRow } from './products.types';

describe('ProductsService', () => {
  it('converts database price strings to Decimal values', async () => {
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
    const repository = {
      findPage: jest.fn().mockResolvedValue({
        rows: [product],
        totalItems: 41,
      }),
    } as unknown as ProductsRepository;
    const service = new ProductsService(repository);

    const result = await service.findPage({ page: 2, limit: 20 });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      ...product,
      price: expect.any(Decimal),
    });
    expect(result.products[0]?.price.toFixed(2)).toBe('12900.00');
    expect(result.pagination).toEqual({
      page: 2,
      limit: 20,
      totalItems: 41,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(repository.findPage).toHaveBeenCalledWith(20, 20);
  });

  it('maps repository failures to an internal server error', async () => {
    const repository = {
      findPage: jest.fn().mockRejectedValue(new Error('database failed')),
    } as unknown as ProductsRepository;
    const service = new ProductsService(repository);

    await expect(
      service.findPage({ page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
