import { BadRequestException } from '@nestjs/common';
import {
  parseAdminProductCreateInput,
  parseAdminProductListQuery,
  parseAdminProductStockInput,
  parseAdminProductStatusInput,
  parseAdminProductUpdateInput,
} from './admin-products.input';

describe('admin product input', () => {
  it('parses list filters, pagination, and sort', () => {
    expect(
      parseAdminProductListQuery({
        search: '  머그 ',
        category_id: '001',
        status: 'active',
        low_stock_threshold: '10',
        sort: 'sales_desc',
        page: '2',
        page_size: '50',
      }),
    ).toEqual({
      search: '머그',
      categoryId: '1',
      status: 'active',
      lowStockThreshold: 10,
      sort: 'sales_desc',
      page: 2,
      pageSize: 50,
    });
  });

  it('parses product creation values and defaults new products to draft', () => {
    expect(
      parseAdminProductCreateInput({
        name: '  세라믹 머그 ',
        category_id: '1',
        description: '  상품 설명  ',
        price: '28000',
        stock: 10,
        max_order_quantity: 5,
        images: [
          {
            image_url: 'https://example.com/mug.png',
            sort_order: 0,
          },
        ],
      }),
    ).toEqual({
      name: '세라믹 머그',
      category_id: '1',
      description: '상품 설명',
      price: '28000.00',
      stock: 10,
      max_order_quantity: 5,
      status: 'draft',
      images: [
        {
          image_url: 'https://example.com/mug.png',
          sort_order: 0,
        },
      ],
    });
  });

  it('supports partial updates and explicit image replacement', () => {
    expect(
      parseAdminProductUpdateInput({
        description: null,
        price: '12900.50',
        images: [],
      }),
    ).toEqual({
      description: null,
      price: '12900.50',
      images: [],
    });
  });

  it('parses status and stock update bodies', () => {
    expect(parseAdminProductStatusInput({ status: 'archived' })).toEqual({
      status: 'archived',
    });
    expect(parseAdminProductStockInput({ stock: 0 })).toEqual({ stock: 0 });
  });

  it.each([
    [
      {
        price: '-1',
        category_id: '1',
        name: '상품',
        stock: 1,
        max_order_quantity: 1,
      },
      'price',
    ],
    [
      {
        price: '1.234',
        category_id: '1',
        name: '상품',
        stock: 1,
        max_order_quantity: 1,
      },
      'price',
    ],
    [
      {
        price: '1',
        category_id: '0',
        name: '상품',
        stock: 1,
        max_order_quantity: 1,
      },
      'category_id',
    ],
    [
      {
        price: '1',
        category_id: '1',
        name: '상품',
        stock: -1,
        max_order_quantity: 1,
      },
      'stock',
    ],
    [
      {
        price: '1',
        category_id: '1',
        name: '상품',
        stock: 1,
        max_order_quantity: 0,
      },
      'max_order_quantity',
    ],
    [
      {
        price: '1',
        category_id: '1',
        name: '상품',
        stock: 1,
        max_order_quantity: 1,
        status: 'unknown',
      },
      'status',
    ],
  ])('rejects invalid product values %#', (body, field) => {
    expect(() => parseAdminProductCreateInput(body)).toThrow(new RegExp(field));
  });

  it('rejects unsupported fields and duplicate image order', () => {
    expect(() =>
      parseAdminProductUpdateInput({ name: '상품', unexpected: true }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseAdminProductCreateInput({
        name: '상품',
        category_id: '1',
        price: '1.00',
        stock: 1,
        max_order_quantity: 1,
        images: [
          { image_url: 'https://example.com/a.png', sort_order: 0 },
          { image_url: 'https://example.com/b.png', sort_order: 0 },
        ],
      }),
    ).toThrow(/sort_order가 중복/);
  });
});
