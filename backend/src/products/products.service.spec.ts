import { InternalServerErrorException } from '@nestjs/common';
import type { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  it('returns all products from the repository', async () => {
    const products = [{ id: 'product-1', name: 'Product' }];
    const repository = {
      findAll: jest.fn().mockResolvedValue(products),
    } as unknown as ProductsRepository;
    const service = new ProductsService(repository);

    await expect(service.findAll()).resolves.toBe(products);
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
