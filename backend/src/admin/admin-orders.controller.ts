import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  AdminOrderDetailEnvelopeResponseDto,
  AdminOrderListResponseDto,
  AdminOrderStatusUpdateBodyDto,
  ApiErrorResponseDto,
} from '../swagger/swagger.schemas';
import { AdminGuard } from './admin.guard';
import {
  parseAdminOrderListQuery,
  parseAdminOrderStatusInput,
} from './admin-orders.input';
import { AdminOrdersService } from './admin-orders.service';
import type {
  AdminOrderDetailResponse,
  AdminOrderListResponse,
} from './admin-orders.types';

@Controller('api/admin/orders')
@UseGuards(AccessTokenGuard, AdminGuard)
@ApiTags('admin')
@ApiCookieAuth('access_token')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  @ApiOperation({ summary: '관리자 주문 목록 조회' })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2026-08-01',
    description: '한국 시간 기준 조회 시작일. to와 함께 입력해야 합니다.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2026-08-30',
    description: '한국 시간 기준 조회 종료일(포함).',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'paid', 'shipped', 'completed', 'cancelled'],
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: '홍길동',
    description: '주문 ID, 고객명, 상품명 검색어',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, type: Number })
  @ApiQuery({
    name: 'page_size',
    required: false,
    example: 20,
    type: Number,
    description: '페이지 크기(최대 100)',
  })
  @ApiOkResponse({ type: AdminOrderListResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findAll(@Query() query: unknown): Promise<AdminOrderListResponse> {
    return this.adminOrdersService.findAll(parseAdminOrderListQuery(query));
  }

  @Get(':id')
  @ApiOperation({ summary: '관리자 주문 상세 조회' })
  @ApiParam({ name: 'id', format: 'uuid', description: '주문 ID' })
  @ApiOkResponse({ type: AdminOrderDetailEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ order: AdminOrderDetailResponse }> {
    return { order: await this.adminOrdersService.findOne(id) };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '관리자 주문 상태 변경' })
  @ApiParam({ name: 'id', format: 'uuid', description: '주문 ID' })
  @ApiBody({ type: AdminOrderStatusUpdateBodyDto })
  @ApiOkResponse({ type: AdminOrderDetailEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: unknown,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{ order: AdminOrderDetailResponse }> {
    return {
      order: await this.adminOrdersService.updateStatus(
        id,
        admin.id,
        parseAdminOrderStatusInput(body),
      ),
    };
  }
}
