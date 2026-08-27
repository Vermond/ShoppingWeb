import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import type { CategoryRecord } from './categories.repository';
import { CategoriesResponseDto } from '../swagger/swagger.schemas';

@Controller('api/categories')
@ApiTags('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: '카테고리 목록 조회' })
  @ApiOkResponse({ type: CategoriesResponseDto })
  async findAll(): Promise<{ categories: CategoryRecord[] }> {
    const categories = await this.categoriesService.findAll();

    return { categories };
  }
}
