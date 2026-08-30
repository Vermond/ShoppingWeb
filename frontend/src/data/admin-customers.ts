import type {
  AdminCustomerDetailResponse,
  AdminCustomerListQuery,
  AdminCustomerListResponse,
  AdminCustomerStatus,
} from '../repositories/admin-customers.server.repository';

export type { AdminCustomerStatus } from '../repositories/admin-customers.server.repository';

export type AdminCustomerListItem = {
  id: string;
  name: string;
  email: string;
  status: AdminCustomerStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

export type AdminCustomersData = {
  customers: AdminCustomerListItem[];
  totalCount: number;
  statusCounts: Record<AdminCustomerStatus, number>;
  summary: {
    totalCustomerCount: number;
    activeCustomerCount: number;
    newCustomerCount: number;
    repurchaseRatePercent: number;
  };
  pagination: AdminCustomerListResponse['pagination'];
  query: AdminCustomerListQuery;
};

export type AdminCustomerDetailData = {
  id: string;
  name: string;
  email: string;
  status: AdminCustomerStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  orderCount: number;
  totalSpent: string;
  lastOrderAt: string | null;
  orders: Array<{
    orderId: string;
    status: AdminCustomerDetailResponse['orders'][number]['status'];
    totalAmount: string;
    createdAt: string;
    productSummary: AdminCustomerDetailResponse['orders'][number]['product_summary'];
    productCount: number;
  }>;
};

function toFiniteNumber(value: string | number, fieldName: string): number {
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`관리자 고객의 ${fieldName} 값을 표시할 수 없습니다.`);
  }

  return numberValue;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '시간 정보 없음';
  }

  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

function mapCustomer(
  customer: AdminCustomerListResponse['customers'][number],
): AdminCustomerListItem {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    status: customer.status,
    emailVerified: customer.email_verified,
    createdAt: formatDateTime(customer.created_at),
    updatedAt: formatDateTime(customer.updated_at),
    orderCount: customer.order_count,
    totalSpent: toFiniteNumber(customer.total_spent, '누적 구매 금액'),
    lastOrderAt: customer.last_order_at
      ? formatDateTime(customer.last_order_at)
      : null,
  };
}

export function mapAdminCustomersResponse(
  response: AdminCustomerListResponse,
  query: AdminCustomerListQuery = {},
): AdminCustomersData {
  return {
    customers: response.customers.map(mapCustomer),
    totalCount: response.total_count,
    statusCounts: response.status_counts,
    summary: {
      totalCustomerCount: response.summary.total_customer_count,
      activeCustomerCount: response.summary.active_customer_count,
      newCustomerCount: response.summary.new_customer_count,
      repurchaseRatePercent: response.summary.repurchase_rate_percent,
    },
    pagination: response.pagination,
    query,
  };
}

export function mapAdminCustomerDetailResponse(
  response: AdminCustomerDetailResponse,
): AdminCustomerDetailData {
  return {
    id: response.id,
    name: response.name,
    email: response.email,
    status: response.status,
    emailVerified: response.email_verified,
    createdAt: formatDateTime(response.created_at),
    updatedAt: formatDateTime(response.updated_at),
    orderCount: response.order_count,
    totalSpent: response.total_spent,
    lastOrderAt: response.last_order_at
      ? formatDateTime(response.last_order_at)
      : null,
    orders: response.orders.map((order) => ({
      orderId: order.order_id,
      status: order.status,
      totalAmount: order.total_amount,
      createdAt: formatDateTime(order.created_at),
      productSummary: order.product_summary,
      productCount: order.product_count,
    })),
  };
}

export async function getAdminCustomersData(
  cookieHeader: string,
  query: AdminCustomerListQuery = {},
): Promise<AdminCustomersData> {
  const { requestAdminCustomersOnServer } = await import(
    '../repositories/admin-customers.server.repository'
  );
  const response = await requestAdminCustomersOnServer(cookieHeader, query);

  return mapAdminCustomersResponse(response, query);
}

export async function getAdminCustomerDetailData(
  cookieHeader: string,
  customerId: string,
): Promise<AdminCustomerDetailData> {
  const { requestAdminCustomerDetailOnServer } = await import(
    '../repositories/admin-customers.server.repository'
  );
  const response = await requestAdminCustomerDetailOnServer(
    cookieHeader,
    customerId,
  );

  return mapAdminCustomerDetailResponse(response);
}
