import Decimal from 'decimal.js';
import {
  serializeAdminCustomer,
  serializeAdminCustomerDetail,
  toAdminCustomerDetailRecord,
  toAdminCustomerRecord,
  toAdminCustomerSummaryRecord,
} from './admin-customers.types';

const createdAt = new Date('2026-08-30T00:00:00.000Z');

describe('admin customers types', () => {
  it('serializes money and dates without exposing authentication fields', () => {
    const record = toAdminCustomerRecord({
      id: '11111111-1111-4111-8111-111111111111',
      name: '홍길동',
      email: 'user@example.com',
      status: 'active',
      email_verified: true,
      created_at: createdAt,
      updated_at: createdAt,
      order_count: 2,
      total_spent: '123456.7',
      last_order_at: createdAt,
    });

    expect(record.total_spent).toBeInstanceOf(Decimal);
    expect(serializeAdminCustomer(record)).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      name: '홍길동',
      email: 'user@example.com',
      status: 'active',
      email_verified: true,
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
      order_count: 2,
      total_spent: '123456.70',
      last_order_at: createdAt.toISOString(),
    });
    expect(serializeAdminCustomer(record)).not.toHaveProperty('password_hash');
  });

  it('serializes customer orders with all order statuses and product summaries', () => {
    const record = toAdminCustomerDetailRecord({
      id: '11111111-1111-4111-8111-111111111111',
      name: '홍길동',
      email: 'user@example.com',
      status: 'withdrawn',
      email_verified: false,
      created_at: createdAt,
      updated_at: createdAt,
      order_count: 0,
      total_spent: '0',
      last_order_at: null,
      orders: [
        {
          order_id: '22222222-2222-4222-8222-222222222222',
          status: 'cancelled',
          total_amount: '1000',
          created_at: createdAt,
          product_summary: [
            { product_id: 'product-1', product_name: '상품', quantity: 1 },
          ],
          product_count: 1,
        },
      ],
    });

    expect(serializeAdminCustomerDetail(record).orders[0]).toEqual({
      order_id: '22222222-2222-4222-8222-222222222222',
      status: 'cancelled',
      total_amount: '1000.00',
      created_at: createdAt.toISOString(),
      product_summary: [
        { product_id: 'product-1', product_name: '상품', quantity: 1 },
      ],
      product_count: 1,
    });
  });

  it('converts the server-calculated repurchase rate to a number', () => {
    expect(
      toAdminCustomerSummaryRecord({
        total_customer_count: 10,
        active_customer_count: 8,
        new_customer_count: 2,
        repurchase_rate_percent: '28.5714',
      }),
    ).toEqual({
      total_customer_count: 10,
      active_customer_count: 8,
      new_customer_count: 2,
      repurchase_rate_percent: 28.57,
    });
  });
});
