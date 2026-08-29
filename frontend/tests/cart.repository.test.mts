import assert from "node:assert/strict";
import test from "node:test";
import {
  requestAddCartItem,
  requestCart,
  requestMergeCart,
  requestRemoveCartItem,
  requestUpdateCartItem,
} from "../src/repositories/cart.repository.ts";

const cartResponse = {
  cart: {
    id: "cart-1",
    items: [
      {
        id: "item-1",
        product_id: "product-1",
        quantity: 2,
        product: {
          id: "product-1",
          category_id: "category-1",
          name: "테스트 상품",
          description: null,
          price: "12500.00",
          stock: 4,
          max_order_quantity: 3,
          status: "active",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          image_url: null,
        },
        available: true,
        unavailable_reason: null,
        subtotal: "25000.00",
      },
    ],
    total_quantity: 2,
    total_price: "25000.00",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("장바구니 조회는 서버 응답을 camelCase로 변환한다", async () => {
  const originalFetch = globalThis.fetch;
  let requestPath = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = async (input, init) => {
    requestPath = String(input);
    requestInit = init;
    return jsonResponse(cartResponse);
  };

  try {
    const result = await requestCart();

    assert.equal(requestPath, "/api/cart");
    assert.equal(requestInit?.credentials, "include");
    assert.equal(requestInit?.cache, "no-store");
    assert.equal(result.totalQuantity, 2);
    assert.equal(result.totalPrice, 25000);
    assert.equal(result.items[0]?.productId, "product-1");
    assert.equal(result.items[0]?.product?.maxOrderQuantity, 3);
    assert.equal(result.items[0]?.subtotal, 25000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("장바구니 변경 요청은 API 경로와 서버 요청 형식을 사용한다", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{
    path: string;
    method: string;
    body: unknown;
  }> = [];

  globalThis.fetch = async (input, init) => {
    requests.push({
      path: String(input),
      method: String(init?.method),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return jsonResponse(cartResponse);
  };

  try {
    await requestAddCartItem("product-1", 2);
    await requestUpdateCartItem("product-1", 3);
    await requestRemoveCartItem("product-1");

    assert.deepEqual(requests, [
      {
        path: "/api/cart/items",
        method: "POST",
        body: { product_id: "product-1", quantity: 2 },
      },
      {
        path: "/api/cart/items/product-1",
        method: "PATCH",
        body: { quantity: 3 },
      },
      {
        path: "/api/cart/items/product-1",
        method: "DELETE",
        body: null,
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("로그인 전 장바구니 병합은 서버가 요구하는 배열 형식으로 요청한다", async () => {
  const originalFetch = globalThis.fetch;
  let requestPath = "";
  let requestBody: unknown;

  globalThis.fetch = async (input, init) => {
    requestPath = String(input);
    requestBody = JSON.parse(String(init?.body));
    return jsonResponse(cartResponse);
  };

  try {
    await requestMergeCart([
      { productId: "product-1", quantity: 2 },
      { productId: "product-2", quantity: 1 },
    ]);

    assert.equal(requestPath, "/api/cart/merge");
    assert.deepEqual(requestBody, {
      items: [
        { product_id: "product-1", quantity: 2 },
        { product_id: "product-2", quantity: 1 },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("장바구니 요청이 401이면 refresh 후 한 번 재시도한다", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  let cartAttempt = 0;

  globalThis.fetch = async (input) => {
    const path = String(input);
    requests.push(path);

    if (path === "/api/cart") {
      cartAttempt += 1;
      return cartAttempt === 1
        ? jsonResponse({ message: "토큰 만료" }, 401)
        : jsonResponse(cartResponse);
    }

    return jsonResponse({
      user: {
        id: "user-1",
        name: "홍길동",
        email: "user@example.com",
      },
    });
  };

  try {
    await requestCart();

    assert.deepEqual(requests, [
      "/api/cart",
      "/api/auth/refresh",
      "/api/cart",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
