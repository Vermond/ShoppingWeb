import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import {
  AdminProductCreateBodyDto,
  AdminProductDetailEnvelopeResponseDto,
  AdminProductListResponseDto,
  AdminProductStatusBodyDto,
  AdminProductStockBodyDto,
  AdminProductUpdateBodyDto,
  ApiErrorResponseDto,
} from '../swagger/swagger.schemas';
import { AdminGuard } from './admin.guard';
import {
  parseAdminProductCreateInput,
  parseAdminProductListQuery,
  parseAdminProductStatusInput,
  parseAdminProductStockInput,
  parseAdminProductUpdateInput,
} from './admin-products.input';
import { AdminProductsService } from './admin-products.service';
import {
  serializeAdminProduct,
  serializeAdminProductDetail,
  type AdminProductDetailResponse,
  type AdminProductListResponse,
} from './admin-products.types';

@Controller('api/admin/products')
@UseGuards(AccessTokenGuard, AdminGuard)
@ApiTags('admin')
@ApiCookieAuth('access_token')
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  @ApiOperation({ summary: '관리자 상품 목록 조회' })
  @ApiQuery({
    name: 'search',
    required: false,
    example: '머그',
    description: '상품명 부분 검색',
  })
  @ApiQuery({
    name: 'category_id',
    required: false,
    example: '1',
    description: '카테고리 ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'draft', 'archived'],
  })
  @ApiQuery({
    name: 'low_stock_threshold',
    required: false,
    type: Number,
    example: 10,
    description: '재고가 해당 값 이하인 상품만 조회',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: [
      'created_at_desc',
      'created_at_asc',
      'price_desc',
      'price_asc',
      'stock_asc',
      'stock_desc',
      'sales_desc',
      'sales_asc',
    ],
    example: 'created_at_desc',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({
    name: 'page_size',
    required: false,
    type: Number,
    example: 20,
    description: '페이지 크기(최대 100)',
  })
  @ApiOkResponse({ type: AdminProductListResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findAll(@Query() query: unknown): Promise<AdminProductListResponse> {
    const queryValue = parseAdminProductListQuery(query);
    const result = await this.adminProductsService.findPage(queryValue);
    const totalPages = Math.ceil(result.totalCount / queryValue.pageSize);

    return {
      products: result.products.map(serializeAdminProduct),
      total_count: result.totalCount,
      status_counts: result.statusCounts,
      pagination: {
        page: queryValue.page,
        page_size: queryValue.pageSize,
        total_count: result.totalCount,
        total_pages: totalPages,
        has_next: queryValue.page < totalPages,
        has_previous: queryValue.page > 1,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '관리자 상품 상세 조회' })
  @ApiParam({ name: 'id', format: 'uuid', description: '상품 ID' })
  @ApiOkResponse({ type: AdminProductDetailEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ product: AdminProductDetailResponse }> {
    return {
      product: serializeAdminProductDetail(
        await this.adminProductsService.findOne(id),
      ),
    };
  }

  @Post()
  @ApiOperation({ summary: '관리자 상품 등록' })
  @ApiBody({ type: AdminProductCreateBodyDto })
  @ApiCreatedResponse({ type: AdminProductDetailEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async create(
    @Body() body: unknown,
  ): Promise<{ product: AdminProductDetailResponse }> {
    return {
      product: serializeAdminProductDetail(
        await this.adminProductsService.create(
          parseAdminProductCreateInput(body),
        ),
      ),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: '관리자 상품 수정' })
  @ApiParam({ name: 'id', format: 'uuid', description: '상품 ID' })
  @ApiBody({ type: AdminProductUpdateBodyDto })
  @ApiOkResponse({ type: AdminProductDetailEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: unknown,
  ): Promise<{ product: AdminProductDetailResponse }> {
    return {
      product: serializeAdminProductDetail(
        await this.adminProductsService.update(
          id,
          parseAdminProductUpdateInput(body),
        ),
      ),
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '관리자 상품 상태 변경' })
  @ApiParam({ name: 'id', format: 'uuid', description: '상품 ID' })
  @ApiBody({ type: AdminProductStatusBodyDto })
  @ApiOkResponse({ type: AdminProductDetailEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: unknown,
  ): Promise<{ product: AdminProductDetailResponse }> {
    return {
      product: serializeAdminProductDetail(
        await this.adminProductsService.updateStatus(
          id,
          parseAdminProductStatusInput(body),
        ),
      ),
    };
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: '관리자 상품 재고 변경' })
  @ApiParam({ name: 'id', format: 'uuid', description: '상품 ID' })
  @ApiBody({ type: AdminProductStockBodyDto })
  @ApiOkResponse({ type: AdminProductDetailEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async updateStock(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: unknown,
  ): Promise<{ product: AdminProductDetailResponse }> {
    return {
      product: serializeAdminProductDetail(
        await this.adminProductsService.updateStock(
          id,
          parseAdminProductStockInput(body),
        ),
      ),
    };
  }
}
