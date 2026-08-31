import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapAdminCustomerDetailResponse,
  mapAdminCustomersResponse,
} from '../src/data/admin-customers.ts';
import type {
  AdminCustomerDetailResponse,
  AdminCustomerListResponse,
} from '../src/repositories/admin-customers.server.repository.ts';

const listResponse: AdminCustomerListResponse = {
  customers: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: '홍길동',
      email: 'user@example.com',
      status: 'withdrawn',
      email_verified: false,
      created_at: '2026-08-01T15:00:00.000Z',
      updated_at: '2026-08-02T15:00:00.000Z',
      order_count: 2,
      total_spent: '123456.70',
      last_order_at: '2026-08-20T15:00:00.000Z',
    },
  ],
  total_count: 1,
  status_counts: { active: 0, withdrawn: 1 },
  summary: {
    total_customer_count: 10,
    active_customer_count: 8,
    new_customer_count: 2,
    repurchase_rate_percent: 25,
  },
  pagination: {
    page: 1,
    page_size: 20,
    total_count: 1,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  },
};

const detailResponse: AdminCustomerDetailResponse = {
  ...listResponse.customers[0],
  orders: [
    {
      order_id: '22222222-2222-4222-8222-222222222222',
      status: 'cancelled',
      total_amount: '53000.00',
      created_at: '2026-08-20T15:00:00.000Z',
      product_summary: [
        { product_id: 'product-1', product_name: '상품 A', quantity: 2 },
      ],
      product_count: 2,
    },
  ],
};

test('고객 목록 응답을 서버 집계 데이터로 변환한다', () => {
  const data = mapAdminCustomersResponse(listResponse, {
    status: 'withdrawn',
    emailVerified: false,
    page: 1,
  });

  assert.equal(data.customers[0]?.status, 'withdrawn');
  assert.equal(data.customers[0]?.emailVerified, false);
  assert.equal(data.customers[0]?.totalSpent, 123456.7);
  assert.equal(data.customers[0]?.createdAt, '2026.08.02 00:00');
  assert.equal(data.summary.newCustomerCount, 2);
  assert.equal(data.summary.repurchaseRatePercent, 25);
});

test('고객 상세 응답에 주문 상세 이동에 필요한 정보가 유지된다', () => {
  const data = mapAdminCustomerDetailResponse(detailResponse);

  assert.equal(data.status, 'withdrawn');
  assert.equal(data.orders[0]?.orderId, '22222222-2222-4222-8222-222222222222');
  assert.equal(data.orders[0]?.status, 'cancelled');
  assert.equal(data.orders[0]?.productSummary[0]?.product_name, '상품 A');
});
