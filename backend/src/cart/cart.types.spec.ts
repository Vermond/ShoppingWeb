import Decimal from 'decimal.js';
import { serializeCart, toCartRecord, type CartRow } from './cart.types';

const product = {
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
  items: [
    {
      id: '1',
      cart_id: '22222222-2222-4222-8222-222222222222',
      product_id: product.id,
      quantity: 2,
      product,
      image_url: 'https://example.com/product.png',
    },
  ],
};

describe('cart types', () => {
  it('calculates Decimal subtotals and total price', () => {
    const cart = toCartRecord(cartRow);

    expect(cart.items[0]?.available).toBe(true);
    expect(cart.items[0]?.subtotal).toBeInstanceOf(Decimal);
    expect(cart.items[0]?.subtotal?.toFixed(2)).toBe('25800.00');
    expect(cart.total_quantity).toBe(2);
    expect(cart.total_price.toFixed(2)).toBe('25800.00');

    expect(serializeCart(cart)).toEqual({
      id: cartRow.id,
      items: [
        {
          id: '1',
          product_id: product.id,
          quantity: 2,
          product: {
            id: product.id,
            category_id: '1',
            name: 'Product',
            description: null,
            price: '12900.00',
            stock: 5,
            max_order_quantity: 3,
            status: 'active',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
            image_url: 'https://example.com/product.png',
          },
          available: true,
          unavailable_reason: null,
          subtotal: '25800.00',
        },
      ],
      total_quantity: 2,
      total_price: '25800.00',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('keeps unavailable items and explains why they cannot be purchased', () => {
    const cart = toCartRecord({
      ...cartRow,
      items: [
        {
          ...cartRow.items[0],
          product: { ...product, status: 'inactive' },
        },
      ],
    });

    expect(cart.items[0]).toMatchObject({
      available: false,
      unavailable_reason: 'PRODUCT_UNAVAILABLE',
    });
  });
});
