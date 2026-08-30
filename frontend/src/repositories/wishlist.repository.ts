import {
  AuthRequestError,
  requestRefresh,
} from "./auth.repository.ts";
import type { WishlistItem, WishlistProduct } from "../types/wishlist";

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

function parseWishlistProduct(value: unknown): WishlistProduct | null {
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
  const createdAt = readString(value.created_at ?? value.createdAt);
  const updatedAt = readString(value.updated_at ?? value.updatedAt);

  if (
    !id ||
    !categoryId ||
    !name ||
    price === null ||
    stock === null ||
    maxOrderQuantity === null ||
    !status ||
    !createdAt ||
    !updatedAt
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
    createdAt,
    updatedAt,
    imageUrl: readString(value.image_url ?? value.imageUrl),
  };
}

function parseWishlistItem(value: unknown): WishlistItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const productId = readString(value.product_id ?? value.productId);
  const createdAt = readString(value.created_at ?? value.createdAt);
  const product = parseWishlistProduct(value.product);

  if (!productId || !createdAt || !product) {
    return null;
  }

  return {
    productId,
    createdAt,
    product,
  };
}

function parseWishlistItems(value: unknown): WishlistItem[] {
  const items = isRecord(value) ? value.items : null;

  if (!Array.isArray(items)) {
    throw new AuthRequestError("찜 목록 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  const parsedItems = items
    .map(parseWishlistItem)
    .filter((item): item is WishlistItem => item !== null);

  if (parsedItems.length !== items.length) {
    throw new AuthRequestError("찜 목록 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  return parsedItems;
}

function parseWishlistItemResponse(value: unknown): WishlistItem {
  const item = isRecord(value) ? parseWishlistItem(value.item) : null;

  if (!item) {
    throw new AuthRequestError("찜 목록 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  return item;
}

async function requestWishlistApi(
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
      getResponseMessage(result, "찜 목록 요청을 처리하지 못했어요."),
      {
        code: getResponseCode(result),
        status: response.status,
      },
    );
  }

  return result;
}

export async function requestWishlistItems(): Promise<WishlistItem[]> {
  const result = await requestWishlistApi("/api/wishlist/items", {
    method: "GET",
  });

  return parseWishlistItems(result);
}

export async function requestAddWishlistItem(
  productId: string,
): Promise<WishlistItem> {
  const result = await requestWishlistApi("/api/wishlist/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ product_id: productId }),
  });

  return parseWishlistItemResponse(result);
}

export async function requestRemoveWishlistItem(
  productId: string,
): Promise<void> {
  await requestWishlistApi(
    `/api/wishlist/items/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
    },
  );
}
