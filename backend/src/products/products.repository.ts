import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type ProductRecord = Record<string, unknown>;

const FIND_PRODUCTS_QUERY = `
  SELECT id, category_id, name, description, price, stock, status,
         created_at, updated_at
  FROM catalog.products
`;

@Injectable()
export class ProductsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(): Promise<ProductRecord[]> {
    const result =
      await this.databaseService.query<ProductRecord>(FIND_PRODUCTS_QUERY);

    return result.rows;
  }
}
