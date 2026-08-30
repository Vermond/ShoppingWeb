import type { DatabaseService } from '../database/database.service';
import { parseAdminProductListQuery } from './admin-products.input';
import {
  AdminProductCategoryNotFoundError,
  AdminProductNotFoundError,
  AdminProductsRepository,
} from './admin-products.repository';

const productId = '11111111-1111-4111-8111-111111111111';

describe('AdminProductsRepository', () => {
  it('queries paginated products, total count, and status counts', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: productId,
            category_id: '1',
            category_name: '리빙',
            name: '세라믹 머그',
            representative_image_url: 'https://example.com/mug.png',
            price: '28000.00',
            stock: 8,
            max_order_quantity: 5,
            sales_quantity: 128,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total_count: 1 }] })
      .mockResolvedValueOnce({ rows: [{ status: 'active', count: 1 }] });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminProductsRepository(databaseService);
    const listQuery = parseAdminProductListQuery({
      search: '머그',
      category_id: '1',
      status: 'active',
      low_stock_threshold: '10',
      sort: 'sales_desc',
      page: '2',
      page_size: '20',
    });

    const result = await repository.findPage(listQuery);

    expect(result.totalCount).toBe(1);
    expect(result.statusCounts.active).toBe(1);
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[0]?.[1]).toEqual([
      '머그',
      '1',
      'active',
      10,
      20,
      20,
    ]);

    expect(query.mock.calls[2]?.[1]).toEqual(['머그', '1', 10]);

    const listSql = query.mock.calls[0]?.[0] as string;
    const statusCountSql = query.mock.calls[2]?.[0] as string;
    expect(listSql).toContain("p.name ILIKE '%' || $1 || '%'");
    expect(listSql).toContain('p.category_id = $2');
    expect(listSql).toContain('p.status = $3');
    expect(listSql).toContain('p.stock <= $4');
    expect(listSql).toContain("o.status IN ('paid', 'shipped', 'completed')");
    expect(listSql).toContain(
      'ORDER BY COALESCE(sales.sales_quantity, 0) DESC',
    );
    expect(statusCountSql).not.toContain('p.status = $3');
    expect(statusCountSql).toContain('p.stock <= $3');
  });

  it('loads all-state detail and images', async () => {
    const createdAt = new Date('2026-08-01T00:00:00.000Z');
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: productId,
            category_id: '1',
            category_name: '리빙',
            name: '세라믹 머그',
            description: '상품 설명',
            price: '28000.00',
            stock: 8,
            max_order_quantity: 5,
            sales_quantity: 128,
            status: 'draft',
            created_at: createdAt,
            updated_at: createdAt,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            product_id: productId,
            image_url: 'https://example.com/mug.png',
            sort_order: 0,
            created_at: createdAt,
          },
        ],
      });
    const repository = new AdminProductsRepository({
      query,
    } as DatabaseService);

    const result = await repository.findById(productId);

    expect(result?.status).toBe('draft');
    expect(result?.images[0]?.image_url).toBe('https://example.com/mug.png');
    expect(query.mock.calls[0]?.[0]).toContain('FROM catalog.products AS p');
    expect(query.mock.calls[0]?.[0]).not.toContain("p.status = 'active'");
    expect(query.mock.calls[1]?.[0]).toContain(
      'ORDER BY sort_order ASC, id ASC',
    );
  });

  it('creates a product after checking the category and replaces its images', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: productId }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: productId,
            category_id: '1',
            category_name: '리빙',
            name: '세라믹 머그',
            description: null,
            price: '28000.00',
            stock: 10,
            max_order_quantity: 5,
            sales_quantity: 0,
            status: 'draft',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminProductsRepository(databaseService);

    await repository.create({
      name: '세라믹 머그',
      category_id: '1',
      description: null,
      price: '28000.00',
      stock: 10,
      max_order_quantity: 5,
      status: 'draft',
      images: [{ image_url: 'https://example.com/mug.png', sort_order: 0 }],
    });

    expect(query.mock.calls[0]?.[0]).toContain('FROM catalog.categories');
    expect(query.mock.calls[1]?.[0]).toContain('INSERT INTO catalog.products');
    expect(query.mock.calls[3]?.[1]).toEqual([
      productId,
      'https://example.com/mug.png',
      0,
    ]);
  });

  it('locks an existing product before updating stock', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: productId, stock: 4 }] })
      .mockResolvedValueOnce({ rows: [{ id: productId }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: productId,
            category_id: '1',
            category_name: '리빙',
            name: '상품',
            description: null,
            price: '100.00',
            stock: 20,
            max_order_quantity: 1,
            sales_quantity: 0,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const databaseService = {
      transaction: jest.fn(
        (callback: (executor: { query: typeof query }) => unknown) =>
          callback({ query }),
      ),
    } as unknown as DatabaseService;
    const repository = new AdminProductsRepository(databaseService);

    await repository.updateStock(productId, 20);

    expect(query.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(query.mock.calls[1]?.[1]).toEqual([productId, 20]);
  });

  it('throws typed errors for missing product or category', async () => {
    const missingProductQuery = jest.fn().mockResolvedValue({ rows: [] });
    const missingProductRepository = new AdminProductsRepository({
      transaction: jest.fn(
        (
          callback: (executor: {
            query: typeof missingProductQuery;
          }) => unknown,
        ) => callback({ query: missingProductQuery }),
      ),
    } as unknown as DatabaseService);

    await expect(
      missingProductRepository.update(productId, { name: '상품' }),
    ).rejects.toBeInstanceOf(AdminProductNotFoundError);

    const missingCategoryQuery = jest.fn().mockResolvedValue({ rows: [] });
    const missingCategoryRepository = new AdminProductsRepository({
      transaction: jest.fn(
        (
          callback: (executor: {
            query: typeof missingCategoryQuery;
          }) => unknown,
        ) => callback({ query: missingCategoryQuery }),
      ),
    } as unknown as DatabaseService);

    await expect(
      missingCategoryRepository.create({
        name: '상품',
        category_id: '99',
        description: null,
        price: '1.00',
        stock: 1,
        max_order_quantity: 1,
        status: 'draft',
        images: [],
      }),
    ).rejects.toBeInstanceOf(AdminProductCategoryNotFoundError);
  });
});
