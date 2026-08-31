import type {
  DatabaseQueryExecutor,
  DatabaseService,
} from '../database/database.service';
import { WishlistRepository } from './wishlist.repository';

describe('WishlistRepository', () => {
  it('maps wishlist items with explicit product columns and primary image', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const productId = '22222222-2222-4222-8222-222222222222';
    const row = {
      user_id: userId,
      wishlist_product_id: productId,
      wishlist_created_at: new Date('2026-01-01T00:00:00.000Z'),
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
    const databaseService = {
      query: jest.fn().mockResolvedValue({ rows: [row] }),
    } as unknown as DatabaseService;
    const repository = new WishlistRepository(databaseService);

    await expect(repository.findAllByUserId(userId)).resolves.toEqual([
      {
        user_id: userId,
        product_id: productId,
        created_at: row.wishlist_created_at,
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
        image_url: row.image_url,
      },
    ]);

    const query = databaseService.query.mock.calls[0]?.[0] as string;
    expect(query).toContain('FROM wishlist.wishlist_items AS wi');
    expect(query).toContain('INNER JOIN catalog.products AS p');
    expect(query).toContain('ORDER BY wi.created_at DESC, wi.product_id DESC');
    expect(query).toContain('LEFT JOIN LATERAL');
    expect(query).not.toMatch(/SELECT\s+\*/i);
    expect(databaseService.query).toHaveBeenCalledWith(expect.any(String), [
      userId,
    ]);
  });

  it('uses the supplied transaction executor for product validation and item lookup', async () => {
    const productId = '22222222-2222-4222-8222-222222222222';
    const row = {
      id: productId,
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
    const executor = {
      query: jest.fn().mockResolvedValue({ rows: [row] }),
    } as unknown as DatabaseQueryExecutor;
    const databaseService = {
      query: jest.fn(),
    } as unknown as DatabaseService;
    const repository = new WishlistRepository(databaseService);

    await expect(
      repository.findProductById(productId, executor),
    ).resolves.toEqual(row);
    expect(executor.query).toHaveBeenCalledWith(expect.any(String), [
      productId,
    ]);
    expect(databaseService.query).not.toHaveBeenCalled();
  });
});
