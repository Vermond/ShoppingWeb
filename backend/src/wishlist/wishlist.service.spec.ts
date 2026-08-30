import { ConflictException, NotFoundException } from '@nestjs/common';
import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import type { ProductRow } from '../products/products.types';
import { WishlistRepository } from './wishlist.repository';
import { WishlistService } from './wishlist.service';
import type { WishlistItemRow } from './wishlist.types';

const product: ProductRow = {
  id: '11111111-1111-4111-8111-111111111111',
  category_id: '1',
  name: 'Product',
  description: null,
  price: '12900.00',
  stock: 5,
  max_order_quantity: 3,
  status: 'active',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

const item: WishlistItemRow = {
  user_id: 'user-1',
  product_id: product.id,
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  product,
  image_url: null,
};

function createService() {
  const executor = {} as DatabaseQueryExecutor;
  const repository = {
    findAllByUserId: jest.fn().mockResolvedValue([item]),
    findByUserIdAndProductId: jest.fn().mockResolvedValue(item),
    findProductById: jest.fn().mockResolvedValue(product),
    insertItem: jest.fn().mockResolvedValue(undefined),
    deleteItem: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<WishlistRepository>;
  const databaseService = {
    transaction: jest.fn(
      (callback: (executor: DatabaseQueryExecutor) => Promise<unknown>) =>
        callback(executor),
    ),
  } as unknown as DatabaseService;

  return {
    service: new WishlistService(databaseService, repository),
    repository,
  };
}

describe('WishlistService', () => {
  it('lists and adds active products for the authenticated user', async () => {
    const { service, repository } = createService();

    await expect(service.findAllByUserId('user-1')).resolves.toHaveLength(1);
    await expect(
      service.addItem('user-1', { product_id: product.id }),
    ).resolves.toMatchObject({ product_id: product.id });

    expect(repository.insertItem).toHaveBeenCalledWith(
      'user-1',
      product.id,
      expect.anything(),
    );
    expect(repository.findByUserIdAndProductId).toHaveBeenCalledWith(
      'user-1',
      product.id,
      expect.anything(),
    );
  });

  it('rejects missing and unavailable products', async () => {
    const missing = createService();
    missing.repository.findProductById.mockResolvedValue(null);
    await expect(
      missing.service.addItem('user-1', { product_id: product.id }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const unavailable = createService();
    unavailable.repository.findProductById.mockResolvedValue({
      ...product,
      status: 'inactive',
    });
    await expect(
      unavailable.service.addItem('user-1', { product_id: product.id }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(unavailable.repository.insertItem).not.toHaveBeenCalled();
  });

  it('removes only the authenticated user item and rejects missing items', async () => {
    const removed = createService();
    await expect(
      removed.service.removeItem('user-1', product.id),
    ).resolves.toBe(undefined);
    expect(removed.repository.deleteItem).toHaveBeenCalledWith(
      'user-1',
      product.id,
    );

    const missing = createService();
    missing.repository.deleteItem.mockResolvedValue(false);
    await expect(
      missing.service.removeItem('user-1', product.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
