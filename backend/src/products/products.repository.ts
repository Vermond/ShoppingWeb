import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { ProductsQuery } from './products.input';
import type {
  ProductDetailRow,
  ProductImageRow,
  ProductListRow,
  ProductPageRow,
  ProductRow,
} from './products.types';

const COUNT_PRODUCTS_QUERY = `
  SELECT COUNT(*)::int AS total_items
  FROM catalog.products AS p
  WHERE p.status = 'active'
    AND ($1::bigint IS NULL OR p.category_id = $1)
    AND (
      $2::text IS NULL
      OR p.name ILIKE '%' || $2 || '%'
      OR COALESCE(p.description, '') ILIKE '%' || $2 || '%'
    )
`;

const FIND_PRODUCTS_PAGE_QUERY_BASE = `
  SELECT p.id, p.category_id, p.name, p.description, p.price, p.stock,
         p.max_order_quantity, p.status, p.created_at, p.updated_at,
         representative.image_url AS representative_image_url
  FROM catalog.products AS p
  LEFT JOIN LATERAL (
    SELECT pi.image_url
    FROM catalog.product_images AS pi
    WHERE pi.product_id = p.id
    ORDER BY pi.sort_order ASC, pi.id ASC
    LIMIT 1
  ) AS representative ON TRUE
  WHERE p.status = 'active'
    AND ($1::bigint IS NULL OR p.category_id = $1)
    AND (
      $2::text IS NULL
      OR p.name ILIKE '%' || $2 || '%'
      OR COALESCE(p.description, '') ILIKE '%' || $2 || '%'
    )
`;

const FIND_PRODUCT_QUERY = `
  SELECT p.id, p.category_id, p.name, p.description, p.price, p.stock,
         p.max_order_quantity, p.status, p.created_at, p.updated_at,
         pi.id AS image_id, pi.image_url,
         pi.sort_order AS image_sort_order,
         pi.created_at AS image_created_at
  FROM catalog.products AS p
  LEFT JOIN catalog.product_images AS pi
    ON pi.product_id = p.id
  WHERE p.id = $1
    AND p.status = 'active'
  ORDER BY pi.sort_order ASC NULLS LAST, pi.id ASC NULLS LAST
`;

type ProductCountRow = {
  total_items: number;
};

type ProductDetailQueryRow = ProductRow & {
  image_id: string | null;
  image_url: string | null;
  image_sort_order: number | null;
  image_created_at: Date | null;
};

type ProductImageQueryRow = ProductDetailQueryRow & {
  image_id: string;
  image_url: string;
  image_sort_order: number;
  image_created_at: Date;
};

@Injectable()
export class ProductsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findPage(query: ProductsQuery): Promise<ProductPageRow> {
    const offset = (query.page - 1) * query.limit;
    const productsQuery = `${FIND_PRODUCTS_PAGE_QUERY_BASE}
  ORDER BY ${getSortSql(query.sort)}
  LIMIT $3 OFFSET $4
`;

    return this.databaseService.transaction(async (executor) => {
      const countResult =
        await executor.query<ProductCountRow>(COUNT_PRODUCTS_QUERY, [
          query.categoryId,
          query.search,
        ]);
      const productsResult = await executor.query<ProductListRow>(
        productsQuery,
        [query.categoryId, query.search, query.limit, offset],
      );

      return {
        rows: productsResult.rows,
        totalItems: countResult.rows[0]?.total_items ?? 0,
      };
    });
  }

  async findById(id: string): Promise<ProductDetailRow | null> {
    const result = await this.databaseService.query<ProductDetailQueryRow>(
      FIND_PRODUCT_QUERY,
      [id],
    );
    const firstRow = result.rows[0];

    if (!firstRow) {
      return null;
    }

    const product: ProductRow = {
      id: firstRow.id,
      category_id: firstRow.category_id,
      name: firstRow.name,
      description: firstRow.description,
      price: firstRow.price,
      stock: firstRow.stock,
      max_order_quantity: firstRow.max_order_quantity,
      status: firstRow.status,
      created_at: firstRow.created_at,
      updated_at: firstRow.updated_at,
    };

    const images: ProductImageRow[] = result.rows
      .filter(hasProductImage)
      .map((row) => ({
        id: row.image_id,
        product_id: product.id,
        image_url: row.image_url,
        sort_order: row.image_sort_order,
        created_at: row.image_created_at,
      }));

    return { ...product, images };
  }
}

function getSortSql(sort: ProductsQuery['sort']): string {
  switch (sort) {
    case 'price_asc':
      return 'p.price ASC, p.created_at DESC, p.id DESC';
    case 'price_desc':
      return 'p.price DESC, p.created_at DESC, p.id DESC';
    default:
      return 'p.created_at DESC, p.id DESC';
  }
}

function hasProductImage(
  row: ProductDetailQueryRow,
): row is ProductImageQueryRow {
  return (
    row.image_id !== null &&
    row.image_url !== null &&
    row.image_sort_order !== null &&
    row.image_created_at !== null
  );
}
