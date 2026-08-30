import Decimal from 'decimal.js';
import type { AdminCustomerStatus } from './admin-customers.input';
import type { OrderStatus } from '../orders/orders.types';

export type AdminCustomerListRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  order_count: number;
  total_spent: string;
  last_order_at: Date | null;
};

export type AdminCustomerOrderProductRow = {
  product_id: string;
  product_name: string;
  quantity: number;
};

export type AdminCustomerOrderRow = {
  order_id: string;
  status: string;
  total_amount: string;
  created_at: Date;
  product_summary: AdminCustomerOrderProductRow[];
  product_count: number;
};

export type AdminCustomerDetailRow = AdminCustomerListRow & {
  orders: AdminCustomerOrderRow[];
};

export type AdminCustomerCountRow = {
  total_count: number;
};

export type AdminCustomerStatusCountRow = {
  status: string;
  count: number;
};

export type AdminCustomerSummaryRow = {
  total_customer_count: number;
  active_customer_count: number;
  new_customer_count: number;
  repurchase_rate_percent: string;
};

export type AdminCustomerRepositoryResult = {
  rows: AdminCustomerListRow[];
  totalCount: number;
  statusCounts: Record<AdminCustomerStatus, number>;
  summary: AdminCustomerSummaryRow;
};

export type AdminCustomerRecord = Omit<
  AdminCustomerListRow,
  'status' | 'total_spent'
> & {
  status: AdminCustomerStatus;
  total_spent: Decimal;
};

export type AdminCustomerOrderRecord = Omit<
  AdminCustomerOrderRow,
  'status' | 'total_amount'
> & {
  status: OrderStatus;
  total_amount: Decimal;
};

export type AdminCustomerDetailRecord = AdminCustomerRecord & {
  orders: AdminCustomerOrderRecord[];
};

export type AdminCustomerSummaryRecord = {
  total_customer_count: number;
  active_customer_count: number;
  new_customer_count: number;
  repurchase_rate_percent: number;
};

export type AdminCustomerPage = {
  customers: AdminCustomerRecord[];
  totalCount: number;
  statusCounts: Record<AdminCustomerStatus, number>;
  summary: AdminCustomerSummaryRecord;
};

export type AdminCustomerListResponse = {
  customers: Array<{
    id: string;
    name: string;
    email: string;
    status: AdminCustomerStatus;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    order_count: number;
    total_spent: string;
    last_order_at: string | null;
  }>;
  total_count: number;
  status_counts: Record<AdminCustomerStatus, number>;
  summary: AdminCustomerSummaryRecord;
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
};

export type AdminCustomerDetailResponse = {
  id: string;
  name: string;
  email: string;
  status: AdminCustomerStatus;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  order_count: number;
  total_spent: string;
  last_order_at: string | null;
  orders: Array<{
    order_id: string;
    status: OrderStatus;
    total_amount: string;
    created_at: string;
    product_summary: AdminCustomerOrderProductRow[];
    product_count: number;
  }>;
};

export function toAdminCustomerRecord(
  row: AdminCustomerListRow,
): AdminCustomerRecord {
  return {
    ...row,
    status: parseCustomerStatus(row.status),
    total_spent: new Decimal(row.total_spent),
  };
}

export function toAdminCustomerDetailRecord(
  row: AdminCustomerDetailRow,
): AdminCustomerDetailRecord {
  return {
    ...toAdminCustomerRecord(row),
    orders: row.orders.map((order) => ({
      ...order,
      status: parseOrderStatus(order.status),
      total_amount: new Decimal(order.total_amount),
    })),
  };
}

export function toAdminCustomerSummaryRecord(
  row: AdminCustomerSummaryRow,
): AdminCustomerSummaryRecord {
  const repurchaseRate = new Decimal(row.repurchase_rate_percent);

  return {
    total_customer_count: row.total_customer_count,
    active_customer_count: row.active_customer_count,
    new_customer_count: row.new_customer_count,
    repurchase_rate_percent: Number(repurchaseRate.toFixed(2)),
  };
}

export function serializeAdminCustomer(
  customer: AdminCustomerRecord,
): AdminCustomerListResponse['customers'][number] {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    status: customer.status,
    email_verified: customer.email_verified,
    created_at: customer.created_at.toISOString(),
    updated_at: customer.updated_at.toISOString(),
    order_count: customer.order_count,
    total_spent: customer.total_spent.toFixed(2),
    last_order_at: customer.last_order_at?.toISOString() ?? null,
  };
}

export function serializeAdminCustomerDetail(
  customer: AdminCustomerDetailRecord,
): AdminCustomerDetailResponse {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    status: customer.status,
    email_verified: customer.email_verified,
    created_at: customer.created_at.toISOString(),
    updated_at: customer.updated_at.toISOString(),
    order_count: customer.order_count,
    total_spent: customer.total_spent.toFixed(2),
    last_order_at: customer.last_order_at?.toISOString() ?? null,
    orders: customer.orders.map((order) => ({
      order_id: order.order_id,
      status: order.status,
      total_amount: order.total_amount.toFixed(2),
      created_at: order.created_at.toISOString(),
      product_summary: order.product_summary,
      product_count: order.product_count,
    })),
  };
}

export function createEmptyCustomerStatusCounts(): Record<
  AdminCustomerStatus,
  number
> {
  return { active: 0, withdrawn: 0 };
}

function parseCustomerStatus(value: string): AdminCustomerStatus {
  if (value !== 'active' && value !== 'withdrawn') {
    throw new Error('회원 상태가 허용된 값이 아닙니다.');
  }

  return value;
}

function parseOrderStatus(value: string): OrderStatus {
  if (
    value !== 'pending' &&
    value !== 'paid' &&
    value !== 'shipped' &&
    value !== 'completed' &&
    value !== 'cancelled'
  ) {
    throw new Error('주문 상태가 허용된 값이 아닙니다.');
  }

  return value;
}
