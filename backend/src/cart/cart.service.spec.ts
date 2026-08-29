import { ConflictException, NotFoundException } from '@nestjs/common';
import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import type { ProductRow } from '../products/products.types';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';
import type { CartRow } from './cart.types';

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

const cartRow: CartRow = {
  id: '22222222-2222-4222-8222-222222222222',
  user_id: '33333333-3333-4333-8333-333333333333',
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  items: [],
};

function createService() {
  const executor = {} as DatabaseQueryExecutor;
  const repository = {
    getOrCreateCartId: jest.fn().mockResolvedValue(cartRow.id),
    findCartIdByUserId: jest.fn().mockResolvedValue(cartRow.id),
    findByUserId: jest.fn().mockResolvedValue(cartRow),
    findProductByIdForUpdate: jest.fn().mockResolvedValue(product),
    findItemForUpdate: jest.fn().mockResolvedValue(null),
    insertItem: jest.fn().mockResolvedValue(undefined),
    updateItem: jest.fn().mockResolvedValue(undefined),
    deleteItem: jest.fn().mockResolvedValue(true),
    touchCart: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<CartRepository>;
  const databaseService = {
    transaction: jest.fn(
      (callback: (executor: DatabaseQueryExecutor) => Promise<unknown>) =>
        callback(executor),
    ),
  } as unknown as DatabaseService;

  return { service: new CartService(databaseService, repository), repository };
}

describe('CartService', () => {
  it('adds a new item within the current user cart', async () => {
    const { service, repository } = createService();

    await service.addItem('user-1', { product_id: product.id, quantity: 2 });

    expect(repository.insertItem).toHaveBeenCalledWith(
      cartRow.id,
      product.id,
      2,
      expect.anything(),
    );
    expect(repository.touchCart).toHaveBeenCalled();
  });

  it('merges an existing item and rejects quantities above the product limit', async () => {
    const { service, repository } = createService();
    repository.findItemForUpdate.mockResolvedValue({ id: '1', quantity: 2 });

    await expect(
      service.addItem('user-1', { product_id: product.id, quantity: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.updateItem).not.toHaveBeenCalled();
    expect(repository.touchCart).not.toHaveBeenCalled();
  });

  it('rejects unavailable products and missing cart items', async () => {
    const unavailable = createService();
    unavailable.repository.findProductByIdForUpdate.mockResolvedValue({
      ...product,
      status: 'inactive',
    });
    await expect(
      unavailable.service.addItem('user-1', {
        product_id: product.id,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    const missing = createService();
    missing.repository.findItemForUpdate.mockResolvedValue(null);
    await expect(
      missing.service.updateItem('user-1', product.id, { quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and removes items only through the user cart', async () => {
    const updated = createService();
    updated.repository.findItemForUpdate.mockResolvedValue({
      id: '1',
      quantity: 1,
    });
    await updated.service.updateItem('user-1', product.id, { quantity: 2 });
    expect(updated.repository.updateItem).toHaveBeenCalledWith(
      '1',
      2,
      expect.anything(),
    );

    const removed = createService();
    await removed.service.removeItem('user-1', product.id);
    expect(removed.repository.deleteItem).toHaveBeenCalledWith(
      cartRow.id,
      product.id,
      expect.anything(),
    );
  });
});
