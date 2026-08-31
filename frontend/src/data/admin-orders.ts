import type {
  AdminOrderDetailResponse,
  AdminOrderListQuery,
  AdminOrderListResponse,
  AdminOrderStatus,
  AdminPaymentStatus,
  AdminShippingStatus,
} from "../repositories/admin-orders.server.repository";

export type { AdminOrderStatus } from "../repositories/admin-orders.server.repository";

export type AdminOrderListItem = {
  id: string;
  customerId: string;
  customer: string;
  product: string;
  productCount: number;
  amount: number;
  paymentStatus: AdminPaymentStatus;
  paymentMethod: string | null;
  shippingStatus: AdminShippingStatus;
  carrier: string | null;
  trackingNumber: string | null;
  status: AdminOrderStatus;
  orderedAt: string;
};

export type AdminOrdersData = {
  orders: AdminOrderListItem[];
  totalCount: number;
  statusCounts: Record<AdminOrderStatus, number>;
  pagination: AdminOrderListResponse["pagination"];
  search: string;
  status: AdminOrderStatus | null;
};

export type AdminOrderDetailData = {
  orderId: string;
  customer: AdminOrderDetailResponse["customer"];
  status: AdminOrderStatus;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    orderId: string;
    productId: string;
    productName: string;
    options: string | null;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  address: AdminOrderDetailResponse["address"];
  payment: AdminOrderDetailResponse["payment"];
  shipping: AdminOrderDetailResponse["shipping"];
  statusHistory: Array<{
    id: string;
    fromStatus: AdminOrderStatus | null;
    toStatus: AdminOrderStatus;
    changedBy: string | null;
    createdAt: string;
  }>;
};

export const adminOrderStatusLabels: Record<AdminOrderStatus, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  shipped: "배송중",
  completed: "배송 완료",
  cancelled: "취소",
};

export const adminPaymentStatusLabels: Record<AdminPaymentStatus, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  cancelled: "결제 취소",
};

export const adminShippingStatusLabels: Record<AdminShippingStatus, string> = {
  not_started: "배송 전",
  preparing: "상품 준비중",
  shipping: "배송중",
  delivered: "배송 완료",
  cancelled: "배송 취소",
};

export const adminOrderStatusTransitions: Record<
  AdminOrderStatus,
  readonly AdminOrderStatus[]
> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

function toFiniteNumber(value: string | number, fieldName: string): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`관리자 주문의 ${fieldName} 값을 표시할 수 없습니다.`);
  }

  return numberValue;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "시간 정보 없음";
  }

  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

function formatProductSummary(
  products: AdminOrderListResponse["orders"][number]["product_summary"],
): string {
  const firstProduct = products[0]?.product_name ?? "상품 정보 없음";

  if (products.length <= 1) {
    return firstProduct;
  }

  return `${firstProduct} 외 ${products.length - 1}건`;
}

function mapOrderListItem(
  order: AdminOrderListResponse["orders"][number],
): AdminOrderListItem {
  return {
    id: order.order_id,
    customerId: order.customer_id,
    customer: order.customer_name,
    product: formatProductSummary(order.product_summary),
    productCount: order.product_count,
    amount: toFiniteNumber(order.payment_amount, "결제 금액"),
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    shippingStatus: order.shipping_status,
    carrier: order.carrier,
    trackingNumber: order.tracking_number,
    status: order.status,
    orderedAt: formatDateTime(order.ordered_at),
  };
}

export function mapAdminOrdersResponse(
  response: AdminOrderListResponse,
  query: AdminOrderListQuery = {},
): AdminOrdersData {
  return {
    orders: response.orders.map(mapOrderListItem),
    totalCount: response.total_count,
    statusCounts: response.status_counts,
    pagination: response.pagination,
    search: query.search ?? "",
    status: query.status ?? null,
  };
}

export function mapAdminOrderDetailResponse(
  response: AdminOrderDetailResponse,
): AdminOrderDetailData {
  return {
    orderId: response.order_id,
    customer: response.customer,
    status: response.status,
    subtotal: toFiniteNumber(response.subtotal, "상품 금액"),
    shippingFee: toFiniteNumber(response.shipping_fee, "배송비"),
    discountAmount: toFiniteNumber(response.discount_amount, "할인 금액"),
    totalAmount: toFiniteNumber(response.total_amount, "최종 결제 금액"),
    createdAt: formatDateTime(response.created_at),
    updatedAt: formatDateTime(response.updated_at),
    items: response.items.map((item) => ({
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id,
      productName: item.product_name,
      options: item.options,
      unitPrice: toFiniteNumber(item.unit_price, "상품 단가"),
      quantity: item.quantity,
      subtotal: toFiniteNumber(item.subtotal, "상품 소계"),
    })),
    address: response.address,
    payment: response.payment,
    shipping: response.shipping,
    statusHistory: response.status_history.map((history) => ({
      id: history.id,
      fromStatus: history.from_status,
      toStatus: history.to_status,
      changedBy: history.changed_by,
      createdAt: formatDateTime(history.created_at),
    })),
  };
}

export async function getAdminOrdersData(
  cookieHeader: string,
  query: AdminOrderListQuery = {},
): Promise<AdminOrdersData> {
  const { requestAdminOrdersOnServer } = await import(
    "../repositories/admin-orders.server.repository"
  );
  const response = await requestAdminOrdersOnServer(cookieHeader, query);

  return mapAdminOrdersResponse(response, query);
}

export async function getAdminOrderDetailData(
  cookieHeader: string,
  orderId: string,
): Promise<AdminOrderDetailData> {
  const { requestAdminOrderDetailOnServer } = await import(
    "../repositories/admin-orders.server.repository"
  );
  const response = await requestAdminOrderDetailOnServer(cookieHeader, orderId);

  return mapAdminOrderDetailResponse(response);
}
