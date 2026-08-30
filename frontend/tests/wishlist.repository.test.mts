import assert from "node:assert/strict";
import test from "node:test";
import {
  requestAddWishlistItem,
  requestRemoveWishlistItem,
  requestWishlistItems,
} from "../src/repositories/wishlist.repository.ts";

const wishlistItem = {
  product_id: "product-1",
  created_at: "2026-01-01T00:00:00.000Z",
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
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("찜 목록 조회는 서버 응답을 camelCase로 변환한다", async () => {
  const originalFetch = globalThis.fetch;
  let requestPath = "";
  let requestInit: RequestInit | undefined;

  globalThis.fetch = async (input, init) => {
    requestPath = String(input);
    requestInit = init;
    return jsonResponse({ items: [wishlistItem] });
  };

  try {
    const result = await requestWishlistItems();

    assert.equal(requestPath, "/api/wishlist/items");
    assert.equal(requestInit?.credentials, "include");
    assert.equal(requestInit?.cache, "no-store");
    assert.equal(result[0]?.productId, "product-1");
    assert.equal(result[0]?.product.categoryId, "category-1");
    assert.equal(result[0]?.product.price, 12500);
    assert.equal(result[0]?.product.maxOrderQuantity, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("찜 추가와 삭제 요청은 API 계약에 맞는 경로와 body를 사용한다", async () => {
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

    return requests.at(-1)?.method === "POST"
      ? jsonResponse({ item: wishlistItem })
      : jsonResponse({ message: "찜 목록에서 삭제했습니다." });
  };

  try {
    const result = await requestAddWishlistItem("product-1");
    await requestRemoveWishlistItem("product-1");

    assert.equal(result.productId, "product-1");
    assert.deepEqual(requests, [
      {
        path: "/api/wishlist/items",
        method: "POST",
        body: { product_id: "product-1" },
      },
      {
        path: "/api/wishlist/items/product-1",
        method: "DELETE",
        body: null,
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("찜 목록 요청이 401이면 refresh 후 한 번 재시도한다", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  let wishlistAttempt = 0;

  globalThis.fetch = async (input) => {
    const path = String(input);
    requests.push(path);

    if (path === "/api/wishlist/items") {
      wishlistAttempt += 1;
      return wishlistAttempt === 1
        ? jsonResponse({ message: "토큰 만료" }, 401)
        : jsonResponse({ items: [] });
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
    await requestWishlistItems();

    assert.deepEqual(requests, [
      "/api/wishlist/items",
      "/api/auth/refresh",
      "/api/wishlist/items",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
