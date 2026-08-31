import {
  Body,
  Controller,
  Delete,
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
  AddWishlistItemBodyDto,
  ApiErrorResponseDto,
  DeleteWishlistItemResponseDto,
  WishlistItemEnvelopeResponseDto,
  WishlistItemsResponseDto,
} from '../swagger/swagger.schemas';
import { parseAddWishlistItemInput } from './wishlist.input';
import { WishlistService } from './wishlist.service';
import {
  serializeWishlistItem,
  type WishlistItemResponse,
} from './wishlist.types';

@Controller('api/wishlist')
@UseGuards(AccessTokenGuard)
@ApiTags('wishlist')
@ApiCookieAuth('access_token')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get('items')
  @ApiOperation({ summary: '현재 사용자 찜 목록 조회' })
  @ApiOkResponse({ type: WishlistItemsResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ items: WishlistItemResponse[] }> {
    const items = await this.wishlistService.findAllByUserId(user.id);

    return { items: items.map(serializeWishlistItem) };
  }

  @Post('items')
  @ApiOperation({ summary: '상품을 찜 목록에 추가' })
  @ApiBody({ type: AddWishlistItemBodyDto })
  @ApiCreatedResponse({ type: WishlistItemEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async addItem(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ item: WishlistItemResponse }> {
    const item = await this.wishlistService.addItem(
      user.id,
      parseAddWishlistItemInput(body),
    );

    return { item: serializeWishlistItem(item) };
  }

  @Delete('items/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '찜 목록에서 상품 삭제' })
  @ApiParam({ name: 'productId', format: 'uuid', description: '상품 ID' })
  @ApiOkResponse({ type: DeleteWishlistItemResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async removeItem(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.wishlistService.removeItem(user.id, productId);

    return { message: '찜 목록에서 삭제했습니다.' };
  }
}
