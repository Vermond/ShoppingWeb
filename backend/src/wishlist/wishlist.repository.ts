import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { DatabaseQueryExecutor } from '../database/database.service';
import type { ProductRow } from '../products/products.types';
import type { WishlistItemRow } from './wishlist.types';

const FIND_WISHLIST_ITEMS_BASE_QUERY = `
  SELECT wi.user_id,
         wi.product_id AS wishlist_product_id,
         wi.created_at AS wishlist_created_at,
         p.id AS product_id,
         p.category_id,
         p.name AS product_name,
         p.description AS product_description,
         p.price AS product_price,
         p.stock AS product_stock,
         p.max_order_quantity AS product_max_order_quantity,
         p.status AS product_status,
         p.created_at AS product_created_at,
         p.updated_at AS product_updated_at,
         primary_image.image_url
  FROM wishlist.wishlist_items AS wi
  INNER JOIN catalog.products AS p
    ON p.id = wi.product_id
  LEFT JOIN LATERAL (
    SELECT pi.image_url
    FROM catalog.product_images AS pi
    WHERE pi.product_id = p.id
    ORDER BY pi.sort_order ASC, pi.id ASC
    LIMIT 1
  ) AS primary_image ON TRUE
  WHERE wi.user_id = $1
`;

const FIND_WISHLIST_ITEMS_QUERY = `${FIND_WISHLIST_ITEMS_BASE_QUERY}
  ORDER BY wi.created_at DESC, wi.product_id DESC
`;

const FIND_WISHLIST_ITEM_QUERY = `${FIND_WISHLIST_ITEMS_BASE_QUERY}
  AND wi.product_id = $2
`;

const FIND_PRODUCT_QUERY = `
  SELECT id, category_id, name, description, price, stock,
         max_order_quantity, status, created_at, updated_at
  FROM catalog.products
  WHERE id = $1
  FOR SHARE
`;

const INSERT_WISHLIST_ITEM_QUERY = `
  INSERT INTO wishlist.wishlist_items (user_id, product_id)
  VALUES ($1, $2)
  ON CONFLICT (user_id, product_id) DO NOTHING
`;

const DELETE_WISHLIST_ITEM_QUERY = `
  DELETE FROM wishlist.wishlist_items
  WHERE user_id = $1 AND product_id = $2
`;

type WishlistItemQueryRow = {
  user_id: string;
  wishlist_product_id: string;
  wishlist_created_at: Date;
  product_id: string;
  category_id: string;
  product_name: string;
  product_description: string | null;
  product_price: string;
  product_stock: number;
  product_max_order_quantity: number;
  product_status: string;
  product_created_at: Date;
  product_updated_at: Date;
  image_url: string | null;
};

@Injectable()
export class WishlistRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAllByUserId(userId: string): Promise<WishlistItemRow[]> {
    const result = await this.databaseService.query<WishlistItemQueryRow>(
      FIND_WISHLIST_ITEMS_QUERY,
      [userId],
    );

    return result.rows.map(toWishlistItemRow);
  }

  async findByUserIdAndProductId(
    userId: string,
    productId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<WishlistItemRow | null> {
    const result = await executor.query<WishlistItemQueryRow>(
      FIND_WISHLIST_ITEM_QUERY,
      [userId, productId],
    );

    const row = result.rows[0];

    return row ? toWishlistItemRow(row) : null;
  }

  async findProductById(
    productId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<ProductRow | null> {
    const result = await executor.query<ProductRow>(FIND_PRODUCT_QUERY, [
      productId,
    ]);

    return result.rows[0] ?? null;
  }

  async insertItem(
    userId: string,
    productId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<void> {
    await executor.query(INSERT_WISHLIST_ITEM_QUERY, [userId, productId]);
  }

  async deleteItem(userId: string, productId: string): Promise<boolean> {
    const result = await this.databaseService.query(
      DELETE_WISHLIST_ITEM_QUERY,
      [userId, productId],
    );

    return result.rowCount === 1;
  }
}

function toWishlistItemRow(row: WishlistItemQueryRow): WishlistItemRow {
  return {
    user_id: row.user_id,
    product_id: row.wishlist_product_id,
    created_at: row.wishlist_created_at,
    product: {
      id: row.product_id,
      category_id: row.category_id,
      name: row.product_name,
      description: row.product_description,
      price: row.product_price,
      stock: row.product_stock,
      max_order_quantity: row.product_max_order_quantity,
      status: row.product_status,
      created_at: row.product_created_at,
      updated_at: row.product_updated_at,
    },
    image_url: row.image_url,
  };
}
