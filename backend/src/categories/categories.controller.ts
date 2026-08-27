import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import type { CategoryRecord } from './categories.repository';

@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(): Promise<{ categories: CategoryRecord[] }> {
    const categories = await this.categoriesService.findAll();

    return { categories };
  }
}
