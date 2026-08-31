import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import {
  AdminSettingsResponseDto,
  AdminSettingsUpdateBodyDto,
  ApiErrorResponseDto,
} from '../swagger/swagger.schemas';
import { AdminGuard } from './admin.guard';
import { parseAdminSettingsUpdateInput } from './admin-settings.input';
import { AdminSettingsService } from './admin-settings.service';
import type { AdminSettingsResponse } from './admin-settings.types';

@Controller('api/admin/settings')
@UseGuards(AccessTokenGuard, AdminGuard)
@ApiTags('admin')
@ApiCookieAuth('access_token')
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get()
  @ApiOperation({ summary: '관리자 배송 설정 조회' })
  @ApiOkResponse({ type: AdminSettingsResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async find(): Promise<AdminSettingsResponse> {
    return this.adminSettingsService.find();
  }

  @Patch()
  @ApiOperation({ summary: '관리자 배송 설정 수정' })
  @ApiBody({ type: AdminSettingsUpdateBodyDto })
  @ApiOkResponse({ type: AdminSettingsResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async update(@Body() body: unknown): Promise<AdminSettingsResponse> {
    return this.adminSettingsService.update(
      parseAdminSettingsUpdateInput(body),
    );
  }
}
