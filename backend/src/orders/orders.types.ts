import Decimal from 'decimal.js';

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
};

export type OrderAddressRow = {
  order_id: string;
  recipient_name: string;
  phone_number: string;
  postal_code: string;
  address_line1: string;
  address_line2: string | null;
  delivery_request: string | null;
  created_at: Date;
};

export type OrderHeaderRow = {
  id: string;
  user_id: string;
  status: string;
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  total_amount: string;
  created_at: Date;
  updated_at: Date;
};

export type OrderRow = OrderHeaderRow & {
  items: OrderItemRow[];
  address: OrderAddressRow;
};

export type CheckoutCartItemRow = {
  cart_id: string;
  product_id: string;
  quantity: number;
  product_name: string;
  product_price: string;
  product_stock: number;
  product_max_order_quantity: number;
  product_status: string;
};

export type CheckoutCartRow = {
  cart_id: string;
  items: CheckoutCartItemRow[];
};

export type ShippingPolicyRow = {
  id: string;
  base_fee: string;
  free_threshold: string;
};

export type OrderRecord = Omit<
  OrderHeaderRow,
  | 'status'
  | 'subtotal'
  | 'shipping_fee'
  | 'discount_amount'
  | 'total_amount'
  | 'created_at'
  | 'updated_at'
> & {
  status: OrderStatus;
  subtotal: Decimal;
  shipping_fee: Decimal;
  discount_amount: Decimal;
  total_amount: Decimal;
  created_at: Date;
  updated_at: Date;
  items: OrderItemRecord[];
  address: OrderAddressRow;
};

export type OrderItemRecord = Omit<OrderItemRow, 'unit_price'> & {
  unit_price: Decimal;
  subtotal: Decimal;
};

export type OrderSummaryRecord = Omit<
  OrderHeaderRow,
  | 'status'
  | 'subtotal'
  | 'shipping_fee'
  | 'discount_amount'
  | 'total_amount'
  | 'created_at'
  | 'updated_at'
> & {
  status: OrderStatus;
  subtotal: Decimal;
  shipping_fee: Decimal;
  discount_amount: Decimal;
  total_amount: Decimal;
  created_at: Date;
  updated_at: Date;
};

export type OrderItemResponse = Omit<
  OrderItemRecord,
  'unit_price' | 'subtotal'
> & {
  unit_price: string;
  subtotal: string;
};

export type OrderAddressResponse = Omit<OrderAddressRow, 'created_at'> & {
  created_at: string;
};

export type OrderResponse = Omit<
  OrderRecord,
  | 'subtotal'
  | 'shipping_fee'
  | 'discount_amount'
  | 'total_amount'
  | 'created_at'
  | 'updated_at'
  | 'items'
  | 'address'
> & {
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  total_amount: string;
  created_at: string;
  updated_at: string;
  items: OrderItemResponse[];
  address: OrderAddressResponse;
};

export type OrderSummaryResponse = Omit<
  OrderSummaryRecord,
  | 'subtotal'
  | 'shipping_fee'
  | 'discount_amount'
  | 'total_amount'
  | 'created_at'
  | 'updated_at'
> & {
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  total_amount: string;
  created_at: string;
  updated_at: string;
};

export function toOrderRecord(row: OrderRow): OrderRecord {
  if (!isOrderStatus(row.status)) {
    throw new Error('주문 상태가 허용된 값이 아닙니다.');
  }

  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    subtotal: new Decimal(row.subtotal),
    shipping_fee: new Decimal(row.shipping_fee),
    discount_amount: new Decimal(row.discount_amount),
    total_amount: new Decimal(row.total_amount),
    created_at: row.created_at,
    updated_at: row.updated_at,
    items: row.items.map((item) => {
      const unitPrice = new Decimal(item.unit_price);

      return {
        ...item,
        unit_price: unitPrice,
        subtotal: unitPrice.mul(item.quantity),
      };
    }),
    address: row.address,
  };
}

export function toOrderSummaryRecord(row: OrderHeaderRow): OrderSummaryRecord {
  if (!isOrderStatus(row.status)) {
    throw new Error('주문 상태가 허용된 값이 아닙니다.');
  }

  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    subtotal: new Decimal(row.subtotal),
    shipping_fee: new Decimal(row.shipping_fee),
    discount_amount: new Decimal(row.discount_amount),
    total_amount: new Decimal(row.total_amount),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeOrder(order: OrderRecord): OrderResponse {
  return {
    id: order.id,
    user_id: order.user_id,
    status: order.status,
    subtotal: order.subtotal.toFixed(2),
    shipping_fee: order.shipping_fee.toFixed(2),
    discount_amount: order.discount_amount.toFixed(2),
    total_amount: order.total_amount.toFixed(2),
    created_at: order.created_at.toISOString(),
    updated_at: order.updated_at.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price.toFixed(2),
      quantity: item.quantity,
      subtotal: item.subtotal.toFixed(2),
    })),
    address: {
      ...order.address,
      created_at: order.address.created_at.toISOString(),
    },
  };
}

export function serializeOrderSummary(
  order: OrderSummaryRecord,
): OrderSummaryResponse {
  return {
    id: order.id,
    user_id: order.user_id,
    status: order.status,
    subtotal: order.subtotal.toFixed(2),
    shipping_fee: order.shipping_fee.toFixed(2),
    discount_amount: order.discount_amount.toFixed(2),
    total_amount: order.total_amount.toFixed(2),
    created_at: order.created_at.toISOString(),
    updated_at: order.updated_at.toISOString(),
  };
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}
