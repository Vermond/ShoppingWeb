import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { EnvironmentVariables } from '../config/environment.validation';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { getRateLimitConfig } from '../rate-limit/rate-limit.config';
import {
  ApiErrorResponseDto,
  PasswordResetConfirmBodyDto,
  PasswordResetRequestBodyDto,
  PasswordResetResponseDto,
} from '../swagger/swagger.schemas';
import { clearAuthCookies } from '../auth/cookie.util';
import { getAuthConfig } from '../auth/auth.config';
import {
  parsePasswordResetConfirmInput,
  parsePasswordResetRequestInput,
} from './password-reset.input';
import { PasswordResetService } from './password-reset.service';

@Controller('api/auth/password-reset')
@ApiTags('password-reset')
export class PasswordResetController {
  constructor(
    private readonly passwordResetService: PasswordResetService,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  @Post('request')
  @UseGuards(RateLimitGuard)
  @Throttle({
    default: {
      limit: () => getRateLimitConfig().passwordReset.limit,
      ttl: () => getRateLimitConfig().passwordReset.ttlMilliseconds,
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정 이메일 요청' })
  @ApiBody({ type: PasswordResetRequestBodyDto })
  @ApiOkResponse({ type: PasswordResetResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 429, type: ApiErrorResponseDto })
  @ApiResponse({ status: 503, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async request(@Body() body: unknown): Promise<PasswordResetResponseDto> {
    await this.passwordResetService.request(
      parsePasswordResetRequestInput(body).email,
    );

    return {
      message: '입력한 이메일로 비밀번호 재설정 안내를 전송했습니다.',
    };
  }

  @Post('confirm')
  @UseGuards(RateLimitGuard)
  @Throttle({
    default: {
      limit: () => getRateLimitConfig().passwordReset.limit,
      ttl: () => getRateLimitConfig().passwordReset.ttlMilliseconds,
    },
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정 확정' })
  @ApiBody({ type: PasswordResetConfirmBodyDto })
  @ApiOkResponse({ type: PasswordResetResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 410, type: ApiErrorResponseDto })
  @ApiResponse({ status: 429, type: ApiErrorResponseDto })
  @ApiResponse({ status: 500, type: ApiErrorResponseDto })
  async confirm(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PasswordResetResponseDto> {
    await this.passwordResetService.confirm(
      parsePasswordResetConfirmInput(body),
    );
    clearAuthCookies(response, getAuthConfig(this.configService));

    return { message: '비밀번호가 변경되었습니다. 다시 로그인해주세요.' };
  }
}
