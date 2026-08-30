import {
  serializeProduct,
  toProductRecord,
  type ProductRecord,
  type ProductResponse,
  type ProductRow,
} from '../products/products.types';

export type WishlistItemRow = {
  user_id: string;
  product_id: string;
  created_at: Date;
  product: ProductRow;
  image_url: string | null;
};

export type WishlistItemRecord = Omit<WishlistItemRow, 'product'> & {
  product: ProductRecord;
};

export type WishlistItemResponse = {
  product_id: string;
  created_at: string;
  product: ProductResponse & {
    image_url: string | null;
  };
};

export function toWishlistItemRecord(row: WishlistItemRow): WishlistItemRecord {
  return {
    ...row,
    product: toProductRecord(row.product),
  };
}

export function serializeWishlistItem(
  item: WishlistItemRecord,
): WishlistItemResponse {
  return {
    product_id: item.product_id,
    created_at: item.created_at.toISOString(),
    product: {
      ...serializeProduct(item.product),
      image_url: item.image_url,
    },
  };
}
