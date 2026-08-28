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
      findAll: jest.fn().mockResolvedValue([product]),
    } as unknown as ProductsRepository;
    const service = new ProductsService(repository);

    const products = await service.findAll();

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      ...product,
      price: expect.any(Decimal),
    });
    expect(products[0]?.price.toFixed(2)).toBe('12900.00');
    expect(repository.findAll).toHaveBeenCalledTimes(1);
  });

  it('maps repository failures to an internal server error', async () => {
    const repository = {
      findAll: jest.fn().mockRejectedValue(new Error('database failed')),
    } as unknown as ProductsRepository;
    const service = new ProductsService(repository);

    await expect(service.findAll()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
