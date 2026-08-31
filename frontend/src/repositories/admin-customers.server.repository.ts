import { AuthRequestError } from './auth.repository';

export type AdminCustomerStatus = 'active' | 'withdrawn';

export type AdminCustomerSort =
  | 'created_at_desc'
  | 'created_at_asc'
  | 'order_count_desc'
  | 'total_spent_desc'
  | 'last_order_at_desc';

type AdminCustomerOrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export type AdminCustomerListQuery = {
  search?: string;
  status?: AdminCustomerStatus;
  emailVerified?: boolean;
  from?: string;
  to?: string;
  sort?: AdminCustomerSort;
  page?: number;
  pageSize?: number;
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
  summary: {
    total_customer_count: number;
    active_customer_count: number;
    new_customer_count: number;
    repurchase_rate_percent: number;
  };
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
    status: AdminCustomerOrderStatus;
    total_amount: string;
    created_at: string;
    product_summary: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
    }>;
    product_count: number;
  }>;
};

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null;
}

function getResponseMessage(result: unknown, fallback: string): string {
  if (!isRecord(result)) {
    return fallback;
  }

  if (typeof result.message === 'string') {
    return result.message;
  }

  if (typeof result.error === 'string') {
    return result.error;
  }

  return fallback;
}

function buildQuery(query: AdminCustomerListQuery): string {
  const params = new URLSearchParams();

  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.emailVerified !== undefined) {
    params.set('email_verified', String(query.emailVerified));
  }
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.sort) params.set('sort', query.sort);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('page_size', String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

async function requestAdminCustomerApi(
  cookieHeader: string,
  path: string,
  fallbackMessage: string,
): Promise<unknown> {
  const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.replace(
    /\/$/,
    '',
  );

  if (!backendApiBaseUrl) {
    throw new AuthRequestError(
      '백엔드 API 주소가 설정되지 않아 관리자 고객을 불러올 수 없습니다.',
      { status: 500 },
    );
  }

  let response: Response;

  try {
    response = await fetch(`${backendApiBaseUrl}${path}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new AuthRequestError('관리자 고객 서버와 통신하지 못했습니다.', {
      status: 503,
    });
  }

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthRequestError(getResponseMessage(result, fallbackMessage), {
      code: getResponseCode(result),
      status: response.status,
    });
  }

  return result;
}

function getResponseCode(result: unknown): string | undefined {
  return isRecord(result) && typeof result.code === 'string'
    ? result.code
    : undefined;
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`관리자 고객 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readNullableString(value: unknown, fieldName: string): string | null {
  if (value !== null && typeof value !== 'string') {
    throw new Error(`관리자 고객 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`관리자 고객 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`관리자 고객 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readStatus(value: unknown, fieldName: string): AdminCustomerStatus {
  if (value !== 'active' && value !== 'withdrawn') {
    throw new Error(`관리자 고객 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readOrderStatus(
  value: unknown,
  fieldName: string,
): AdminCustomerOrderStatus {
  if (
    value !== 'pending' &&
    value !== 'paid' &&
    value !== 'shipped' &&
    value !== 'completed' &&
    value !== 'cancelled'
  ) {
    throw new Error(`관리자 고객 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`관리자 고객 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readProductSummary(
  value: unknown,
  fieldName: string,
): AdminCustomerDetailResponse['orders'][number]['product_summary'] {
  return readArray(value, fieldName).map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${fieldName}[${index}] 응답 형식이 올바르지 않습니다.`);
    }

    return {
      product_id: readString(item.product_id, `${fieldName}[${index}].product_id`),
      product_name: readString(
        item.product_name,
        `${fieldName}[${index}].product_name`,
      ),
      quantity: readNumber(item.quantity, `${fieldName}[${index}].quantity`),
    };
  });
}

function parseResponse<T>(value: unknown, parser: (input: unknown) => T): T {
  try {
    return parser(value);
  } catch (error) {
    throw new AuthRequestError(
      error instanceof Error
        ? error.message
        : '관리자 고객 응답을 처리하지 못했습니다.',
      { status: 502 },
    );
  }
}

function readListResponse(value: unknown): AdminCustomerListResponse {
  if (!isRecord(value)) {
    throw new Error('관리자 고객 목록 응답 형식이 올바르지 않습니다.');
  }

  const statusCounts = isRecord(value.status_counts)
    ? value.status_counts
    : null;
  const summary = isRecord(value.summary) ? value.summary : null;
  const pagination = isRecord(value.pagination) ? value.pagination : null;

  if (!statusCounts || !summary || !pagination) {
    throw new Error('관리자 고객 응답에 필수 영역이 없습니다.');
  }

  const customers = readArray(value.customers, 'customers').map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`customers[${index}] 응답 형식이 올바르지 않습니다.`);
    }

    return {
      id: readString(item.id, `customers[${index}].id`),
      name: readString(item.name, `customers[${index}].name`),
      email: readString(item.email, `customers[${index}].email`),
      status: readStatus(item.status, `customers[${index}].status`),
      email_verified: readBoolean(
        item.email_verified,
        `customers[${index}].email_verified`,
      ),
      created_at: readString(item.created_at, `customers[${index}].created_at`),
      updated_at: readString(item.updated_at, `customers[${index}].updated_at`),
      order_count: readNumber(item.order_count, `customers[${index}].order_count`),
      total_spent: readString(item.total_spent, `customers[${index}].total_spent`),
      last_order_at: readNullableString(
        item.last_order_at,
        `customers[${index}].last_order_at`,
      ),
    };
  });

  return {
    customers,
    total_count: readNumber(value.total_count, 'total_count'),
    status_counts: {
      active: readNumber(statusCounts.active, 'status_counts.active'),
      withdrawn: readNumber(statusCounts.withdrawn, 'status_counts.withdrawn'),
    },
    summary: {
      total_customer_count: readNumber(
        summary.total_customer_count,
        'summary.total_customer_count',
      ),
      active_customer_count: readNumber(
        summary.active_customer_count,
        'summary.active_customer_count',
      ),
      new_customer_count: readNumber(
        summary.new_customer_count,
        'summary.new_customer_count',
      ),
      repurchase_rate_percent: readNumber(
        summary.repurchase_rate_percent,
        'summary.repurchase_rate_percent',
      ),
    },
    pagination: {
      page: readNumber(pagination.page, 'pagination.page'),
      page_size: readNumber(pagination.page_size, 'pagination.page_size'),
      total_count: readNumber(pagination.total_count, 'pagination.total_count'),
      total_pages: readNumber(pagination.total_pages, 'pagination.total_pages'),
      has_next: readBoolean(pagination.has_next, 'pagination.has_next'),
      has_previous: readBoolean(
        pagination.has_previous,
        'pagination.has_previous',
      ),
    },
  };
}

function readDetailResponse(value: unknown): AdminCustomerDetailResponse {
  const customer = isRecord(value) && isRecord(value.customer)
    ? value.customer
    : null;

  if (!customer) {
    throw new Error('관리자 고객 상세 응답 형식이 올바르지 않습니다.');
  }

  const orders = readArray(customer.orders, 'customer.orders').map(
    (item, index) => {
      if (!isRecord(item)) {
        throw new Error(`customer.orders[${index}] 응답 형식이 올바르지 않습니다.`);
      }

      return {
        order_id: readString(item.order_id, `customer.orders[${index}].order_id`),
        status: readOrderStatus(item.status, `customer.orders[${index}].status`),
        total_amount: readString(
          item.total_amount,
          `customer.orders[${index}].total_amount`,
        ),
        created_at: readString(
          item.created_at,
          `customer.orders[${index}].created_at`,
        ),
        product_summary: readProductSummary(
          item.product_summary,
          `customer.orders[${index}].product_summary`,
        ),
        product_count: readNumber(
          item.product_count,
          `customer.orders[${index}].product_count`,
        ),
      };
    },
  );

  return {
    id: readString(customer.id, 'customer.id'),
    name: readString(customer.name, 'customer.name'),
    email: readString(customer.email, 'customer.email'),
    status: readStatus(customer.status, 'customer.status'),
    email_verified: readBoolean(customer.email_verified, 'customer.email_verified'),
    created_at: readString(customer.created_at, 'customer.created_at'),
    updated_at: readString(customer.updated_at, 'customer.updated_at'),
    order_count: readNumber(customer.order_count, 'customer.order_count'),
    total_spent: readString(customer.total_spent, 'customer.total_spent'),
    last_order_at: readNullableString(
      customer.last_order_at,
      'customer.last_order_at',
    ),
    orders,
  };
}

export async function requestAdminCustomersOnServer(
  cookieHeader: string,
  query: AdminCustomerListQuery = {},
): Promise<AdminCustomerListResponse> {
  const result = await requestAdminCustomerApi(
    cookieHeader,
    `/api/admin/customers${buildQuery(query)}`,
    '관리자 고객을 불러오지 못했습니다.',
  );

  return parseResponse(result, readListResponse);
}

export async function requestAdminCustomerDetailOnServer(
  cookieHeader: string,
  customerId: string,
): Promise<AdminCustomerDetailResponse> {
  const result = await requestAdminCustomerApi(
    cookieHeader,
    `/api/admin/customers/${encodeURIComponent(customerId)}`,
    '관리자 고객 상세를 불러오지 못했습니다.',
  );

  return parseResponse(result, readDetailResponse);
}
