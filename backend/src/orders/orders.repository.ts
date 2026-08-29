import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  type DatabaseQueryExecutor,
} from '../database/database.service';
import type {
  CheckoutCartItemRow,
  CheckoutCartRow,
  OrderAddressRow,
  OrderHeaderRow,
  OrderItemRow,
  OrderRow,
} from './orders.types';
import type { OrderStatus } from './orders.types';

const FIND_CART_FOR_UPDATE_QUERY = `
  SELECT id
  FROM cart.carts
  WHERE user_id = $1
  FOR UPDATE
`;

const FIND_CHECKOUT_ITEMS_QUERY = `
  SELECT ci.cart_id,
         ci.product_id,
         ci.quantity,
         p.name AS product_name,
         p.price AS product_price,
         p.stock AS product_stock,
         p.max_order_quantity AS product_max_order_quantity,
         p.status AS product_status
  FROM cart.cart_items AS ci
  INNER JOIN catalog.products AS p
    ON p.id = ci.product_id
  WHERE ci.cart_id = $1
  ORDER BY ci.product_id ASC
  FOR UPDATE OF ci, p
`;

const FIND_ADDRESS_FOR_ORDER_QUERY = `
  SELECT id AS address_id, recipient_name, phone_number, postal_code,
         address_line1, address_line2, is_default, created_at, updated_at
  FROM auth.user_addresses
  WHERE user_id = $1 AND id = $2
  FOR UPDATE
`;

const CREATE_ORDER_QUERY = `
  INSERT INTO sales.orders (user_id, status, total_amount)
  VALUES ($1, $2, $3)
  RETURNING id, user_id, status, total_amount, created_at, updated_at
`;

const INSERT_ORDER_ITEM_QUERY = `
  INSERT INTO sales.order_items (
    order_id, product_id, product_name, unit_price, quantity
  )
  VALUES ($1, $2, $3, $4, $5)
`;

const INSERT_ORDER_ADDRESS_QUERY = `
  INSERT INTO sales.order_addresses (
    order_id, recipient_name, phone_number, postal_code,
    address_line1, address_line2, delivery_request
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7)
`;

const DECREMENT_STOCK_QUERY = `
  UPDATE catalog.products
  SET stock = stock - $2,
      updated_at = now()
  WHERE id = $1 AND stock >= $2
  RETURNING id
`;

const CLEAR_CART_QUERY = `
  DELETE FROM cart.cart_items
  WHERE cart_id = $1
`;

const TOUCH_CART_QUERY = `
  UPDATE cart.carts
  SET updated_at = now()
  WHERE id = $1
`;

const FIND_ORDER_HEADERS_QUERY = `
  SELECT id, user_id, status, total_amount, created_at, updated_at
  FROM sales.orders
  WHERE user_id = $1
  ORDER BY created_at DESC, id DESC
`;

const FIND_ORDER_HEADER_QUERY = `
  SELECT id, user_id, status, total_amount, created_at, updated_at
  FROM sales.orders
  WHERE user_id = $1 AND id = $2
`;

const FIND_ORDER_ITEMS_QUERY = `
  SELECT id, order_id, product_id, product_name, unit_price, quantity
  FROM sales.order_items
  WHERE order_id = $1
  ORDER BY id ASC
`;

const FIND_ORDER_ADDRESS_QUERY = `
  SELECT order_id, recipient_name, phone_number, postal_code,
         address_line1, address_line2, delivery_request, created_at
  FROM sales.order_addresses
  WHERE order_id = $1
`;

const FIND_ORDER_HEADER_FOR_UPDATE_QUERY = `
  SELECT id, user_id, status, total_amount, created_at, updated_at
  FROM sales.orders
  WHERE user_id = $1 AND id = $2
  FOR UPDATE
`;

const FIND_ORDER_ITEMS_FOR_CANCEL_QUERY = `
  SELECT oi.product_id, oi.quantity
  FROM sales.order_items AS oi
  INNER JOIN catalog.products AS p
    ON p.id = oi.product_id
  WHERE oi.order_id = $1
  ORDER BY oi.product_id ASC
  FOR UPDATE OF oi, p
`;

const RESTORE_STOCK_QUERY = `
  UPDATE catalog.products
  SET stock = stock + $2,
      updated_at = now()
  WHERE id = $1
`;

const CANCEL_ORDER_QUERY = `
  UPDATE sales.orders
  SET status = 'cancelled',
      updated_at = now()
  WHERE user_id = $1 AND id = $2 AND status = 'paid'
  RETURNING id, user_id, status, total_amount, created_at, updated_at
`;

type CartIdRow = { id: string };

type CheckoutCartQueryRow = CheckoutCartItemRow;

type OrderAddressQueryRow = OrderAddressRow & {
  address_id: string;
  is_default: boolean;
  updated_at: Date;
};

export type OrderCancellationItemRow = {
  product_id: string;
  quantity: number;
};

@Injectable()
export class OrdersRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findCheckoutCart(
    userId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<CheckoutCartRow | null> {
    const cartResult = await executor.query<CartIdRow>(
      FIND_CART_FOR_UPDATE_QUERY,
      [userId],
    );
    const cartId = cartResult.rows[0]?.id;

    if (!cartId) {
      return null;
    }

    const itemsResult = await executor.query<CheckoutCartQueryRow>(
      FIND_CHECKOUT_ITEMS_QUERY,
      [cartId],
    );

    return {
      cart_id: cartId,
      items: itemsResult.rows,
    };
  }

  async findAddressForOrder(
    userId: string,
    addressId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<OrderAddressRow | null> {
    const result = await executor.query<OrderAddressQueryRow>(
      FIND_ADDRESS_FOR_ORDER_QUERY,
      [userId, addressId],
    );
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      order_id: '',
      recipient_name: row.recipient_name,
      phone_number: row.phone_number,
      postal_code: row.postal_code,
      address_line1: row.address_line1,
      address_line2: row.address_line2,
      delivery_request: null,
      created_at: row.created_at,
    };
  }

  async createOrder(
    userId: string,
    status: OrderStatus,
    totalAmount: string,
    executor: DatabaseQueryExecutor,
  ): Promise<OrderHeaderRow> {
    const result = await executor.query<OrderHeaderRow>(CREATE_ORDER_QUERY, [
      userId,
      status,
      totalAmount,
    ]);
    const order = result.rows[0];

    if (!order) {
      throw new Error('주문 생성 결과를 확인할 수 없습니다.');
    }

    return order;
  }

  async insertOrderItem(
    orderId: string,
    item: CheckoutCartItemRow,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    await executor.query(INSERT_ORDER_ITEM_QUERY, [
      orderId,
      item.product_id,
      item.product_name,
      item.product_price,
      item.quantity,
    ]);
  }

  async insertOrderAddress(
    orderId: string,
    address: OrderAddressRow,
    deliveryRequest: string | null,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    await executor.query(INSERT_ORDER_ADDRESS_QUERY, [
      orderId,
      address.recipient_name,
      address.phone_number,
      address.postal_code,
      address.address_line1,
      address.address_line2,
      deliveryRequest,
    ]);
  }

  async decrementStock(
    productId: string,
    quantity: number,
    executor: DatabaseQueryExecutor,
  ): Promise<boolean> {
    const result = await executor.query(DECREMENT_STOCK_QUERY, [
      productId,
      quantity,
    ]);

    return result.rowCount === 1;
  }

  async clearCart(
    cartId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    await executor.query(CLEAR_CART_QUERY, [cartId]);
    await executor.query(TOUCH_CART_QUERY, [cartId]);
  }

  async findAllByUserId(userId: string): Promise<OrderHeaderRow[]> {
    const result = await this.databaseService.query<OrderHeaderRow>(
      FIND_ORDER_HEADERS_QUERY,
      [userId],
    );

    return result.rows;
  }

  async findById(
    userId: string,
    orderId: string,
    executor: DatabaseQueryExecutor = this.databaseService,
  ): Promise<OrderRow | null> {
    const headerResult = await executor.query<OrderHeaderRow>(
      FIND_ORDER_HEADER_QUERY,
      [userId, orderId],
    );
    const header = headerResult.rows[0];

    if (!header) {
      return null;
    }

    const [itemsResult, addressResult] = await Promise.all([
      executor.query<OrderItemRow>(FIND_ORDER_ITEMS_QUERY, [orderId]),
      executor.query<OrderAddressRow>(FIND_ORDER_ADDRESS_QUERY, [orderId]),
    ]);
    const address = addressResult.rows[0];

    if (!address) {
      throw new Error('주문 배송지 스냅샷을 찾을 수 없습니다.');
    }

    return {
      ...header,
      items: itemsResult.rows,
      address,
    };
  }

  async findHeaderForUpdate(
    userId: string,
    orderId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<OrderHeaderRow | null> {
    const result = await executor.query<OrderHeaderRow>(
      FIND_ORDER_HEADER_FOR_UPDATE_QUERY,
      [userId, orderId],
    );

    return result.rows[0] ?? null;
  }

  async findItemsForCancellation(
    orderId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<OrderCancellationItemRow[]> {
    const result = await executor.query<OrderCancellationItemRow>(
      FIND_ORDER_ITEMS_FOR_CANCEL_QUERY,
      [orderId],
    );

    return result.rows;
  }

  async restoreStock(
    productId: string,
    quantity: number,
    executor: DatabaseQueryExecutor,
  ): Promise<void> {
    await executor.query(RESTORE_STOCK_QUERY, [productId, quantity]);
  }

  async cancelOrder(
    userId: string,
    orderId: string,
    executor: DatabaseQueryExecutor,
  ): Promise<OrderHeaderRow | null> {
    const result = await executor.query<OrderHeaderRow>(CANCEL_ORDER_QUERY, [
      userId,
      orderId,
    ]);

    return result.rows[0] ?? null;
  }
}
