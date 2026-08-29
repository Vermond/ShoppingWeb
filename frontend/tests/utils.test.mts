import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortProducts } from "../src/utils/catalog.ts";
import { formatPrice } from "../src/utils/format.ts";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  calculateShipping,
} from "../src/utils/order.ts";
import {
  getLoginPath,
  getSafeReturnTo,
} from "../src/utils/auth-redirect.ts";
import type { Product } from "../src/types/catalog.ts";

const products: Product[] = [
  {
    id: "p-1",
    name: "무선 스피커",
    category: "전자제품",
    price: 49000,
    stock: 10,
    maxOrderQuantity: 10,
    description: "작은 공간에 어울리는 따뜻한 사운드",
    color: "#d9cbb7",
    art: "glass",
  },
  {
    id: "p-2",
    name: "리넨 쿠션",
    category: "리빙",
    price: 18000,
    stock: 4,
    maxOrderQuantity: 4,
    description: "차분한 색감의 부드러운 쿠션",
    color: "#aebcae",
    art: "linen",
  },
  {
    id: "p-3",
    name: "가죽 파우치",
    category: "액세서리",
    price: 32000,
    stock: 1,
    maxOrderQuantity: 1,
    description: "매일 쓰기 좋은 슬림한 수납",
    color: "#be8d61",
    art: "bag",
  },
];

test("상품 필터는 카테고리와 검색어를 함께 적용한다", () => {
  const result = filterAndSortProducts(
    products,
    "전자제품",
    "  따뜻한 사운드 ",
    "recommended",
  );

  assert.deepEqual(
    result.map((product) => product.id),
    ["p-1"],
  );
});

test("상품 정렬은 낮은 가격순과 높은 가격순을 지원한다", () => {
  const ascending = filterAndSortProducts(products, "전체", "", "priceAsc");
  const descending = filterAndSortProducts(
    products,
    "전체",
    "",
    "priceDesc",
  );

  assert.deepEqual(
    ascending.map((product) => product.price),
    [18000, 32000, 49000],
  );
  assert.deepEqual(
    descending.map((product) => product.price),
    [49000, 32000, 18000],
  );
});

test("배송비는 무료 배송 기준에 따라 계산된다", () => {
  assert.equal(calculateShipping(0), 0);
  assert.equal(calculateShipping(FREE_SHIPPING_THRESHOLD - 1), SHIPPING_FEE);
  assert.equal(calculateShipping(FREE_SHIPPING_THRESHOLD), 0);
});

test("가격은 한국 원화 표기로 표시된다", () => {
  assert.equal(formatPrice(1234567), "1,234,567원");
});

test("로그인 복귀 경로는 허용된 내부 페이지로만 제한한다", () => {
  assert.equal(
    getSafeReturnTo("/shop?categoryId=category-1#new-arrivals"),
    "/shop?categoryId=category-1#new-arrivals",
  );
  assert.equal(getLoginPath("/checkout"), "/login?returnTo=%2Fcheckout");
  assert.equal(getSafeReturnTo("/login"), "/");
  assert.equal(getSafeReturnTo("/admin"), "/");
  assert.equal(getSafeReturnTo("https://example.com"), "/");
});
