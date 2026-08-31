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
  CreateUserAddressBodyDto,
  DeleteUserAddressResponseDto,
  UpdateUserAddressBodyDto,
  UserAddressEnvelopeResponseDto,
  UserAddressesResponseDto,
} from '../swagger/swagger.schemas';
import {
  parseCreateUserAddressInput,
  parseUpdateUserAddressInput,
} from './user-details.input';
import { UserDetailsService } from './user-details.service';
import {
  serializeUserAddress,
  type UserAddressResponse,
} from './user-details.types';

@Controller('api/users/me')
@UseGuards(AccessTokenGuard)
@ApiTags('users')
@ApiCookieAuth('access_token')
export class UserDetailsController {
  constructor(private readonly service: UserDetailsService) {}

  @Get('addresses')
  @ApiOperation({ summary: '현재 사용자 배송지 목록 조회' })
  @ApiOkResponse({ type: UserAddressesResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findAddresses(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ addresses: UserAddressResponse[] }> {
    const addresses = await this.service.findAddresses(user.id);

    return { addresses: addresses.map(serializeUserAddress) };
  }

  @Post('addresses')
  @ApiOperation({ summary: '현재 사용자 배송지 추가' })
  @ApiBody({ type: CreateUserAddressBodyDto })
  @ApiCreatedResponse({ type: UserAddressEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async createAddress(
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ address: UserAddressResponse }> {
    const address = await this.service.createAddress(
      user.id,
      parseCreateUserAddressInput(body),
    );

    return { address: serializeUserAddress(address) };
  }

  @Patch('addresses/:addressId')
  @ApiOperation({ summary: '현재 사용자 배송지 수정' })
  @ApiParam({ name: 'addressId', format: 'uuid', description: '배송지 ID' })
  @ApiBody({ type: UpdateUserAddressBodyDto })
  @ApiOkResponse({ type: UserAddressEnvelopeResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async updateAddress(
    @Param('addressId', new ParseUUIDPipe({ version: '4' })) addressId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ address: UserAddressResponse }> {
    const address = await this.service.updateAddress(
      user.id,
      addressId,
      parseUpdateUserAddressInput(body),
    );

    return { address: serializeUserAddress(address) };
  }

  @Delete('addresses/:addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '현재 사용자 배송지 삭제' })
  @ApiParam({ name: 'addressId', format: 'uuid', description: '배송지 ID' })
  @ApiOkResponse({ type: DeleteUserAddressResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async deleteAddress(
    @Param('addressId', new ParseUUIDPipe({ version: '4' })) addressId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.service.deleteAddress(user.id, addressId);

    return { message: '배송지를 삭제했습니다.' };
  }
}
