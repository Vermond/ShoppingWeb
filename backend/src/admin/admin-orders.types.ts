import Decimal from 'decimal.js';
import { ORDER_STATUSES, type OrderStatus } from '../orders/orders.types';

export type AdminOrderListRow = {
  order_id: string;
  customer_id: string;
  customer_name: string;
  product_summary: unknown;
  product_count: number;
  payment_amount: string;
  status: string;
  ordered_at: Date;
};

export type AdminOrderStatusCountRow = {
  status: string;
  count: number;
};

export type AdminOrderCountRow = {
  total_count: number;
};

export type AdminOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  options: string | null;
  unit_price: string;
  quantity: number;
};

export type AdminOrderAddressRow = {
  order_id: string;
  recipient_name: string;
  phone_number: string;
  postal_code: string;
  address_line1: string;
  address_line2: string | null;
  delivery_request: string | null;
  created_at: Date;
};

export type AdminOrderHeaderRow = {
  order_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  total_amount: string;
  created_at: Date;
  updated_at: Date;
  address: AdminOrderAddressRow | null;
};

export type AdminOrderStatusHistoryRow = {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  created_at: Date;
};

export type AdminOrderCancellationItemRow = {
  product_id: string;
  quantity: number;
};

export type AdminOrderRepositoryResult = {
  orders: AdminOrderListRow[];
  totalCount: number;
  statusCounts: Record<OrderStatus, number>;
};

export type AdminOrderDetailRepositoryResult = {
  header: AdminOrderHeaderRow;
  items: AdminOrderItemRow[];
  statusHistory: AdminOrderStatusHistoryRow[];
};

export type AdminOrderProductSummary = {
  product_id: string;
  product_name: string;
  quantity: number;
};

export type AdminOrderListRecord = {
  order_id: string;
  customer_id: string;
  customer_name: string;
  product_summary: AdminOrderProductSummary[];
  product_count: number;
  payment_amount: Decimal;
  payment_status: AdminPaymentStatus;
  payment_method: null;
  shipping_status: AdminShippingStatus;
  carrier: null;
  tracking_number: null;
  status: OrderStatus;
  ordered_at: Date;
};

export type AdminOrderItemRecord = Omit<AdminOrderItemRow, 'unit_price'> & {
  unit_price: Decimal;
  subtotal: Decimal;
};

export type AdminOrderDetailRecord = {
  order_id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone_number: string | null;
  };
  status: OrderStatus;
  subtotal: Decimal;
  shipping_fee: Decimal;
  discount_amount: Decimal;
  total_amount: Decimal;
  created_at: Date;
  updated_at: Date;
  items: AdminOrderItemRecord[];
  address: AdminOrderAddressRow | null;
  payment: AdminPaymentRecord;
  shipping: AdminShippingRecord;
  status_history: AdminOrderStatusHistoryRecord[];
};

export type AdminPaymentStatus = 'pending' | 'paid' | 'cancelled';

export type AdminPaymentRecord = {
  provider: 'mock';
  status: AdminPaymentStatus;
  method: null;
  transaction_id: null;
  approved_at: null;
};

export type AdminShippingStatus =
  'not_started' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';

export type AdminShippingRecord = {
  status: AdminShippingStatus;
  carrier: null;
  tracking_number: null;
};

export type AdminOrderStatusHistoryRecord = {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  created_at: Date;
};

export type AdminOrderListResponse = {
  orders: Array<{
    order_id: string;
    customer_id: string;
    customer_name: string;
    product_summary: AdminOrderProductSummary[];
    product_count: number;
    payment_amount: string;
    payment_status: AdminPaymentStatus;
    payment_method: null;
    shipping_status: AdminShippingStatus;
    carrier: null;
    tracking_number: null;
    status: OrderStatus;
    ordered_at: string;
  }>;
  total_count: number;
  status_counts: Record<OrderStatus, number>;
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
};

export type AdminOrderDetailResponse = {
  order_id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone_number: string | null;
  };
  status: OrderStatus;
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  total_amount: string;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    options: string | null;
    unit_price: string;
    quantity: number;
    subtotal: string;
  }>;
  address: {
    order_id: string;
    recipient_name: string;
    phone_number: string;
    postal_code: string;
    address_line1: string;
    address_line2: string | null;
    delivery_request: string | null;
    created_at: string;
  } | null;
  payment: {
    provider: 'mock';
    status: AdminPaymentStatus;
    method: null;
    transaction_id: null;
    approved_at: null;
  };
  shipping: {
    status: AdminShippingStatus;
    carrier: null;
    tracking_number: null;
  };
  status_history: Array<{
    id: string;
    from_status: OrderStatus | null;
    to_status: OrderStatus;
    changed_by: string | null;
    created_at: string;
  }>;
};

export function toAdminOrderListRecord(
  row: AdminOrderListRow,
): AdminOrderListRecord {
  const status = parseOrderStatus(row.status);

  return {
    order_id: row.order_id,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    product_summary: parseProductSummary(row.product_summary),
    product_count: row.product_count,
    payment_amount: new Decimal(row.payment_amount),
    payment_status: getPaymentStatus(status),
    payment_method: null,
    shipping_status: getShippingStatus(status),
    carrier: null,
    tracking_number: null,
    status,
    ordered_at: row.ordered_at,
  };
}

export function toAdminOrderDetailRecord(
  result: AdminOrderDetailRepositoryResult,
): AdminOrderDetailRecord {
  const { header } = result;
  const status = parseOrderStatus(header.status);

  return {
    order_id: header.order_id,
    customer: {
      id: header.customer_id,
      name: header.customer_name,
      email: header.customer_email,
      phone_number: header.address?.phone_number ?? null,
    },
    status,
    subtotal: new Decimal(header.subtotal),
    shipping_fee: new Decimal(header.shipping_fee),
    discount_amount: new Decimal(header.discount_amount),
    total_amount: new Decimal(header.total_amount),
    created_at: header.created_at,
    updated_at: header.updated_at,
    items: result.items.map((item) => {
      const unitPrice = new Decimal(item.unit_price);

      return {
        ...item,
        unit_price: unitPrice,
        subtotal: unitPrice.mul(item.quantity),
      };
    }),
    address: header.address,
    payment: {
      provider: 'mock',
      status: getPaymentStatus(status),
      method: null,
      transaction_id: null,
      approved_at: null,
    },
    shipping: {
      status: getShippingStatus(status),
      carrier: null,
      tracking_number: null,
    },
    status_history: result.statusHistory.map((history) => ({
      ...history,
      from_status: history.from_status
        ? parseOrderStatus(history.from_status)
        : null,
      to_status: parseOrderStatus(history.to_status),
    })),
  };
}

export function serializeAdminOrderList(
  order: AdminOrderListRecord,
): AdminOrderListResponse['orders'][number] {
  return {
    order_id: order.order_id,
    customer_id: order.customer_id,
    customer_name: order.customer_name,
    product_summary: order.product_summary,
    product_count: order.product_count,
    payment_amount: order.payment_amount.toFixed(2),
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    shipping_status: order.shipping_status,
    carrier: order.carrier,
    tracking_number: order.tracking_number,
    status: order.status,
    ordered_at: order.ordered_at.toISOString(),
  };
}

export function serializeAdminOrderDetail(
  order: AdminOrderDetailRecord,
): AdminOrderDetailResponse {
  return {
    order_id: order.order_id,
    customer: order.customer,
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
      options: item.options,
      unit_price: item.unit_price.toFixed(2),
      quantity: item.quantity,
      subtotal: item.subtotal.toFixed(2),
    })),
    address: order.address
      ? {
          ...order.address,
          created_at: order.address.created_at.toISOString(),
        }
      : null,
    payment: order.payment,
    shipping: order.shipping,
    status_history: order.status_history.map((history) => ({
      ...history,
      created_at: history.created_at.toISOString(),
    })),
  };
}

export function createEmptyStatusCounts(): Record<OrderStatus, number> {
  return Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;
}

function parseProductSummary(value: unknown): AdminOrderProductSummary[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isProductSummaryItem(item)) {
      return [];
    }

    return [
      {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
      },
    ];
  });
}

function isProductSummaryItem(
  value: unknown,
): value is AdminOrderProductSummary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.product_id === 'string' &&
    typeof item.product_name === 'string' &&
    typeof item.quantity === 'number'
  );
}

function getPaymentStatus(status: OrderStatus): AdminPaymentStatus {
  if (status === 'pending') {
    return 'pending';
  }

  if (status === 'cancelled') {
    return 'cancelled';
  }

  return 'paid';
}

function getShippingStatus(status: OrderStatus): AdminShippingStatus {
  switch (status) {
    case 'pending':
      return 'not_started';
    case 'paid':
      return 'preparing';
    case 'shipped':
      return 'shipping';
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
  }
}

function parseOrderStatus(value: string): OrderStatus {
  if (!(ORDER_STATUSES as readonly string[]).includes(value)) {
    throw new Error('주문 상태가 허용된 값이 아닙니다.');
  }

  return value as OrderStatus;
}
