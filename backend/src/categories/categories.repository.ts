import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type CategoryRecord = Record<string, unknown> & {
  id: string | number;
  name: string;
  created_at: Date;
  updated_at: Date;
};

const FIND_CATEGORIES_QUERY = `
  SELECT id, name, created_at, updated_at
  FROM catalog.categories
  ORDER BY created_at ASC, id ASC
`;

@Injectable()
export class CategoriesRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(): Promise<CategoryRecord[]> {
    const result = await this.databaseService.query<CategoryRecord>(
      FIND_CATEGORIES_QUERY,
    );

    return result.rows;
  }
}
