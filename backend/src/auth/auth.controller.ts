import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { parseLoginInput } from '../users/users.input';
import type { UserRecord } from '../users/users.repository';
import {
  LoginBodyDto,
  LogoutResponseDto,
  UserEnvelopeResponseDto,
} from '../swagger/swagger.schemas';
import { AccessTokenGuard } from './access-token.guard';
import { getAuthConfig } from './auth.config';
import { CurrentUser } from './auth.decorators';
import { AuthService } from './auth.service';
import { clearAuthCookies, readCookie, setAuthCookies } from './cookie.util';

@Controller('api/auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '사용자 로그인' })
  @ApiBody({ type: LoginBodyDto })
  @ApiResponse({
    status: 200,
    type: UserEnvelopeResponseDto,
    description: 'Access Token과 Refresh Token을 HttpOnly Cookie로 설정함',
  })
  @ApiResponse({ status: 400, description: '입력값이 유효하지 않음' })
  @ApiResponse({
    status: 401,
    description: '이메일 또는 비밀번호가 올바르지 않음',
  })
  @ApiResponse({ status: 403, description: '미인증 또는 비활성 계정' })
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: UserRecord }> {
    const result = await this.authService.login(parseLoginInput(body));
    setAuthCookies(
      response,
      getAuthConfig(),
      result.accessToken,
      result.refreshToken,
    );

    return { user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh Token으로 인증 토큰 재발급' })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({
    status: 200,
    type: UserEnvelopeResponseDto,
    description: '기존 Refresh Token을 폐기하고 새 토큰 Cookie를 설정함',
  })
  @ApiResponse({ status: 401, description: 'Refresh Token이 유효하지 않음' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: UserRecord }> {
    const config = getAuthConfig();
    const refreshToken = readCookie(request, config.refreshCookieName);
    const result = await this.authService.refresh(refreshToken ?? '');
    setAuthCookies(response, config, result.accessToken, result.refreshToken);

    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '현재 기기 로그아웃' })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({ status: 200, type: LogoutResponseDto })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutResponseDto> {
    const config = getAuthConfig();
    await this.authService.logout(
      readCookie(request, config.refreshCookieName),
    );
    clearAuthCookies(response, config);

    return { message: '로그아웃되었습니다.' };
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '현재 로그인 사용자 조회' })
  @ApiCookieAuth('access_token')
  @ApiResponse({ status: 200, type: UserEnvelopeResponseDto })
  @ApiResponse({
    status: 401,
    description: '로그인이 필요하거나 Access Token이 유효하지 않음',
  })
  getMe(@CurrentUser() user: UserRecord): { user: UserRecord } {
    return { user };
  }
}
