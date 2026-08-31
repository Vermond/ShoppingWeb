import assert from "node:assert/strict";
import test from "node:test";
import {
  getMaxPurchasableQuantity,
  isCartQuantityAvailable,
} from "../src/utils/cart.ts";

test("구매 가능 수량은 재고와 최대구매제한 중 작은 값이다", () => {
  assert.equal(
    getMaxPurchasableQuantity({ stock: 2, maxOrderQuantity: 5 }),
    2,
  );
  assert.equal(
    getMaxPurchasableQuantity({ stock: 10, maxOrderQuantity: 3 }),
    3,
  );
});

test("장바구니 수량은 유효한 구매 가능 범위에서만 허용된다", () => {
  const product = { stock: 10, maxOrderQuantity: 3 };

  assert.equal(isCartQuantityAvailable(product, 1), true);
  assert.equal(isCartQuantityAvailable(product, 3), true);
  assert.equal(isCartQuantityAvailable(product, 4), false);
  assert.equal(isCartQuantityAvailable(product, 0), false);
});
