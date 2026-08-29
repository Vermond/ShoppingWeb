import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelOrder,
  createOrder,
  fetchOrderById,
  fetchOrders,
} from "../src/repositories/orders.repository.ts";

const order = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  status: "paid",
  total_amount: "25800.00",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  items: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      order_id: "11111111-1111-4111-8111-111111111111",
      product_id: "44444444-4444-4444-8444-444444444444",
      product_name: "우드 트레이",
      unit_price: "12900.00",
      quantity: 2,
      subtotal: "25800.00",
    },
  ],
  address: {
    order_id: "11111111-1111-4111-8111-111111111111",
    recipient_name: "홍길동",
    phone_number: "01012345678",
    postal_code: "04524",
    address_line1: "서울시 중구 세종대로 1",
    address_line2: "101호",
    delivery_request: "문 앞에 놓아주세요",
    created_at: "2026-01-01T00:00:00.000Z",
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("주문 생성은 저장 배송지 ID와 배송 요청사항만 전송한다", async () => {
  const originalFetch = globalThis.fetch;
  let request: { path: string; method: string; body: unknown } | null = null;

  globalThis.fetch = async (input, init) => {
    request = {
      path: String(input),
      method: String(init?.method),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    };

    return jsonResponse({ order });
  };

  try {
    const result = await createOrder({
      addressId: "55555555-5555-4555-8555-555555555555",
      deliveryRequest: "문 앞에 놓아주세요",
    });

    assert.equal(result.id, order.id);
    assert.equal(result.totalAmount, 25800);
    assert.equal(result.items[0]?.subtotal, 25800);
    assert.deepEqual(request, {
      path: "/api/orders",
      method: "POST",
      body: {
        address_id: "55555555-5555-4555-8555-555555555555",
        delivery_request: "문 앞에 놓아주세요",
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("주문 목록과 상세 응답을 camelCase로 변환한다", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];

  globalThis.fetch = async (input) => {
    const path = String(input);
    requests.push(path);

    return path === "/api/orders"
      ? jsonResponse({ orders: [order] })
      : jsonResponse({ order });
  };

  try {
    const orders = await fetchOrders();
    const detail = await fetchOrderById(order.id);

    assert.equal(orders[0]?.status, "paid");
    assert.equal(orders[0]?.totalAmount, 25800);
    assert.equal(detail.address.recipientName, "홍길동");
    assert.equal(detail.items[0]?.productName, "우드 트레이");
    assert.deepEqual(requests, [
      "/api/orders",
      `/api/orders/${order.id}`,
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("주문 취소는 주문 ID별 취소 API를 호출한다", async () => {
  const originalFetch = globalThis.fetch;
  let request: { path: string; method: string } | null = null;

  globalThis.fetch = async (input, init) => {
    request = {
      path: String(input),
      method: String(init?.method),
    };

    return jsonResponse({
      order: {
        ...order,
        status: "cancelled",
      },
    });
  };

  try {
    const result = await cancelOrder(order.id);

    assert.equal(result.status, "cancelled");
    assert.deepEqual(request, {
      path: `/api/orders/${order.id}/cancel`,
      method: "POST",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
