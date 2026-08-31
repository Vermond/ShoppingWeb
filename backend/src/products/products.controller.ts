import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { parseProductsQuery } from './products.input';
import {
  serializeProductDetail,
  serializeProductList,
  type ProductDetailResponse,
  type ProductPageResponse,
} from './products.types';
import {
  ApiErrorResponseDto,
  ProductEnvelopeResponseDto,
  ProductsResponseDto,
} from '../swagger/swagger.schemas';

@Controller('api/products')
@ApiTags('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: '상품 목록 조회' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: '페이지 번호 (최대 offset 100,000)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: '페이지당 상품 수 (최대 100, offset과 함께 범위 제한)',
  })
  @ApiQuery({
    name: 'category_id',
    required: false,
    type: String,
    example: '1',
    description: '카테고리 ID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: '머그',
    description: '상품명 또는 설명 검색어',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['created_at_desc', 'price_asc', 'price_desc'],
    example: 'created_at_desc',
    description: '정렬 기준',
  })
  @ApiOkResponse({ type: ProductsResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findAll(@Query() query: unknown): Promise<ProductPageResponse> {
    const result = await this.productsService.findPage(
      parseProductsQuery(query),
    );

    return {
      products: result.products.map(serializeProductList),
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '상품 상세 조회' })
  @ApiParam({ name: 'id', format: 'uuid', description: '상품 ID' })
  @ApiOkResponse({ type: ProductEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ product: ProductDetailResponse }> {
    const product = await this.productsService.findById(id);

    return { product: serializeProductDetail(product) };
  }
}
