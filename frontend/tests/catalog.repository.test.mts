import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchCatalog,
  fetchProductById,
} from "../src/repositories/catalog.repository.ts";

test("카탈로그는 서버 카테고리 ID를 기준으로 상품 카테고리를 매핑한다", async () => {
  const originalFetch = globalThis.fetch;
  const requestedPaths: string[] = [];

  globalThis.fetch = async (input) => {
    const path = String(input);
    requestedPaths.push(path);

    if (path === "/api/categories") {
      return new Response(
        JSON.stringify({
          categories: [
            { id: "cat-electronics", name: "전자제품" },
            { id: "cat-living", name: "리빙" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        products: [
          {
            id: "product-1",
            name: "무선 스피커",
            price: "49000",
            stock: 0,
            max_order_quantity: 2,
            description: null,
            category_id: "cat-electronics",
            art: "glass",
          },
          {
            id: "product-2",
            name: "리넨 쿠션",
            price: 18000,
            stock: 4,
            max_order_quantity: 2,
            description: "부드러운 쿠션",
            categoryId: "cat-living",
            art: "linen",
          },
          {
            id: "invalid",
            name: "가격이 없는 상품",
            price: "not-a-number",
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const catalog = await fetchCatalog();

    assert.deepEqual(requestedPaths.sort(), ["/api/categories", "/api/products"]);
    assert.equal(catalog.products.length, 2);
    assert.equal(catalog.products[0].category, "전자제품");
    assert.equal(catalog.products[0].description, "");
    assert.equal(catalog.products[0].stock, 0);
    assert.equal(catalog.products[1].maxOrderQuantity, 2);
    assert.deepEqual(
      catalog.categories.map(({ id, name, count }) => ({ id, name, count })),
      [
        { id: "cat-electronics", name: "전자제품", count: 1 },
        { id: "cat-living", name: "리빙", count: 1 },
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("상품 상세 조회는 상세 API의 이미지와 재고를 매핑한다", async () => {
  const originalFetch = globalThis.fetch;
  let requestPath = "";

  globalThis.fetch = async (input) => {
    requestPath = String(input);

    return new Response(
      JSON.stringify({
        product: {
          id: "product-detail",
          category_id: "cat-electronics",
          name: "무선 스피커",
          description: null,
          price: "49000.00",
          stock: 0,
          max_order_quantity: 1,
          status: "active",
          images: [
            {
              id: "image-2",
              image_url: "https://example.com/second.png",
              sort_order: 2,
            },
            {
              id: "image-1",
              image_url: "https://example.com/first.png",
              sort_order: 1,
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const product = await fetchProductById("product-detail");

    assert.equal(requestPath, "/api/products/product-detail");
    assert.equal(product.stock, 0);
    assert.equal(product.maxOrderQuantity, 1);
    assert.equal(product.categoryId, "cat-electronics");
    assert.deepEqual(
      product.images.map(({ id }) => id),
      ["image-1", "image-2"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
