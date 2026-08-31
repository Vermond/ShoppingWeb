import Decimal from 'decimal.js';
import {
  serializeAdminProduct,
  serializeAdminProductDetail,
  toAdminProductDetailRecord,
  toAdminProductRecord,
} from './admin-products.types';

const productId = '11111111-1111-4111-8111-111111111111';

describe('admin product types', () => {
  it('serializes list products with decimal prices and sales quantity', () => {
    const product = toAdminProductRecord({
      id: productId,
      category_id: '1',
      category_name: '리빙',
      name: '세라믹 머그',
      representative_image_url: 'https://example.com/mug.png',
      price: '28000',
      stock: 8,
      max_order_quantity: 5,
      sales_quantity: 128,
      status: 'active',
      created_at: new Date('2026-08-01T00:00:00.000Z'),
      updated_at: new Date('2026-08-02T00:00:00.000Z'),
    });

    expect(product.price).toEqual(new Decimal('28000'));
    expect(serializeAdminProduct(product)).toEqual({
      id: productId,
      name: '세라믹 머그',
      representative_image_url: 'https://example.com/mug.png',
      category_id: '1',
      category_name: '리빙',
      price: '28000.00',
      stock: 8,
      max_order_quantity: 5,
      sales_quantity: 128,
      status: 'active',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-02T00:00:00.000Z',
    });
  });

  it('serializes repository-ordered detail images and exposes the representative image', () => {
    const product = toAdminProductDetailRecord({
      id: productId,
      category_id: '1',
      category_name: '리빙',
      name: '세라믹 머그',
      description: '상품 설명',
      price: '28000.00',
      stock: 8,
      max_order_quantity: 5,
      sales_quantity: 128,
      status: 'active',
      created_at: new Date('2026-08-01T00:00:00.000Z'),
      updated_at: new Date('2026-08-02T00:00:00.000Z'),
      images: [
        {
          id: '1',
          product_id: productId,
          image_url: 'https://example.com/first.png',
          sort_order: 0,
          created_at: new Date('2026-08-01T00:00:00.000Z'),
        },
        {
          id: '2',
          product_id: productId,
          image_url: 'https://example.com/second.png',
          sort_order: 1,
          created_at: new Date('2026-08-02T00:00:00.000Z'),
        },
      ],
    });

    expect(serializeAdminProductDetail(product)).toMatchObject({
      representative_image_url: 'https://example.com/first.png',
      images: [
        { image_url: 'https://example.com/first.png', sort_order: 0 },
        { image_url: 'https://example.com/second.png', sort_order: 1 },
      ],
    });
  });
});
