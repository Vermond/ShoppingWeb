import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
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
  AddCartItemBodyDto,
  ApiErrorResponseDto,
  CartEnvelopeResponseDto,
  MergeCartBodyDto,
  UpdateCartItemBodyDto,
} from '../swagger/swagger.schemas';
import {
  parseAddCartItemInput,
  parseMergeCartInput,
  parseUpdateCartItemInput,
} from './cart.input';
import { CartService } from './cart.service';
import { serializeCart, type CartResponse } from './cart.types';

@Controller('api/cart')
@UseGuards(AccessTokenGuard)
@ApiTags('cart')
@ApiCookieAuth('access_token')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: '현재 사용자 장바구니 조회' })
  @ApiOkResponse({ type: CartEnvelopeResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ cart: CartResponse }> {
    const cart = await this.cartService.findByUserId(user.id);

    return { cart: serializeCart(cart) };
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '장바구니 상품 추가' })
  @ApiBody({ type: AddCartItemBodyDto })
  @ApiOkResponse({ type: CartEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async addItem(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ cart: CartResponse }> {
    const cart = await this.cartService.addItem(
      user.id,
      parseAddCartItemInput(body),
    );

    return { cart: serializeCart(cart) };
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비로그인 장바구니와 서버 장바구니 병합' })
  @ApiBody({ type: MergeCartBodyDto })
  @ApiOkResponse({ type: CartEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async mergeItems(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ cart: CartResponse }> {
    const cart = await this.cartService.mergeItems(
      user.id,
      parseMergeCartInput(body),
    );

    return { cart: serializeCart(cart) };
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: '장바구니 상품 수량 수정' })
  @ApiParam({ name: 'productId', format: 'uuid', description: '상품 ID' })
  @ApiBody({ type: UpdateCartItemBodyDto })
  @ApiOkResponse({ type: CartEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async updateItem(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ cart: CartResponse }> {
    const cart = await this.cartService.updateItem(
      user.id,
      productId,
      parseUpdateCartItemInput(body),
    );

    return { cart: serializeCart(cart) };
  }

  @Delete('items/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '장바구니 상품 삭제' })
  @ApiParam({ name: 'productId', format: 'uuid', description: '상품 ID' })
  @ApiOkResponse({ type: CartEnvelopeResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async removeItem(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ cart: CartResponse }> {
    const cart = await this.cartService.removeItem(user.id, productId);

    return { cart: serializeCart(cart) };
  }
}
