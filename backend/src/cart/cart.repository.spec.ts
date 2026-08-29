import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import { CartRepository } from './cart.repository';

describe('CartRepository', () => {
  it('maps cart items and product summaries from explicit columns', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const cartId = '22222222-2222-4222-8222-222222222222';
    const productId = '33333333-3333-4333-8333-333333333333';
    const row = {
      cart_id: cartId,
      user_id: userId,
      cart_updated_at: new Date('2026-01-01T00:00:00.000Z'),
      item_id: '1',
      item_cart_id: cartId,
      item_product_id: productId,
      item_quantity: 2,
      product_id: productId,
      category_id: '1',
      product_name: 'Product',
      product_description: null,
      product_price: '12900.00',
      product_stock: 5,
      product_max_order_quantity: 3,
      product_status: 'active',
      product_created_at: new Date('2026-01-01T00:00:00.000Z'),
      product_updated_at: new Date('2026-01-01T00:00:00.000Z'),
      image_url: 'https://example.com/product.png',
    };
    const executor = {
      query: jest.fn().mockResolvedValue({ rows: [row] }),
    } as unknown as DatabaseQueryExecutor;
    const repository = new CartRepository(
      executor as unknown as DatabaseService,
    );

    await expect(repository.findByUserId(userId, executor)).resolves.toEqual({
      id: cartId,
      user_id: userId,
      updated_at: row.cart_updated_at,
      items: [
        {
          id: '1',
          cart_id: cartId,
          product_id: productId,
          quantity: 2,
          product: {
            id: productId,
            category_id: '1',
            name: 'Product',
            description: null,
            price: '12900.00',
            stock: 5,
            max_order_quantity: 3,
            status: 'active',
            created_at: row.product_created_at,
            updated_at: row.product_updated_at,
          },
          image_url: 'https://example.com/product.png',
        },
      ],
    });

    const query = executor.query.mock.calls[0]?.[0] as string;
    expect(query).toContain('FROM cart.carts AS c');
    expect(query).toContain('LEFT JOIN cart.cart_items AS ci');
    expect(query).toContain(
      'p.max_order_quantity AS product_max_order_quantity',
    );
    expect(query).toContain('LEFT JOIN LATERAL');
    expect(query).not.toMatch(/SELECT\s+\*/i);
    expect(executor.query).toHaveBeenCalledWith(expect.any(String), [userId]);
  });

  it('returns null when a user has no cart', async () => {
    const databaseService = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as unknown as DatabaseService;
    const repository = new CartRepository(databaseService);
    const executor = databaseService as unknown as DatabaseQueryExecutor;

    await expect(
      repository.findByUserId('missing-user', executor),
    ).resolves.toBeNull();
  });
});
