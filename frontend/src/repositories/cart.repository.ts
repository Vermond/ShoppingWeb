import {
  AuthRequestError,
  requestRefresh,
} from "./auth.repository.ts";

export type CartItemUnavailableReason =
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "MAX_ORDER_QUANTITY_EXCEEDED";

export type CartProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  maxOrderQuantity: number;
  status: string;
  imageUrl: string | null;
};

export type ServerCartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: CartProduct | null;
  available: boolean;
  unavailableReason: CartItemUnavailableReason | null;
  subtotal: number | null;
};

export type ServerCart = {
  id: string;
  items: ServerCartItem[];
  totalQuantity: number;
  totalPrice: number;
  updatedAt: string;
};

export type CartItemRequest = {
  productId: string;
  quantity: number;
};

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function readUnavailableReason(
  value: unknown,
): CartItemUnavailableReason | null {
  if (
    value === "PRODUCT_NOT_FOUND" ||
    value === "PRODUCT_UNAVAILABLE" ||
    value === "INSUFFICIENT_STOCK" ||
    value === "MAX_ORDER_QUANTITY_EXCEEDED"
  ) {
    return value;
  }

  return null;
}

function getResponseMessage(result: unknown, fallback: string) {
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

function getResponseCode(result: unknown) {
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

function parseCartProduct(value: unknown): CartProduct | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const categoryId = readString(value.category_id ?? value.categoryId);
  const name = readString(value.name);
  const price = readNumber(value.price);
  const stock = readNumber(value.stock);
  const maxOrderQuantity = readNumber(
    value.max_order_quantity ?? value.maxOrderQuantity,
  );
  const status = readString(value.status);

  if (
    !id ||
    !categoryId ||
    !name ||
    price === null ||
    stock === null ||
    maxOrderQuantity === null ||
    !status
  ) {
    return null;
  }

  return {
    id,
    categoryId,
    name,
    description: readString(value.description),
    price,
    stock: Math.max(0, Math.floor(stock)),
    maxOrderQuantity: Math.max(0, Math.floor(maxOrderQuantity)),
    status,
    imageUrl: readString(value.image_url ?? value.imageUrl),
  };
}

function parseCartItem(value: unknown): ServerCartItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const productId = readString(value.product_id ?? value.productId);
  const quantity = readNumber(value.quantity);
  const subtotalValue = value.subtotal;

  if (
    !id ||
    !productId ||
    quantity === null ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    typeof value.available !== "boolean"
  ) {
    return null;
  }

  const subtotal =
    subtotalValue === null || subtotalValue === undefined
      ? null
      : readNumber(subtotalValue);

  if (
    subtotalValue !== null &&
    subtotalValue !== undefined &&
    subtotal === null
  ) {
    return null;
  }

  return {
    id,
    productId,
    quantity,
    product: parseCartProduct(value.product),
    available: value.available,
    unavailableReason: readUnavailableReason(value.unavailable_reason),
    subtotal,
  };
}

function parseCartResponse(value: unknown): ServerCart {
  const envelope = isRecord(value) ? value.cart : null;

  if (!isRecord(envelope) || !Array.isArray(envelope.items)) {
    throw new AuthRequestError("장바구니 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  const id = readString(envelope.id);
  const totalQuantity = readNumber(envelope.total_quantity);
  const totalPrice = readNumber(envelope.total_price);
  const updatedAt = readString(envelope.updated_at);
  const items = envelope.items
    .map(parseCartItem)
    .filter((item): item is ServerCartItem => item !== null);

  if (
    !id ||
    totalQuantity === null ||
    !Number.isInteger(totalQuantity) ||
    totalQuantity < 0 ||
    totalPrice === null ||
    !updatedAt ||
    items.length !== envelope.items.length
  ) {
    throw new AuthRequestError("장바구니 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  return {
    id,
    items,
    totalQuantity,
    totalPrice,
    updatedAt,
  };
}

async function requestCartApi(
  path: string,
  init?: RequestInit,
): Promise<ServerCart> {
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
      getResponseMessage(result, "장바구니 요청을 처리하지 못했어요."),
      {
        code: getResponseCode(result),
        status: response.status,
      },
    );
  }

  return parseCartResponse(result);
}

export function requestCart(): Promise<ServerCart> {
  return requestCartApi("/api/cart", { method: "GET" });
}

export function requestAddCartItem(
  productId: string,
  quantity = 1,
): Promise<ServerCart> {
  return requestCartApi("/api/cart/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      quantity,
    }),
  });
}

export function requestMergeCart(
  items: readonly CartItemRequest[],
): Promise<ServerCart> {
  return requestCartApi("/api/cart/merge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
    }),
  });
}

export function requestUpdateCartItem(
  productId: string,
  quantity: number,
): Promise<ServerCart> {
  return requestCartApi(
    `/api/cart/items/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity }),
    },
  );
}

export function requestRemoveCartItem(productId: string): Promise<ServerCart> {
  return requestCartApi(
    `/api/cart/items/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
    },
  );
}
