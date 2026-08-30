import Decimal from 'decimal.js';
import {
  serializeAdminOrderDetail,
  serializeAdminOrderList,
  toAdminOrderDetailRecord,
  toAdminOrderListRecord,
} from './admin-orders.types';

describe('admin order types', () => {
  it('serializes list money and derives mock payment/shipping fields', () => {
    const record = toAdminOrderListRecord({
      order_id: '11111111-1111-4111-8111-111111111111',
      customer_id: '22222222-2222-4222-8222-222222222222',
      customer_name: '홍길동',
      product_summary: [
        {
          product_id: '33333333-3333-4333-8333-333333333333',
          product_name: '상품 A',
          quantity: 2,
        },
      ],
      product_count: 2,
      payment_amount: '53000',
      status: 'shipped',
      ordered_at: new Date('2026-08-01T00:00:00.000Z'),
    });

    expect(serializeAdminOrderList(record)).toEqual({
      order_id: '11111111-1111-4111-8111-111111111111',
      customer_id: '22222222-2222-4222-8222-222222222222',
      customer_name: '홍길동',
      product_summary: [
        {
          product_id: '33333333-3333-4333-8333-333333333333',
          product_name: '상품 A',
          quantity: 2,
        },
      ],
      product_count: 2,
      payment_amount: '53000.00',
      payment_status: 'paid',
      payment_method: null,
      shipping_status: 'shipping',
      carrier: null,
      tracking_number: null,
      status: 'shipped',
      ordered_at: '2026-08-01T00:00:00.000Z',
    });
  });

  it('serializes detail amounts, item subtotals, address and history', () => {
    const record = toAdminOrderDetailRecord({
      header: {
        order_id: '11111111-1111-4111-8111-111111111111',
        customer_id: '22222222-2222-4222-8222-222222222222',
        customer_name: '홍길동',
        customer_email: 'user@example.com',
        status: 'paid',
        subtotal: '50000',
        shipping_fee: '3000',
        discount_amount: '0',
        total_amount: '53000',
        created_at: new Date('2026-08-01T00:00:00.000Z'),
        updated_at: new Date('2026-08-01T00:00:00.000Z'),
        address: {
          order_id: '11111111-1111-4111-8111-111111111111',
          recipient_name: '홍길동',
          phone_number: '010-1234-5678',
          postal_code: '06236',
          address_line1: '서울특별시 강남구 테헤란로 1',
          address_line2: null,
          delivery_request: null,
          created_at: new Date('2026-08-01T00:00:00.000Z'),
        },
      },
      items: [
        {
          id: '1',
          order_id: '11111111-1111-4111-8111-111111111111',
          product_id: '33333333-3333-4333-8333-333333333333',
          product_name: '상품 A',
          options: null,
          unit_price: '25000',
          quantity: 2,
        },
      ],
      statusHistory: [
        {
          id: '1',
          order_id: '11111111-1111-4111-8111-111111111111',
          from_status: null,
          to_status: 'paid',
          changed_by: null,
          created_at: new Date('2026-08-01T00:00:00.000Z'),
        },
      ],
    });

    expect(record.total_amount).toEqual(new Decimal('53000'));
    expect(serializeAdminOrderDetail(record)).toMatchObject({
      order_id: '11111111-1111-4111-8111-111111111111',
      subtotal: '50000.00',
      shipping_fee: '3000.00',
      total_amount: '53000.00',
      customer: {
        email: 'user@example.com',
        phone_number: '010-1234-5678',
      },
      items: [{ unit_price: '25000.00', subtotal: '50000.00' }],
      payment: {
        provider: 'mock',
        status: 'paid',
        method: null,
      },
      shipping: { status: 'preparing' },
      status_history: [
        { from_status: null, to_status: 'paid', changed_by: null },
      ],
    });
  });
});
