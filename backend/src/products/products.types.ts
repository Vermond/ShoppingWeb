import Decimal from 'decimal.js';

export type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type ProductRecord = Omit<ProductRow, 'price'> & {
  price: Decimal;
};

export type ProductResponse = Omit<
  ProductRecord,
  'price' | 'created_at' | 'updated_at'
> & {
  price: string;
  created_at: string;
  updated_at: string;
};

export type ProductPageRow = {
  rows: ProductRow[];
  totalItems: number;
};

export type ProductPagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ProductPage = {
  products: ProductRecord[];
  pagination: ProductPagination;
};

export type ProductPageResponse = {
  products: ProductResponse[];
  pagination: ProductPagination;
};

export function toProductRecord(row: ProductRow): ProductRecord {
  return {
    ...row,
    price: new Decimal(row.price),
  };
}

export function serializeProduct(product: ProductRecord): ProductResponse {
  return {
    ...product,
    price: product.price.toFixed(2),
    created_at: product.created_at.toISOString(),
    updated_at: product.updated_at.toISOString(),
  };
}
