import type { Product } from "../types/catalog";

type ProductQuantityLimits = Pick<Product, "stock" | "maxOrderQuantity">;

export function getMaxPurchasableQuantity(
  product: ProductQuantityLimits,
): number {
  return Math.max(0, Math.min(product.stock, product.maxOrderQuantity));
}

export function isCartQuantityAvailable(
  product: ProductQuantityLimits,
  quantity: number,
): boolean {
  return (
    Number.isInteger(quantity) &&
    quantity > 0 &&
    quantity <= getMaxPurchasableQuantity(product)
  );
}
