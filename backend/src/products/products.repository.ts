import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { ProductRow } from './products.types';

const FIND_PRODUCTS_QUERY = `
  SELECT id, category_id, name, description, price, stock, status,
         created_at, updated_at
  FROM catalog.products
`;

@Injectable()
export class ProductsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(): Promise<ProductRow[]> {
    const result =
      await this.databaseService.query<ProductRow>(FIND_PRODUCTS_QUERY);

    return result.rows;
  }
}
