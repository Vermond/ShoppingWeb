import { NotFoundException } from '@nestjs/common';
import type { AdminProductsRepository } from './admin-products.repository';
import {
  AdminProductCategoryNotFoundError,
  AdminProductNotFoundError,
} from './admin-products.repository';
import { AdminProductsService } from './admin-products.service';
import type {
  AdminProductDetailRow,
  AdminProductListRow,
} from './admin-products.types';
import { parseAdminProductListQuery } from './admin-products.input';

const productId = '11111111-1111-4111-8111-111111111111';

describe('AdminProductsService', () => {
  it('maps product pages and preserves status counts', async () => {
    const repository = {
      findPage: jest.fn().mockResolvedValue({
        rows: [createListRow()],
        totalCount: 1,
        statusCounts: { active: 1, inactive: 0, draft: 0, archived: 0 },
      }),
    } as unknown as AdminProductsRepository;
    const service = new AdminProductsService(repository);

    const result = await service.findPage(parseAdminProductListQuery({}));

    expect(result.totalCount).toBe(1);
    expect(result.products[0]?.price.toFixed(2)).toBe('28000.00');
    expect(result.products[0]?.sales_quantity).toBe(128);
    expect(result.statusCounts).toEqual({
      active: 1,
      inactive: 0,
      draft: 0,
      archived: 0,
    });
  });

  it('returns product detail through the service boundary', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(createDetailRow()),
    } as unknown as AdminProductsRepository;
    const service = new AdminProductsService(repository);

    const result = await service.findOne(productId);

    expect(result.price.toFixed(2)).toBe('28000.00');
    expect(result.images).toHaveLength(1);
  });

  it('maps missing products and categories to 404 responses', async () => {
    const missingProductRepository = {
      findById: jest.fn().mockResolvedValue(null),
    } as unknown as AdminProductsRepository;
    const missingProductService = new AdminProductsService(
      missingProductRepository,
    );

    await expect(
      missingProductService.findOne(productId),
    ).rejects.toBeInstanceOf(NotFoundException);

    const missingCategoryRepository = {
      create: jest
        .fn()
        .mockRejectedValue(new AdminProductCategoryNotFoundError()),
    } as unknown as AdminProductsRepository;
    const missingCategoryService = new AdminProductsService(
      missingCategoryRepository,
    );

    await expect(
      missingCategoryService.create({
        name: '상품',
        category_id: '99',
        description: null,
        price: '1.00',
        stock: 1,
        max_order_quantity: 1,
        status: 'draft',
        images: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('supports status and stock updates and maps missing products', async () => {
    const repository = {
      update: jest.fn().mockResolvedValue(createDetailRow()),
      updateStock: jest.fn().mockResolvedValue(createDetailRow({ stock: 20 })),
    } as unknown as AdminProductsRepository;
    const service = new AdminProductsService(repository);

    const updated = await service.updateStatus(productId, {
      status: 'inactive',
    });
    const stockUpdated = await service.updateStock(productId, { stock: 20 });

    expect(updated.status).toBe('active');
    expect(stockUpdated.stock).toBe(20);
    expect(repository.update).toHaveBeenCalledWith(productId, {
      status: 'inactive',
    });

    const missingRepository = {
      update: jest.fn().mockRejectedValue(new AdminProductNotFoundError()),
    } as unknown as AdminProductsRepository;
    const missingService = new AdminProductsService(missingRepository);

    await expect(
      missingService.update(productId, { name: '상품' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createListRow(): AdminProductListRow {
  return {
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
    created_at: new Date('2026-08-01T00:00:00.000Z'),
    updated_at: new Date('2026-08-02T00:00:00.000Z'),
  };
}

function createDetailRow(
  overrides: Partial<AdminProductDetailRow> = {},
): AdminProductDetailRow {
  return {
    ...createListRow(),
    description: '상품 설명',
    images: [
      {
        id: '1',
        product_id: productId,
        image_url: 'https://example.com/mug.png',
        sort_order: 0,
        created_at: new Date('2026-08-01T00:00:00.000Z'),
      },
    ],
    ...overrides,
  };
}
