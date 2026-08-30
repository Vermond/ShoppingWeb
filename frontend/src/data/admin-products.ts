import type {
  AdminCategoryResponse,
  AdminProductDetailResponse,
  AdminProductListQuery,
  AdminProductListResponse,
  AdminProductStatus,
} from "../repositories/admin-products.server.repository";

export type { AdminProductStatus } from "../repositories/admin-products.server.repository";

export type AdminProductListItem = {
  id: string;
  name: string;
  representativeImageUrl: string | null;
  categoryId: string;
  categoryName: string;
  price: number;
  stock: number;
  maxOrderQuantity: number;
  salesQuantity: number;
  status: AdminProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductsData = {
  products: AdminProductListItem[];
  totalCount: number;
  lowStockCount: number;
  statusCounts: Record<AdminProductStatus, number>;
  pagination: AdminProductListResponse["pagination"];
  categories: AdminCategoryResponse[];
  query: AdminProductListQuery;
};

export type AdminProductDetailData = {
  id: string;
  name: string;
  description: string | null;
  representativeImageUrl: string | null;
  categoryId: string;
  categoryName: string;
  price: string;
  stock: number;
  maxOrderQuantity: number;
  salesQuantity: number;
  status: AdminProductStatus;
  createdAt: string;
  updatedAt: string;
  images: Array<{
    id: string;
    imageUrl: string;
    sortOrder: number;
    createdAt: string;
  }>;
};

function toFiniteNumber(value: string | number, fieldName: string): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`관리자 상품의 ${fieldName} 값을 표시할 수 없습니다.`);
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

function mapProductListItem(
  product: AdminProductListResponse["products"][number],
): AdminProductListItem {
  return {
    id: product.id,
    name: product.name,
    representativeImageUrl: product.representative_image_url,
    categoryId: product.category_id,
    categoryName: product.category_name,
    price: toFiniteNumber(product.price, "판매가"),
    stock: product.stock,
    maxOrderQuantity: product.max_order_quantity,
    salesQuantity: product.sales_quantity,
    status: product.status,
    createdAt: formatDateTime(product.created_at),
    updatedAt: formatDateTime(product.updated_at),
  };
}

export function mapAdminProductsResponse(
  response: AdminProductListResponse,
  categories: AdminCategoryResponse[],
  lowStockCount: number,
  query: AdminProductListQuery = {},
): AdminProductsData {
  return {
    products: response.products.map(mapProductListItem),
    totalCount: response.total_count,
    lowStockCount,
    statusCounts: response.status_counts,
    pagination: response.pagination,
    categories,
    query,
  };
}

export function mapAdminProductDetailResponse(
  response: AdminProductDetailResponse,
): AdminProductDetailData {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    representativeImageUrl: response.representative_image_url,
    categoryId: response.category_id,
    categoryName: response.category_name,
    price: response.price,
    stock: response.stock,
    maxOrderQuantity: response.max_order_quantity,
    salesQuantity: response.sales_quantity,
    status: response.status,
    createdAt: formatDateTime(response.created_at),
    updatedAt: formatDateTime(response.updated_at),
    images: response.images
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
      .map((image) => ({
        id: image.id,
        imageUrl: image.image_url,
        sortOrder: image.sort_order,
        createdAt: formatDateTime(image.created_at),
      })),
  };
}

export async function getAdminProductsData(
  cookieHeader: string,
  query: AdminProductListQuery = {},
): Promise<AdminProductsData> {
  const {
    requestAdminCategoriesOnServer,
    requestAdminProductsOnServer,
  } = await import("../repositories/admin-products.server.repository");

  const lowStockQuery: AdminProductListQuery = {
    ...query,
    lowStockThreshold: 10,
    page: 1,
    pageSize: 1,
  };

  const [response, categories, lowStockResponse] = await Promise.all([
    requestAdminProductsOnServer(cookieHeader, query),
    requestAdminCategoriesOnServer(cookieHeader),
    requestAdminProductsOnServer(cookieHeader, lowStockQuery),
  ]);

  return mapAdminProductsResponse(
    response,
    categories,
    lowStockResponse.total_count,
    query,
  );
}

export async function getAdminProductDetailData(
  cookieHeader: string,
  productId: string,
): Promise<AdminProductDetailData> {
  const { requestAdminProductDetailOnServer } = await import(
    "../repositories/admin-products.server.repository"
  );
  const response = await requestAdminProductDetailOnServer(
    cookieHeader,
    productId,
  );

  return mapAdminProductDetailResponse(response);
}

