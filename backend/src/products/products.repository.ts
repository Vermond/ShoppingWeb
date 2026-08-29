import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type {
  ProductDetailRow,
  ProductImageRow,
  ProductPageRow,
  ProductRow,
} from './products.types';

const COUNT_PRODUCTS_QUERY = `
  SELECT COUNT(*)::int AS total_items
  FROM catalog.products
  WHERE status = 'active'
`;

const FIND_PRODUCTS_PAGE_QUERY = `
  SELECT id, category_id, name, description, price, stock, max_order_quantity,
         status,
         created_at, updated_at
  FROM catalog.products
  WHERE status = 'active'
  ORDER BY created_at DESC, id DESC
  LIMIT $1 OFFSET $2
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

  async findPage(limit: number, offset: number): Promise<ProductPageRow> {
    return this.databaseService.transaction(async (executor) => {
      const countResult =
        await executor.query<ProductCountRow>(COUNT_PRODUCTS_QUERY);
      const productsResult = await executor.query<ProductRow>(
        FIND_PRODUCTS_PAGE_QUERY,
        [limit, offset],
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
