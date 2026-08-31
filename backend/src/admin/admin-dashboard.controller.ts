import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/access-token.guard';
import {
  AdminDashboardResponseDto,
  ApiErrorResponseDto,
} from '../swagger/swagger.schemas';
import { AdminGuard } from './admin.guard';
import { parseAdminDashboardQuery } from './admin-dashboard.input';
import { AdminDashboardService } from './admin-dashboard.service';
import type { AdminDashboardResponse } from './admin-dashboard.types';

@Controller('api/admin/dashboard')
@UseGuards(AccessTokenGuard, AdminGuard)
@ApiTags('admin')
@ApiCookieAuth('access_token')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: '관리자 메인 대시보드 조회' })
  @ApiQuery({
    name: 'from',
    required: false,
    example: '2026-08-01',
    description: '조회 시작일. from과 to를 함께 입력해야 합니다.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    example: '2026-08-30',
    description:
      '조회 종료일(포함). 미입력 시 한국 시간 기준 이번 달 1일부터 오늘까지 조회합니다.',
  })
  @ApiOkResponse({ type: AdminDashboardResponseDto })
  @ApiResponse({
    status: 400,
    type: ApiErrorResponseDto,
    description: '기간 형식 또는 범위가 올바르지 않음',
  })
  @ApiResponse({
    status: 401,
    type: ApiErrorResponseDto,
    description: '로그인이 필요하거나 Access Token이 유효하지 않음',
  })
  @ApiResponse({
    status: 403,
    type: ApiErrorResponseDto,
    description: '관리자 권한이 없음',
  })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async findDashboard(
    @Query() query: unknown,
  ): Promise<AdminDashboardResponse> {
    const period = parseAdminDashboardQuery(query);

    return this.adminDashboardService.findDashboard(period);
  }
}
