import assert from "node:assert/strict";
import test from "node:test";
import {
  mapAdminOrderDetailResponse,
  mapAdminOrdersResponse,
} from "../src/data/admin-orders.ts";
import type {
  AdminOrderDetailResponse,
  AdminOrderListResponse,
} from "../src/repositories/admin-orders.server.repository.ts";

const listResponse: AdminOrderListResponse = {
  orders: [
    {
      order_id: "order-1",
      customer_id: "customer-1",
      customer_name: "홍길동",
      product_summary: [
        { product_id: "product-1", product_name: "상품 A", quantity: 2 },
        { product_id: "product-2", product_name: "상품 B", quantity: 1 },
      ],
      product_count: 3,
      payment_amount: "53000.00",
      payment_status: "paid",
      payment_method: null,
      shipping_status: "preparing",
      carrier: null,
      tracking_number: null,
      status: "paid",
      ordered_at: "2026-08-30T05:32:00.000Z",
    },
  ],
  total_count: 1,
  status_counts: {
    pending: 0,
    paid: 1,
    shipped: 0,
    completed: 0,
    cancelled: 0,
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

const detailResponse: AdminOrderDetailResponse = {
  order_id: "order-1",
  customer: {
    id: "customer-1",
    name: "홍길동",
    email: "user@example.com",
    phone_number: null,
  },
  status: "paid",
  subtotal: "50000.00",
  shipping_fee: "3000.00",
  discount_amount: "0.00",
  total_amount: "53000.00",
  created_at: "2026-08-30T05:32:00.000Z",
  updated_at: "2026-08-30T05:32:00.000Z",
  items: [
    {
      id: "1",
      order_id: "order-1",
      product_id: "product-1",
      product_name: "상품 A",
      options: null,
      unit_price: "25000.00",
      quantity: 2,
      subtotal: "50000.00",
    },
  ],
  address: null,
  payment: {
    provider: "mock",
    status: "paid",
    method: null,
    transaction_id: null,
    approved_at: null,
  },
  shipping: {
    status: "preparing",
    carrier: null,
    tracking_number: null,
  },
  status_history: [
    {
      id: "1",
      from_status: "pending",
      to_status: "paid",
      changed_by: "admin-1",
      created_at: "2026-08-30T05:33:00.000Z",
    },
  ],
};

test("관리자 주문 목록 응답을 화면 데이터로 변환한다", () => {
  const data = mapAdminOrdersResponse(listResponse, {
    search: "홍길동",
    status: "paid",
    page: 1,
  });

  assert.equal(data.totalCount, 1);
  assert.equal(data.statusCounts.paid, 1);
  assert.equal(data.orders[0]?.product, "상품 A 외 1건");
  assert.equal(data.orders[0]?.amount, 53000);
  assert.equal(data.orders[0]?.paymentMethod, null);
  assert.equal(data.orders[0]?.shippingStatus, "preparing");
  assert.equal(data.status, "paid");
  assert.equal(data.search, "홍길동");
});

test("관리자 주문 상세 응답을 금액과 상태 이력 중심으로 변환한다", () => {
  const data = mapAdminOrderDetailResponse(detailResponse);

  assert.equal(data.totalAmount, 53000);
  assert.equal(data.items[0]?.subtotal, 50000);
  assert.equal(data.items[0]?.options, null);
  assert.equal(data.payment.method, null);
  assert.equal(data.shipping.carrier, null);
  assert.equal(data.statusHistory[0]?.fromStatus, "pending");
  assert.equal(data.statusHistory[0]?.toStatus, "paid");
});
