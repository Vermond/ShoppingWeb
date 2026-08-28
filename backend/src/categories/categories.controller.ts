import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { serializeCategory, type CategoryResponse } from './categories.types';
import { CategoriesResponseDto } from '../swagger/swagger.schemas';

@Controller('api/categories')
@ApiTags('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: '카테고리 목록 조회' })
  @ApiOkResponse({ type: CategoriesResponseDto })
  async findAll(): Promise<{ categories: CategoryResponse[] }> {
    const categories = await this.categoriesService.findAll();

    return { categories: categories.map(serializeCategory) };
  }
}
