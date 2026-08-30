import Decimal from 'decimal.js';
import type {
  ProductImageRow,
  ProductStatus,
} from '../products/products.types';

export type AdminProductListRow = {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  representative_image_url: string | null;
  price: string;
  stock: number;
  max_order_quantity: number;
  sales_quantity: number;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type AdminProductDetailRow = {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  max_order_quantity: number;
  sales_quantity: number;
  status: string;
  created_at: Date;
  updated_at: Date;
  images: ProductImageRow[];
};

export type AdminProductCountRow = {
  total_count: number;
};

export type AdminProductStatusCountRow = {
  status: string;
  count: number;
};

export type AdminProductListRepositoryResult = {
  rows: AdminProductListRow[];
  totalCount: number;
  statusCounts: Record<ProductStatus, number>;
};

export type AdminProductPage = {
  products: AdminProductRecord[];
  totalCount: number;
  statusCounts: Record<ProductStatus, number>;
};

export type AdminProductRecord = Omit<
  AdminProductListRow,
  'price' | 'status'
> & {
  price: Decimal;
  status: ProductStatus;
};

export type AdminProductDetailRecord = Omit<
  AdminProductDetailRow,
  'price' | 'status' | 'images'
> & {
  price: Decimal;
  status: ProductStatus;
  images: ProductImageRow[];
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
    status: ProductStatus;
    created_at: string;
    updated_at: string;
  }>;
  total_count: number;
  status_counts: Record<ProductStatus, number>;
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
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  images: Array<{
    id: string;
    image_url: string;
    sort_order: number;
    created_at: string;
  }>;
};

export function toAdminProductRecord(
  row: AdminProductListRow,
): AdminProductRecord {
  return {
    ...row,
    status: parseProductStatus(row.status),
    price: new Decimal(row.price),
  };
}

export function toAdminProductDetailRecord(
  row: AdminProductDetailRow,
): AdminProductDetailRecord {
  return {
    ...row,
    status: parseProductStatus(row.status),
    price: new Decimal(row.price),
  };
}

export function serializeAdminProduct(
  product: AdminProductRecord,
): AdminProductListResponse['products'][number] {
  return {
    id: product.id,
    name: product.name,
    representative_image_url: product.representative_image_url,
    category_id: product.category_id,
    category_name: product.category_name,
    price: product.price.toFixed(2),
    stock: product.stock,
    max_order_quantity: product.max_order_quantity,
    sales_quantity: product.sales_quantity,
    status: product.status,
    created_at: product.created_at.toISOString(),
    updated_at: product.updated_at.toISOString(),
  };
}

export function serializeAdminProductDetail(
  product: AdminProductDetailRecord,
): AdminProductDetailResponse {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    representative_image_url: product.images[0]?.image_url ?? null,
    category_id: product.category_id,
    category_name: product.category_name,
    price: product.price.toFixed(2),
    stock: product.stock,
    max_order_quantity: product.max_order_quantity,
    sales_quantity: product.sales_quantity,
    status: product.status,
    created_at: product.created_at.toISOString(),
    updated_at: product.updated_at.toISOString(),
    images: product.images.map((image) => ({
      id: image.id,
      image_url: image.image_url,
      sort_order: image.sort_order,
      created_at: image.created_at.toISOString(),
    })),
  };
}

export function createEmptyProductStatusCounts(): Record<
  ProductStatus,
  number
> {
  return Object.fromEntries(
    ['active', 'inactive', 'draft', 'archived'].map((status) => [status, 0]),
  ) as Record<ProductStatus, number>;
}

function parseProductStatus(value: string): ProductStatus {
  if (!['active', 'inactive', 'draft', 'archived'].includes(value)) {
    throw new Error('상품 상태가 허용된 값이 아닙니다.');
  }

  return value as ProductStatus;
}
