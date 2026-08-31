import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { DatabaseQueryExecutor } from '../database/database.service';
import type { CartRow } from './cart.types';
import type { ProductRow } from '../products/products.types';

const INSERT_CART_QUERY = `
  INSERT INTO cart.carts (user_id)
  VALUES ($1)
  ON CONFLICT (user_id) DO NOTHING
`;

const FIND_CART_ID_QUERY = `
  SELECT id
  FROM cart.carts
  WHERE user_id = $1
  FOR UPDATE
`;

const FIND_CART_QUERY = `
  SELECT c.id AS cart_id, c.user_id, c.updated_at AS cart_updated_at,
         ci.id AS item_id, ci.cart_id AS item_cart_id,
         ci.product_id AS item_product_id, ci.quantity AS item_quantity,
         p.id AS product_id, p.category_id,
         p.name AS product_name, p.description AS product_description,
         p.price AS product_price, p.stock AS product_stock,
         p.max_order_quantity AS product_max_order_quantity,
         p.status AS product_status, p.created_at AS product_created_at,
         p.updated_at AS product_updated_at,
         primary_image.image_url AS image_url
  FROM cart.carts AS c
  LEFT JOIN cart.cart_items AS ci
    ON ci.cart_id = c.id
  LEFT JOIN catalog.products AS p
    ON p.id = ci.product_id
  LEFT JOIN LATERAL (
    SELECT pi.image_url
    FROM catalog.product_images AS pi
    WHERE pi.product_id = p.id
    ORDER BY pi.sort_order ASC, pi.id ASC
    LIMIT 1
  ) AS primary_image ON TRUE
  WHERE c.user_id = $1
  ORDER BY ci.id ASC
`;

const FIND_PRODUCT_FOR_UPDATE_QUERY = `
  SELECT id, category_id, name, description, price, stock,
         max_order_quantity, status, created_at, updated_at
  FROM catalog.products
  WHERE id = $1
  FOR UPDATE
`;

const FIND_CART_ITEM_FOR_UPDATE_QUERY = `
  SELECT id, cart_id, product_id, quantity
  FROM cart.cart_items
  WHERE cart_id = $1 AND product_id = $2
  FOR UPDATE
`;

const INSERT_CART_ITEM_QUERY = `
  INSERT INTO cart.cart_items (cart_id, product_id, quantity)
  VALUES ($1, $2, $3)
`;

const UPDATE_CART_ITEM_QUERY = `
  UPDATE cart.cart_items
  SET quantity = $1
  WHERE id = $2
`;

const DELETE_CART_ITEM_QUERY = `
  DELETE FROM cart.cart_items
  WHERE cart_id = $1 AND product_id = $2
`;

const TOUCH_CART_QUERY = `
  UPDATE cart.carts
  SET updated_at = NOW()
  WHERE id = $1
`;

type CartIdRow = { id: string };

type CartQueryRow = {
  cart_id: string;
  user_id: string;
  cart_updated_at: Date;
  item_id: string | null;
  item_cart_id: string | null;
  item_product_id: string | null;
  item_quantity: number | null;
  product_id: string | null;
  category_id: string | null;
  product_name: string | null;
  product_description: string | null;
  product_price: string | null;
  product_stock: number | null;
  product_max_order_quantity: number | null;
  product_status: string | null;
  product_created_at: Date | null;
  product_updated_at: Date | null;
  image_url: string | null;
};

type CartItemQueryRow = CartQueryRow & {
  item_id: string;
  item_cart_id: string;
  item_product_id: string;
  item_quantity: number;
};

type CartProductQueryRow = CartQueryRow & {
  product_id: string;
  category_id: string;
  product_name: string;
  product_price: string;
  product_stock: number;
  product_max_order_quantity: number;
  product_status: string;
  product_created_at: Date;
  product_updated_at: Date;
};

export type CartItemQuantityRow = {
  id: string;
  quantity: number;
};

@Injectable()
export class CartRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async getOrCreateCartId(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<string> {
    await executor.query(INSERT_CART_QUERY, [userId]);
    const result = await executor.query<CartIdRow>(FIND_CART_ID_QUERY, [
      userId,
    ]);
    const cartId = result.rows[0]?.id;

    if (!cartId) {
      throw new Error('사용자 장바구니를 생성하지 못했습니다.');
    }

    return cartId;
  }

  async findCartIdByUserId(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<string | null> {
    const result = await executor.query<CartIdRow>(FIND_CART_ID_QUERY, [
      userId,
    ]);

    return result.rows[0]?.id ?? null;
  }

  async findByUserId(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<CartRow | null> {
    const result = await executor.query<CartQueryRow>(FIND_CART_QUERY, [
      userId,
    ]);
    const firstRow = result.rows[0];

    if (!firstRow) {
      return null;
    }

    return {
      id: firstRow.cart_id,
      user_id: firstRow.user_id,
      updated_at: firstRow.cart_updated_at,
      items: result.rows.filter(hasCartItem).map((row) => ({
        id: row.item_id,
        cart_id: row.item_cart_id,
        product_id: row.item_product_id,
        quantity: row.item_quantity,
        product: hasCartProduct(row)
          ? {
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
            }
          : null,
        image_url: row.image_url,
      })),
    };
  }

  async findProductByIdForUpdate(
    productId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<ProductRow | null> {
    const result = await executor.query<ProductRow>(
      FIND_PRODUCT_FOR_UPDATE_QUERY,
      [productId],
    );

    return result.rows[0] ?? null;
  }

  async findItemForUpdate(
    cartId: string,
    productId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<CartItemQuantityRow | null> {
    const result = await executor.query<CartItemQuantityRow>(
      FIND_CART_ITEM_FOR_UPDATE_QUERY,
      [cartId, productId],
    );

    return result.rows[0] ?? null;
  }

  async insertItem(
    cartId: string,
    productId: string,
    quantity: number,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    await executor.query(INSERT_CART_ITEM_QUERY, [cartId, productId, quantity]);
  }

  async updateItem(
    itemId: string,
    quantity: number,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    await executor.query(UPDATE_CART_ITEM_QUERY, [quantity, itemId]);
  }

  async deleteItem(
    cartId: string,
    productId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<boolean> {
    const result = await executor.query(DELETE_CART_ITEM_QUERY, [
      cartId,
      productId,
    ]);

    return result.rowCount === 1;
  }

  async touchCart(
    cartId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    await executor.query(TOUCH_CART_QUERY, [cartId]);
  }
}

function hasCartItem(row: CartQueryRow): row is CartItemQueryRow {
  return (
    row.item_id !== null &&
    row.item_cart_id !== null &&
    row.item_product_id !== null &&
    row.item_quantity !== null
  );
}

function hasCartProduct(row: CartQueryRow): row is CartProductQueryRow {
  return (
    row.product_id !== null &&
    row.category_id !== null &&
    row.product_name !== null &&
    row.product_price !== null &&
    row.product_stock !== null &&
    row.product_max_order_quantity !== null &&
    row.product_status !== null &&
    row.product_created_at !== null &&
    row.product_updated_at !== null
  );
}
