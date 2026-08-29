import Decimal from 'decimal.js';
import {
  isProductStatus,
  toProductRecord,
  type ProductRow,
} from './products.types';

const baseProductRow: ProductRow = {
  id: 'product-1',
  category_id: '1',
  name: 'Product',
  description: null,
  price: '12900.00',
  stock: 3,
  status: 'active',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

describe('product types', () => {
  it('accepts only the defined product statuses', () => {
    expect(isProductStatus('active')).toBe(true);
    expect(isProductStatus('inactive')).toBe(true);
    expect(isProductStatus('draft')).toBe(true);
    expect(isProductStatus('archived')).toBe(true);
    expect(isProductStatus('deleted')).toBe(false);
  });

  it('converts a valid database row to a typed product record', () => {
    const product = toProductRecord(baseProductRow);

    expect(product.status).toBe('active');
    expect(product.price).toBeInstanceOf(Decimal);
    expect(product.price.toFixed(2)).toBe('12900.00');
  });

  it('rejects an unknown database status at the row boundary', () => {
    expect(() =>
      toProductRecord({ ...baseProductRow, status: 'deleted' }),
    ).toThrow('상품 상태가 허용된 값이 아닙니다.');
  });
});
