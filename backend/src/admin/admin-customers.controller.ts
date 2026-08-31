import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import {
  AdminCustomerDetailEnvelopeResponseDto,
  AdminCustomerListResponseDto,
  ApiErrorResponseDto,
} from '../swagger/swagger.schemas';
import { AdminGuard } from './admin.guard';
import { parseAdminCustomerListQuery } from './admin-customers.input';
import { AdminCustomersService } from './admin-customers.service';
import {
  serializeAdminCustomer,
  type AdminCustomerDetailResponse,
  type AdminCustomerListResponse,
} from './admin-customers.types';

@Controller('api/admin/customers')
@UseGuards(AccessTokenGuard, AdminGuard)
@ApiTags('admin')
@ApiCookieAuth('access_token')
export class AdminCustomersController {
  constructor(private readonly adminCustomersService: AdminCustomersService) {}

  @Get()
  @ApiOperation({ summary: '관리자 고객 목록 조회' })
  @ApiQuery({
    name: 'search',
    required: false,
    example: '홍길동',
    description: '고객명, 이메일, 고객 ID 부분 검색',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'withdrawn'],
  })
  @ApiQuery({
    name: 'email_verified',
    required: false,
    enum: ['true', 'false'],
  })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2026-08-01',
    description: '가입일 조회 시작일. to와 함께 입력해야 합니다.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2026-08-30',
    description: '가입일 조회 종료일(포함).',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: [
      'created_at_desc',
      'created_at_asc',
      'order_count_desc',
      'total_spent_desc',
      'last_order_at_desc',
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
  @ApiOkResponse({ type: AdminCustomerListResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findAll(@Query() query: unknown): Promise<AdminCustomerListResponse> {
    const queryValue = parseAdminCustomerListQuery(query);
    const result = await this.adminCustomersService.findPage(queryValue);
    const totalPages = Math.ceil(result.totalCount / queryValue.pageSize);

    return {
      customers: result.customers.map(serializeAdminCustomer),
      total_count: result.totalCount,
      status_counts: result.statusCounts,
      summary: result.summary,
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
  @ApiOperation({ summary: '관리자 고객 상세 조회' })
  @ApiParam({ name: 'id', format: 'uuid', description: '고객 ID' })
  @ApiOkResponse({ type: AdminCustomerDetailEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ customer: AdminCustomerDetailResponse }> {
    return { customer: await this.adminCustomersService.findOne(id) };
  }
}
