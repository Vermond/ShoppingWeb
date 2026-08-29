import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  ApiErrorResponseDto,
  CreateOrderBodyDto,
  OrderEnvelopeResponseDto,
  OrdersResponseDto,
} from '../swagger/swagger.schemas';
import { parseCreateOrderInput } from './orders.input';
import { OrdersService } from './orders.service';
import {
  serializeOrder,
  serializeOrderSummary,
  type OrderResponse,
  type OrderSummaryResponse,
} from './orders.types';

@Controller('api/orders')
@UseGuards(AccessTokenGuard)
@ApiTags('orders')
@ApiCookieAuth('access_token')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: '장바구니 상품으로 주문 생성' })
  @ApiBody({ type: CreateOrderBodyDto })
  @ApiCreatedResponse({ type: OrderEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ order: OrderResponse }> {
    const order = await this.ordersService.create(
      user.id,
      parseCreateOrderInput(body),
    );

    return { order: serializeOrder(order) };
  }

  @Get()
  @ApiOperation({ summary: '현재 사용자 주문 목록 조회' })
  @ApiOkResponse({ type: OrdersResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ orders: OrderSummaryResponse[] }> {
    const orders = await this.ordersService.findAll(user.id);

    return { orders: orders.map(serializeOrderSummary) };
  }

  @Get(':id')
  @ApiOperation({ summary: '현재 사용자 주문 상세 조회' })
  @ApiParam({ name: 'id', format: 'uuid', description: '주문 ID' })
  @ApiOkResponse({ type: OrderEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ order: OrderResponse }> {
    const order = await this.ordersService.findOne(user.id, id);

    return { order: serializeOrder(order) };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '현재 사용자 주문 취소' })
  @ApiParam({ name: 'id', format: 'uuid', description: '주문 ID' })
  @ApiOkResponse({ type: OrderEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ order: OrderResponse }> {
    const order = await this.ordersService.cancel(user.id, id);

    return { order: serializeOrder(order) };
  }
}
