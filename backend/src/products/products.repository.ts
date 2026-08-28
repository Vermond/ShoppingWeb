import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { ProductPageRow, ProductRow } from './products.types';

const COUNT_PRODUCTS_QUERY = `
  SELECT COUNT(*)::int AS total_items
  FROM catalog.products
`;

const FIND_PRODUCTS_PAGE_QUERY = `
  SELECT id, category_id, name, description, price, stock, status,
         created_at, updated_at
  FROM catalog.products
  ORDER BY created_at DESC, id DESC
  LIMIT $1 OFFSET $2
`;

type ProductCountRow = {
  total_items: number;
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
}
