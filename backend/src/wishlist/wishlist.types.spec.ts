import Decimal from 'decimal.js';
import {
  serializeWishlistItem,
  toWishlistItemRecord,
  type WishlistItemRow,
} from './wishlist.types';

const row: WishlistItemRow = {
  user_id: '11111111-1111-4111-8111-111111111111',
  product_id: '22222222-2222-4222-8222-222222222222',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  product: {
    id: '22222222-2222-4222-8222-222222222222',
    category_id: '1',
    name: 'Product',
    description: 'Description',
    price: '12900.00',
    stock: 5,
    max_order_quantity: 3,
    status: 'active',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  },
  image_url: 'https://example.com/product.png',
};

describe('wishlist types', () => {
  it('converts database prices to Decimal and serializes them as strings', () => {
    const item = toWishlistItemRecord(row);

    expect(item.product.price).toBeInstanceOf(Decimal);
    expect(serializeWishlistItem(item)).toEqual({
      product_id: row.product_id,
      created_at: '2026-01-01T00:00:00.000Z',
      product: {
        id: row.product.id,
        category_id: row.product.category_id,
        name: row.product.name,
        description: row.product.description,
        price: '12900.00',
        stock: row.product.stock,
        max_order_quantity: row.product.max_order_quantity,
        status: row.product.status,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        image_url: row.image_url,
      },
    });
  });
});
