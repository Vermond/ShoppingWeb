import assert from "node:assert/strict";
import test from "node:test";
import {
  mapAdminProductDetailResponse,
  mapAdminProductsResponse,
} from "../src/data/admin-products.ts";
import type {
  AdminProductDetailResponse,
  AdminProductListResponse,
} from "../src/repositories/admin-products.server.repository.ts";

const listResponse: AdminProductListResponse = {
  products: [
    {
      id: "product-1",
      name: "무선 기계식 키보드",
      representative_image_url: "https://example.com/keyboard.png",
      category_id: "1",
      category_name: "전자기기",
      price: "89000.00",
      stock: 2,
      max_order_quantity: 1,
      sales_quantity: 14,
      status: "active",
      created_at: "2026-08-30T05:32:00.000Z",
      updated_at: "2026-08-30T06:32:00.000Z",
    },
  ],
  total_count: 1,
  status_counts: {
    active: 1,
    inactive: 0,
    draft: 0,
    archived: 0,
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

const detailResponse: AdminProductDetailResponse = {
  id: "product-1",
  name: "무선 기계식 키보드",
  description: "사무실과 집에서 모두 사용할 수 있는 키보드입니다.",
  representative_image_url: "https://example.com/keyboard.png",
  category_id: "1",
  category_name: "전자기기",
  price: "89000.00",
  stock: 2,
  max_order_quantity: 1,
  sales_quantity: 14,
  status: "active",
  created_at: "2026-08-30T05:32:00.000Z",
  updated_at: "2026-08-30T06:32:00.000Z",
  images: [
    {
      id: "image-2",
      image_url: "https://example.com/keyboard-detail.png",
      sort_order: 1,
      created_at: "2026-08-30T05:34:00.000Z",
    },
    {
      id: "image-1",
      image_url: "https://example.com/keyboard.png",
      sort_order: 0,
      created_at: "2026-08-30T05:33:00.000Z",
    },
  ],
};

test("관리자 상품 목록 응답을 화면 데이터로 변환한다", () => {
  const data = mapAdminProductsResponse(
    listResponse,
    [{ id: "1", name: "전자기기" }],
    1,
    { status: "active", page: 1 },
  );

  assert.equal(data.totalCount, 1);
  assert.equal(data.lowStockCount, 1);
  assert.equal(data.statusCounts.active, 1);
  assert.equal(data.products[0]?.price, 89000);
  assert.equal(data.products[0]?.maxOrderQuantity, 1);
  assert.equal(data.products[0]?.updatedAt, "2026.08.30 15:32");
  assert.equal(data.query.status, "active");
});

test("관리자 상품 상세 응답은 이미지 순서와 수정 필드를 보존한다", () => {
  const data = mapAdminProductDetailResponse(detailResponse);

  assert.equal(data.description, "사무실과 집에서 모두 사용할 수 있는 키보드입니다.");
  assert.equal(data.price, "89000.00");
  assert.equal(data.stock, 2);
  assert.equal(data.maxOrderQuantity, 1);
  assert.equal(data.images[0]?.id, "image-1");
  assert.equal(data.images[1]?.sortOrder, 1);
});
