import type {
  CreateOrderRequest,
  Order,
  OrderAddress,
  OrderItem,
  OrderListItem,
  OrderStatus,
} from "../types/orders";
import {
  AuthRequestError,
  requestRefresh,
} from "./auth.repository.ts";

export type {
  CreateOrderRequest,
  Order,
  OrderAddress,
  OrderItem,
  OrderListItem,
  OrderStatus,
} from "../types/orders";

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNullableString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || null;
}

function readNumber(value: unknown): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function readPositiveInteger(value: unknown): number | null {
  const numberValue = readNumber(value);

  if (
    numberValue === null ||
    !Number.isInteger(numberValue) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}

function readOrderStatus(value: unknown): OrderStatus | null {
  if (
    value === "pending" ||
    value === "paid" ||
    value === "shipped" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }

  return null;
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

async function readResponse(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

async function requestWithAuthRetry(
  request: () => Promise<Response>,
): Promise<Response> {
  const response = await request();

  if (response.status !== 401) {
    return response;
  }

  try {
    await requestRefresh();
  } catch {
    return response;
  }

  return request();
}

async function requestOrderApi(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await requestWithAuthRetry(() =>
    fetch(path, {
      ...init,
      credentials: "include",
      cache: "no-store",
    }),
  );
  const result = await readResponse(response);

  if (!response.ok) {
    throw new AuthRequestError(
      getResponseMessage(result, "주문 요청을 처리하지 못했어요."),
      {
        code: getResponseCode(result),
        status: response.status,
      },
    );
  }

  return result;
}

function parseOrderListItem(value: unknown): OrderListItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const userId = readString(value.user_id);
  const status = readOrderStatus(value.status);
  const totalAmount = readNumber(value.total_amount);
  const createdAt = readString(value.created_at);
  const updatedAt = readString(value.updated_at);

  if (
    !id ||
    !userId ||
    !status ||
    totalAmount === null ||
    totalAmount < 0 ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    userId,
    status,
    totalAmount,
    createdAt,
    updatedAt,
  };
}

function parseOrderItem(value: unknown): OrderItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const orderId = readString(value.order_id);
  const productId = readString(value.product_id);
  const productName = readString(value.product_name);
  const unitPrice = readNumber(value.unit_price);
  const quantity = readPositiveInteger(value.quantity);
  const subtotal = readNumber(value.subtotal);

  if (
    !id ||
    !orderId ||
    !productId ||
    !productName ||
    unitPrice === null ||
    unitPrice < 0 ||
    quantity === null ||
    subtotal === null ||
    subtotal < 0
  ) {
    return null;
  }

  return {
    id,
    orderId,
    productId,
    productName,
    unitPrice,
    quantity,
    subtotal,
  };
}

function parseOrderAddress(value: unknown): OrderAddress | null {
  if (!isRecord(value)) {
    return null;
  }

  const orderId = readString(value.order_id);
  const recipientName = readString(value.recipient_name);
  const phoneNumber = readString(value.phone_number);
  const postalCode = readString(value.postal_code);
  const addressLine1 = readString(value.address_line1);
  const addressLine2 = readNullableString(value.address_line2);
  const deliveryRequest = readNullableString(value.delivery_request);
  const createdAt = readString(value.created_at);

  if (
    !orderId ||
    !recipientName ||
    !phoneNumber ||
    !postalCode ||
    !addressLine1 ||
    addressLine2 === undefined ||
    deliveryRequest === undefined ||
    !createdAt
  ) {
    return null;
  }

  return {
    orderId,
    recipientName,
    phoneNumber,
    postalCode,
    addressLine1,
    addressLine2,
    deliveryRequest,
    createdAt,
  };
}

function parseOrder(value: unknown): Order {
  const orderValue = isRecord(value) ? value.order : null;
  const summary = parseOrderListItem(orderValue);
  const itemsValue = isRecord(orderValue) ? orderValue.items : null;
  const addressValue = isRecord(orderValue) ? orderValue.address : null;

  if (!summary || !Array.isArray(itemsValue)) {
    throw new AuthRequestError("주문 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  const items = itemsValue.map(parseOrderItem);
  const address = parseOrderAddress(addressValue);

  if (items.some((item) => item === null) || !address) {
    throw new AuthRequestError("주문 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  const parsedItems = items.filter(
    (item): item is OrderItem => item !== null,
  );

  return {
    ...summary,
    items: parsedItems,
    address,
  };
}

export async function createOrder(
  payload: CreateOrderRequest,
): Promise<Order> {
  const result = await requestOrderApi("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address_id: payload.addressId,
      delivery_request: payload.deliveryRequest ?? null,
    }),
  });

  return parseOrder(result);
}

export async function fetchOrders(): Promise<OrderListItem[]> {
  const result = await requestOrderApi("/api/orders", {
    method: "GET",
  });
  const orders = isRecord(result) ? result.orders : null;

  if (!Array.isArray(orders)) {
    throw new AuthRequestError("주문 목록 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  const parsedOrders = orders.map(parseOrderListItem);

  if (parsedOrders.some((order) => order === null)) {
    throw new AuthRequestError("주문 목록 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  return parsedOrders.filter(
    (order): order is OrderListItem => order !== null,
  );
}

export async function fetchOrderById(orderId: string): Promise<Order> {
  const result = await requestOrderApi(
    `/api/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
    },
  );

  return parseOrder(result);
}

export async function cancelOrder(orderId: string): Promise<Order> {
  const result = await requestOrderApi(
    `/api/orders/${encodeURIComponent(orderId)}/cancel`,
    {
      method: "POST",
    },
  );

  return parseOrder(result);
}
