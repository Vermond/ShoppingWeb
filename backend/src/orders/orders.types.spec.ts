import Decimal from 'decimal.js';
import {
  serializeOrder,
  serializeOrderSummary,
  toOrderRecord,
  toOrderSummaryRecord,
  type OrderRow,
} from './orders.types';

const orderRow: OrderRow = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: '22222222-2222-4222-8222-222222222222',
  status: 'paid',
  total_amount: '25800.00',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  items: [
    {
      id: '1',
      order_id: '11111111-1111-4111-8111-111111111111',
      product_id: '33333333-3333-4333-8333-333333333333',
      product_name: '상품 A',
      unit_price: '12900.00',
      quantity: 2,
    },
  ],
  address: {
    order_id: '11111111-1111-4111-8111-111111111111',
    recipient_name: '홍길동',
    phone_number: '01012345678',
    postal_code: '06236',
    address_line1: '서울특별시 강남구 테헤란로 1',
    address_line2: '101호',
    delivery_request: '문 앞에 놓아주세요',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  },
};

describe('order types', () => {
  it('converts numeric database values to Decimal and serializes money strings', () => {
    const order = toOrderRecord(orderRow);

    expect(order.total_amount).toBeInstanceOf(Decimal);
    expect(order.items[0]?.unit_price).toBeInstanceOf(Decimal);
    expect(order.items[0]?.subtotal.toFixed(2)).toBe('25800.00');
    expect(serializeOrder(order)).toMatchObject({
      total_amount: '25800.00',
      items: [
        {
          unit_price: '12900.00',
          subtotal: '25800.00',
        },
      ],
      address: {
        delivery_request: '문 앞에 놓아주세요',
      },
    });
  });

  it('serializes order summaries without exposing line items', () => {
    const summary = toOrderSummaryRecord(orderRow);

    expect(serializeOrderSummary(summary)).toEqual({
      id: orderRow.id,
      user_id: orderRow.user_id,
      status: 'paid',
      total_amount: '25800.00',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('rejects an unknown order status', () => {
    expect(() => toOrderRecord({ ...orderRow, status: 'unknown' })).toThrow(
      '주문 상태가 허용된 값이 아닙니다.',
    );
  });
});
