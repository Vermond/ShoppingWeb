import { AuthRequestError } from "./auth.repository";

export type AdminOrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled";

export type AdminPaymentStatus = "pending" | "paid" | "cancelled";

export type AdminShippingStatus =
  | "not_started"
  | "preparing"
  | "shipping"
  | "delivered"
  | "cancelled";

export type AdminOrderListQuery = {
  from?: string;
  to?: string;
  status?: AdminOrderStatus;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AdminOrderListResponse = {
  orders: Array<{
    order_id: string;
    customer_id: string;
    customer_name: string;
    product_summary: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
    }>;
    product_count: number;
    payment_amount: string;
    payment_status: AdminPaymentStatus;
    payment_method: string | null;
    shipping_status: AdminShippingStatus;
    carrier: string | null;
    tracking_number: string | null;
    status: AdminOrderStatus;
    ordered_at: string;
  }>;
  total_count: number;
  status_counts: Record<AdminOrderStatus, number>;
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
  status: AdminOrderStatus;
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
    provider: "mock";
    status: AdminPaymentStatus;
    method: string | null;
    transaction_id: string | null;
    approved_at: string | null;
  };
  shipping: {
    status: AdminShippingStatus;
    carrier: string | null;
    tracking_number: string | null;
  };
  status_history: Array<{
    id: string;
    from_status: AdminOrderStatus | null;
    to_status: AdminOrderStatus;
    changed_by: string | null;
    created_at: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getResponseMessage(result: unknown, fallback: string): string {
  if (!isRecord(result)) {
    return fallback;
  }

  if (typeof result.message === "string") {
    return result.message;
  }

  if (typeof result.error === "string") {
    return result.error;
  }

  return fallback;
}

function getResponseCode(result: unknown): string | undefined {
  if (isRecord(result) && typeof result.code === "string") {
    return result.code;
  }

  return undefined;
}

function buildQuery(query: AdminOrderListQuery): string {
  const params = new URLSearchParams();

  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.status) params.set("status", query.status);
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function requestAdminApi(
  cookieHeader: string,
  path: string,
): Promise<unknown> {
  const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.replace(/\/$/, "");

  if (!backendApiBaseUrl) {
    throw new AuthRequestError(
      "백엔드 API 주소가 설정되지 않아 관리자 주문을 불러올 수 없습니다.",
      { status: 500 },
    );
  }

  let response: Response;

  try {
    response = await fetch(`${backendApiBaseUrl}${path}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
  } catch {
    throw new AuthRequestError("관리자 주문 서버와 통신하지 못했습니다.", {
      status: 503,
    });
  }

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthRequestError(
      getResponseMessage(result, "관리자 주문을 불러오지 못했습니다."),
      {
        code: getResponseCode(result),
        status: response.status,
      },
    );
  }

  return result;
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`관리자 주문 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readNullableString(value: unknown, fieldName: string): string | null {
  if (value !== null && typeof value !== "string") {
    throw new Error(`관리자 주문 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`관리자 주문 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`관리자 주문 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readOrderStatus(value: unknown, fieldName: string): AdminOrderStatus {
  if (
    value !== "pending" &&
    value !== "paid" &&
    value !== "shipped" &&
    value !== "completed" &&
    value !== "cancelled"
  ) {
    throw new Error(`관리자 주문 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readPaymentStatus(value: unknown, fieldName: string): AdminPaymentStatus {
  if (value !== "pending" && value !== "paid" && value !== "cancelled") {
    throw new Error(`관리자 주문 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readShippingStatus(value: unknown, fieldName: string): AdminShippingStatus {
  if (
    value !== "not_started" &&
    value !== "preparing" &&
    value !== "shipping" &&
    value !== "delivered" &&
    value !== "cancelled"
  ) {
    throw new Error(`관리자 주문 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`관리자 주문 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readProductSummary(value: unknown, fieldName: string) {
  return readArray(value, fieldName).map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`관리자 주문 응답의 ${fieldName}[${index}] 형식이 올바르지 않습니다.`);
    }

    return {
      product_id: readString(item.product_id, `${fieldName}[${index}].product_id`),
      product_name: readString(item.product_name, `${fieldName}[${index}].product_name`),
      quantity: readNumber(item.quantity, `${fieldName}[${index}].quantity`),
    };
  });
}

function readStatusCounts(value: unknown): Record<AdminOrderStatus, number> {
  if (!isRecord(value)) {
    throw new Error("관리자 주문 응답의 status_counts 값이 올바르지 않습니다.");
  }

  return {
    pending: readNumber(value.pending, "status_counts.pending"),
    paid: readNumber(value.paid, "status_counts.paid"),
    shipped: readNumber(value.shipped, "status_counts.shipped"),
    completed: readNumber(value.completed, "status_counts.completed"),
    cancelled: readNumber(value.cancelled, "status_counts.cancelled"),
  };
}

function readListResponse(value: unknown): AdminOrderListResponse {
  if (!isRecord(value)) {
    throw new Error("관리자 주문 목록 응답 형식이 올바르지 않습니다.");
  }

  const pagination = isRecord(value.pagination) ? value.pagination : null;
  if (!pagination) {
    throw new Error("관리자 주문 응답에 pagination 정보가 없습니다.");
  }

  const orders = readArray(value.orders, "orders").map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`관리자 주문 응답의 orders[${index}] 형식이 올바르지 않습니다.`);
    }

    return {
      order_id: readString(item.order_id, `orders[${index}].order_id`),
      customer_id: readString(item.customer_id, `orders[${index}].customer_id`),
      customer_name: readString(item.customer_name, `orders[${index}].customer_name`),
      product_summary: readProductSummary(
        item.product_summary,
        `orders[${index}].product_summary`,
      ),
      product_count: readNumber(item.product_count, `orders[${index}].product_count`),
      payment_amount: readString(item.payment_amount, `orders[${index}].payment_amount`),
      payment_status: readPaymentStatus(
        item.payment_status,
        `orders[${index}].payment_status`,
      ),
      payment_method: readNullableString(
        item.payment_method,
        `orders[${index}].payment_method`,
      ),
      shipping_status: readShippingStatus(
        item.shipping_status,
        `orders[${index}].shipping_status`,
      ),
      carrier: readNullableString(item.carrier, `orders[${index}].carrier`),
      tracking_number: readNullableString(
        item.tracking_number,
        `orders[${index}].tracking_number`,
      ),
      status: readOrderStatus(item.status, `orders[${index}].status`),
      ordered_at: readString(item.ordered_at, `orders[${index}].ordered_at`),
    };
  });

  return {
    orders,
    total_count: readNumber(value.total_count, "total_count"),
    status_counts: readStatusCounts(value.status_counts),
    pagination: {
      page: readNumber(pagination.page, "pagination.page"),
      page_size: readNumber(pagination.page_size, "pagination.page_size"),
      total_count: readNumber(pagination.total_count, "pagination.total_count"),
      total_pages: readNumber(pagination.total_pages, "pagination.total_pages"),
      has_next: readBoolean(pagination.has_next, "pagination.has_next"),
      has_previous: readBoolean(pagination.has_previous, "pagination.has_previous"),
    },
  };
}

function readDetailResponse(value: unknown): AdminOrderDetailResponse {
  const root = isRecord(value) && isRecord(value.order) ? value.order : null;

  if (!root) {
    throw new Error("관리자 주문 상세 응답 형식이 올바르지 않습니다.");
  }

  const customer = isRecord(root.customer) ? root.customer : null;
  const payment = isRecord(root.payment) ? root.payment : null;
  const shipping = isRecord(root.shipping) ? root.shipping : null;
  const address = root.address === null ? null : isRecord(root.address) ? root.address : null;

  if (!customer || !payment || !shipping || (root.address !== null && !address)) {
    throw new Error("관리자 주문 상세 응답에 필수 영역이 없습니다.");
  }

  if (payment.provider !== "mock") {
    throw new Error("관리자 주문 응답의 order.payment.provider 값이 올바르지 않습니다.");
  }

  const items = readArray(root.items, "order.items").map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`관리자 주문 응답의 order.items[${index}] 형식이 올바르지 않습니다.`);
    }

    return {
      id: readString(item.id, `order.items[${index}].id`),
      order_id: readString(item.order_id, `order.items[${index}].order_id`),
      product_id: readString(item.product_id, `order.items[${index}].product_id`),
      product_name: readString(item.product_name, `order.items[${index}].product_name`),
      options: readNullableString(item.options, `order.items[${index}].options`),
      unit_price: readString(item.unit_price, `order.items[${index}].unit_price`),
      quantity: readNumber(item.quantity, `order.items[${index}].quantity`),
      subtotal: readString(item.subtotal, `order.items[${index}].subtotal`),
    };
  });

  const statusHistory = readArray(root.status_history, "order.status_history").map(
    (item, index) => {
      if (!isRecord(item)) {
        throw new Error(
          `관리자 주문 응답의 order.status_history[${index}] 형식이 올바르지 않습니다.`,
        );
      }

      return {
        id: readString(item.id, `order.status_history[${index}].id`),
        from_status:
          item.from_status === null
            ? null
            : readOrderStatus(item.from_status, `order.status_history[${index}].from_status`),
        to_status: readOrderStatus(
          item.to_status,
          `order.status_history[${index}].to_status`,
        ),
        changed_by: readNullableString(
          item.changed_by,
          `order.status_history[${index}].changed_by`,
        ),
        created_at: readString(
          item.created_at,
          `order.status_history[${index}].created_at`,
        ),
      };
    },
  );

  return {
    order_id: readString(root.order_id, "order.order_id"),
    customer: {
      id: readString(customer.id, "order.customer.id"),
      name: readString(customer.name, "order.customer.name"),
      email: readString(customer.email, "order.customer.email"),
      phone_number: readNullableString(
        customer.phone_number,
        "order.customer.phone_number",
      ),
    },
    status: readOrderStatus(root.status, "order.status"),
    subtotal: readString(root.subtotal, "order.subtotal"),
    shipping_fee: readString(root.shipping_fee, "order.shipping_fee"),
    discount_amount: readString(root.discount_amount, "order.discount_amount"),
    total_amount: readString(root.total_amount, "order.total_amount"),
    created_at: readString(root.created_at, "order.created_at"),
    updated_at: readString(root.updated_at, "order.updated_at"),
    items,
    address: address
      ? {
          order_id: readString(address.order_id, "order.address.order_id"),
          recipient_name: readString(
            address.recipient_name,
            "order.address.recipient_name",
          ),
          phone_number: readString(address.phone_number, "order.address.phone_number"),
          postal_code: readString(address.postal_code, "order.address.postal_code"),
          address_line1: readString(address.address_line1, "order.address.address_line1"),
          address_line2: readNullableString(
            address.address_line2,
            "order.address.address_line2",
          ),
          delivery_request: readNullableString(
            address.delivery_request,
            "order.address.delivery_request",
          ),
          created_at: readString(address.created_at, "order.address.created_at"),
        }
      : null,
    payment: {
      provider: "mock",
      status: readPaymentStatus(payment.status, "order.payment.status"),
      method: readNullableString(payment.method, "order.payment.method"),
      transaction_id: readNullableString(
        payment.transaction_id,
        "order.payment.transaction_id",
      ),
      approved_at: readNullableString(payment.approved_at, "order.payment.approved_at"),
    },
    shipping: {
      status: readShippingStatus(shipping.status, "order.shipping.status"),
      carrier: readNullableString(shipping.carrier, "order.shipping.carrier"),
      tracking_number: readNullableString(
        shipping.tracking_number,
        "order.shipping.tracking_number",
      ),
    },
    status_history: statusHistory,
  };
}

function parseResponse<T>(value: unknown, parser: (input: unknown) => T): T {
  try {
    return parser(value);
  } catch (error) {
    throw new AuthRequestError(
      error instanceof Error ? error.message : "관리자 주문 응답을 처리하지 못했습니다.",
      { status: 502 },
    );
  }
}

export async function requestAdminOrdersOnServer(
  cookieHeader: string,
  query: AdminOrderListQuery = {},
): Promise<AdminOrderListResponse> {
  const result = await requestAdminApi(
    cookieHeader,
    `/api/admin/orders${buildQuery(query)}`,
  );

  return parseResponse(result, readListResponse);
}

export async function requestAdminOrderDetailOnServer(
  cookieHeader: string,
  orderId: string,
): Promise<AdminOrderDetailResponse> {
  const result = await requestAdminApi(
    cookieHeader,
    `/api/admin/orders/${encodeURIComponent(orderId)}`,
  );

  return parseResponse(result, readDetailResponse);
}
