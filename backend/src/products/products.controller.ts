import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { parseProductsQuery } from './products.input';
import { serializeProduct, type ProductPageResponse } from './products.types';
import { ProductsResponseDto } from '../swagger/swagger.schemas';

@Controller('api/products')
@ApiTags('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: '상품 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: '페이지당 상품 수 (최대 100)',
  })
  @ApiOkResponse({ type: ProductsResponseDto })
  async findAll(@Query() query: unknown): Promise<ProductPageResponse> {
    const result = await this.productsService.findPage(
      parseProductsQuery(query),
    );

    return {
      products: result.products.map(serializeProduct),
      pagination: result.pagination,
    };
  }
}
