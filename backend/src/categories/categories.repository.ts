import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CategoryRow } from './categories.types';

const FIND_CATEGORIES_QUERY = `
  SELECT id, name, created_at, updated_at
  FROM catalog.categories
  ORDER BY created_at ASC, id ASC
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
