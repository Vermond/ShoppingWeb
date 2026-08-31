import { AuthRequestError } from "./auth.repository";

export type AdminProductStatus = "active" | "inactive" | "draft" | "archived";

export type AdminProductSort =
  | "created_at_desc"
  | "created_at_asc"
  | "price_desc"
  | "price_asc"
  | "stock_asc"
  | "stock_desc"
  | "sales_desc"
  | "sales_asc";

export type AdminProductListQuery = {
  search?: string;
  categoryId?: string;
  status?: AdminProductStatus;
  lowStockThreshold?: number;
  sort?: AdminProductSort;
  page?: number;
  pageSize?: number;
};

export type AdminProductListResponse = {
  products: Array<{
    id: string;
    name: string;
    representative_image_url: string | null;
    category_id: string;
    category_name: string;
    price: string;
    stock: number;
    max_order_quantity: number;
    sales_quantity: number;
    status: AdminProductStatus;
    created_at: string;
    updated_at: string;
  }>;
  total_count: number;
  status_counts: Record<AdminProductStatus, number>;
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
};

export type AdminProductDetailResponse = {
  id: string;
  name: string;
  description: string | null;
  representative_image_url: string | null;
  category_id: string;
  category_name: string;
  price: string;
  stock: number;
  max_order_quantity: number;
  sales_quantity: number;
  status: AdminProductStatus;
  created_at: string;
  updated_at: string;
  images: Array<{
    id: string;
    image_url: string;
    sort_order: number;
    created_at: string;
  }>;
};

export type AdminCategoryResponse = {
  id: string;
  name: string;
};

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function getResponseMessage(result: unknown, fallback: string): string {
  if (!isRecord(result)) {
    return fallback;
  }

  if (typeof result.message === "string") {
    return result.message;
  }

  if (Array.isArray(result.message)) {
    const messages = result.message.filter(
      (message): message is string => typeof message === "string",
    );

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  if (typeof result.error === "string") {
    return result.error;
  }

  return fallback;
}

function getResponseCode(result: unknown): string | undefined {
  return isRecord(result) && typeof result.code === "string"
    ? result.code
    : undefined;
}

function buildProductQuery(query: AdminProductListQuery): string {
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.categoryId) params.set("category_id", query.categoryId);
  if (query.status) params.set("status", query.status);
  if (query.lowStockThreshold !== undefined) {
    params.set("low_stock_threshold", String(query.lowStockThreshold));
  }
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("page_size", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function requestAdminProductApi(
  cookieHeader: string,
  path: string,
  fallbackMessage: string,
): Promise<unknown> {
  const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.replace(
    /\/$/,
    "",
  );

  if (!backendApiBaseUrl) {
    throw new AuthRequestError(
      "백엔드 API 주소가 설정되지 않아 상품 정보를 불러올 수 없습니다.",
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
    throw new AuthRequestError("상품 서버와 통신하지 못했습니다.", {
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

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`관리자 상품 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readNullableString(value: unknown, fieldName: string): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`관리자 상품 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`관리자 상품 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`관리자 상품 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readStatus(value: unknown, fieldName: string): AdminProductStatus {
  if (
    value !== "active" &&
    value !== "inactive" &&
    value !== "draft" &&
    value !== "archived"
  ) {
    throw new Error(`관리자 상품 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`관리자 상품 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readStatusCounts(
  value: unknown,
): Record<AdminProductStatus, number> {
  if (!isRecord(value)) {
    throw new Error("관리자 상품 응답의 status_counts 값이 올바르지 않습니다.");
  }

  return {
    active: readNumber(value.active, "status_counts.active"),
    inactive: readNumber(value.inactive, "status_counts.inactive"),
    draft: readNumber(value.draft, "status_counts.draft"),
    archived: readNumber(value.archived, "status_counts.archived"),
  };
}

function readPagination(value: unknown): AdminProductListResponse["pagination"] {
  if (!isRecord(value)) {
    throw new Error("관리자 상품 응답에 pagination 정보가 없습니다.");
  }

  return {
    page: readNumber(value.page, "pagination.page"),
    page_size: readNumber(value.page_size, "pagination.page_size"),
    total_count: readNumber(value.total_count, "pagination.total_count"),
    total_pages: readNumber(value.total_pages, "pagination.total_pages"),
    has_next: readBoolean(value.has_next, "pagination.has_next"),
    has_previous: readBoolean(value.has_previous, "pagination.has_previous"),
  };
}

function readProductListResponse(value: unknown): AdminProductListResponse {
  if (!isRecord(value)) {
    throw new Error("관리자 상품 목록 응답 형식이 올바르지 않습니다.");
  }

  const products = readArray(value.products, "products").map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`관리자 상품 응답의 products[${index}] 형식이 올바르지 않습니다.`);
    }

    return {
      id: readString(item.id, `products[${index}].id`),
      name: readString(item.name, `products[${index}].name`),
      representative_image_url: readNullableString(
        item.representative_image_url,
        `products[${index}].representative_image_url`,
      ),
      category_id: readString(item.category_id, `products[${index}].category_id`),
      category_name: readString(item.category_name, `products[${index}].category_name`),
      price: readString(item.price, `products[${index}].price`),
      stock: readNumber(item.stock, `products[${index}].stock`),
      max_order_quantity: readNumber(
        item.max_order_quantity,
        `products[${index}].max_order_quantity`,
      ),
      sales_quantity: readNumber(
        item.sales_quantity,
        `products[${index}].sales_quantity`,
      ),
      status: readStatus(item.status, `products[${index}].status`),
      created_at: readString(item.created_at, `products[${index}].created_at`),
      updated_at: readString(item.updated_at, `products[${index}].updated_at`),
    };
  });

  return {
    products,
    total_count: readNumber(value.total_count, "total_count"),
    status_counts: readStatusCounts(value.status_counts),
    pagination: readPagination(value.pagination),
  };
}

function readProductDetailResponse(
  value: unknown,
): AdminProductDetailResponse {
  const product = isRecord(value) && isRecord(value.product) ? value.product : null;

  if (!product) {
    throw new Error("관리자 상품 상세 응답 형식이 올바르지 않습니다.");
  }

  const images = readArray(product.images, "product.images").map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`관리자 상품 응답의 product.images[${index}] 형식이 올바르지 않습니다.`);
    }

    return {
      id: readString(item.id, `product.images[${index}].id`),
      image_url: readString(item.image_url, `product.images[${index}].image_url`),
      sort_order: readNumber(item.sort_order, `product.images[${index}].sort_order`),
      created_at: readString(item.created_at, `product.images[${index}].created_at`),
    };
  });

  return {
    id: readString(product.id, "product.id"),
    name: readString(product.name, "product.name"),
    description: readNullableString(product.description, "product.description"),
    representative_image_url: readNullableString(
      product.representative_image_url,
      "product.representative_image_url",
    ),
    category_id: readString(product.category_id, "product.category_id"),
    category_name: readString(product.category_name, "product.category_name"),
    price: readString(product.price, "product.price"),
    stock: readNumber(product.stock, "product.stock"),
    max_order_quantity: readNumber(
      product.max_order_quantity,
      "product.max_order_quantity",
    ),
    sales_quantity: readNumber(product.sales_quantity, "product.sales_quantity"),
    status: readStatus(product.status, "product.status"),
    created_at: readString(product.created_at, "product.created_at"),
    updated_at: readString(product.updated_at, "product.updated_at"),
    images,
  };
}

function readCategoriesResponse(value: unknown): AdminCategoryResponse[] {
  if (!isRecord(value)) {
    throw new Error("카테고리 응답 형식이 올바르지 않습니다.");
  }

  return readArray(value.categories, "categories").map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`카테고리 응답의 categories[${index}] 형식이 올바르지 않습니다.`);
    }

    return {
      id: readString(item.id, `categories[${index}].id`),
      name: readString(item.name, `categories[${index}].name`),
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
        : "관리자 상품 응답을 처리하지 못했습니다.",
      { status: 502 },
    );
  }
}

export async function requestAdminProductsOnServer(
  cookieHeader: string,
  query: AdminProductListQuery = {},
): Promise<AdminProductListResponse> {
  const result = await requestAdminProductApi(
    cookieHeader,
    `/api/admin/products${buildProductQuery(query)}`,
    "관리자 상품을 불러오지 못했습니다.",
  );

  return parseResponse(result, readProductListResponse);
}

export async function requestAdminProductDetailOnServer(
  cookieHeader: string,
  productId: string,
): Promise<AdminProductDetailResponse> {
  const result = await requestAdminProductApi(
    cookieHeader,
    `/api/admin/products/${encodeURIComponent(productId)}`,
    "관리자 상품 상세를 불러오지 못했습니다.",
  );

  return parseResponse(result, readProductDetailResponse);
}

export async function requestAdminCategoriesOnServer(
  cookieHeader = "",
): Promise<AdminCategoryResponse[]> {
  const result = await requestAdminProductApi(
    cookieHeader,
    "/api/categories",
    "카테고리를 불러오지 못했습니다.",
  );

  return parseResponse(result, readCategoriesResponse);
}
