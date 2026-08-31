import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CategoryRow } from './categories.types';

const FIND_CATEGORIES_QUERY = `
  SELECT c.id,
         c.name,
         COUNT(p.id)::int AS product_count,
         c.created_at,
         c.updated_at
  FROM catalog.categories AS c
  LEFT JOIN catalog.products AS p
    ON p.category_id = c.id
   AND p.status = 'active'
  GROUP BY c.id, c.name, c.created_at, c.updated_at
  ORDER BY c.created_at ASC, c.id ASC
`;

@Injectable()
export class CategoriesRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(): Promise<CategoryRow[]> {
    const result = await this.databaseService.query<CategoryRow>(
      FIND_CATEGORIES_QUERY,
    );

    return result.rows;
  }
}
