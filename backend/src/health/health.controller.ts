import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { DatabaseService } from '../database/database.service';

@Controller('health')
@ApiTags('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('live')
  @ApiOperation({ summary: '서버 생존 상태 확인' })
  @ApiResponse({ status: 200, description: '서버가 실행 중임' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: '서버 준비 상태 및 DB 연결 확인' })
  @ApiResponse({ status: 200, description: '서버와 DB를 사용할 수 있음' })
  @ApiResponse({ status: 503, description: 'DB를 사용할 수 없음' })
  async ready(
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: 'ok' | 'unavailable'; database: 'ok' | 'unavailable' }> {
    try {
      await this.databaseService.checkConnection();
      return { status: 'ok', database: 'ok' };
    } catch {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'unavailable', database: 'unavailable' };
    }
  }
}
