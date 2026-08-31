import Decimal from 'decimal.js';
import {
  serializeProduct,
  toProductRecord,
  type ProductRecord,
  type ProductResponse,
  type ProductRow,
} from '../products/products.types';

export const CART_ITEM_UNAVAILABLE_REASONS = [
  'PRODUCT_NOT_FOUND',
  'PRODUCT_UNAVAILABLE',
  'INSUFFICIENT_STOCK',
  'MAX_ORDER_QUANTITY_EXCEEDED',
] as const;

export type CartItemUnavailableReason =
  (typeof CART_ITEM_UNAVAILABLE_REASONS)[number];

export type CartItemRow = {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  product: ProductRow | null;
  image_url: string | null;
};

export type CartRow = {
  id: string;
  user_id: string;
  updated_at: Date;
  items: CartItemRow[];
};

export type CartItemRecord = Omit<CartItemRow, 'product'> & {
  product: ProductRecord | null;
  available: boolean;
  unavailable_reason: CartItemUnavailableReason | null;
  subtotal: Decimal | null;
};

export type CartRecord = Omit<CartRow, 'items'> & {
  items: CartItemRecord[];
  total_quantity: number;
  total_price: Decimal;
};

type CartProductResponse = ProductResponse & {
  image_url: string | null;
};

export type CartItemResponse = {
  id: string;
  product_id: string;
  quantity: number;
  product: CartProductResponse | null;
  available: boolean;
  unavailable_reason: CartItemUnavailableReason | null;
  subtotal: string | null;
};

export type CartResponse = {
  id: string;
  items: CartItemResponse[];
  total_quantity: number;
  total_price: string;
  updated_at: string;
};

export function toCartRecord(row: CartRow): CartRecord {
  const items = row.items.map((item) => {
    const product = item.product ? toProductRecord(item.product) : null;
    const unavailableReason = getUnavailableReason(product, item.quantity);

    return {
      ...item,
      product,
      available: unavailableReason === null,
      unavailable_reason: unavailableReason,
      subtotal: product ? product.price.mul(item.quantity) : null,
    };
  });

  return {
    id: row.id,
    user_id: row.user_id,
    updated_at: row.updated_at,
    items,
    total_quantity: items.reduce((total, item) => total + item.quantity, 0),
    total_price: items.reduce(
      (total, item) => total.add(item.subtotal ?? 0),
      new Decimal(0),
    ),
  };
}

export function serializeCart(cart: CartRecord): CartResponse {
  return {
    id: cart.id,
    items: cart.items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      product: item.product
        ? {
            ...serializeProduct(item.product),
            image_url: item.image_url,
          }
        : null,
      available: item.available,
      unavailable_reason: item.unavailable_reason,
      subtotal: item.subtotal?.toFixed(2) ?? null,
    })),
    total_quantity: cart.total_quantity,
    total_price: cart.total_price.toFixed(2),
    updated_at: cart.updated_at.toISOString(),
  };
}

function getUnavailableReason(
  product: ProductRecord | null,
  quantity: number,
): CartItemUnavailableReason | null {
  if (!product) {
    return 'PRODUCT_NOT_FOUND';
  }

  if (product.status !== 'active') {
    return 'PRODUCT_UNAVAILABLE';
  }

  if (quantity > product.stock) {
    return 'INSUFFICIENT_STOCK';
  }

  if (quantity > product.max_order_quantity) {
    return 'MAX_ORDER_QUANTITY_EXCEEDED';
  }

  return null;
}
