import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { parseLoginInput } from '../users/users.input';
import type { UserRecord } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import {
  LoginBodyDto,
  UserEnvelopeResponseDto,
} from '../swagger/swagger.schemas';

@Controller('api/auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '사용자 로그인 검증' })
  @ApiBody({ type: LoginBodyDto })
  @ApiResponse({ status: 200, type: UserEnvelopeResponseDto })
  @ApiResponse({ status: 400, description: '입력값이 유효하지 않음' })
  @ApiResponse({
    status: 401,
    description: '이메일 또는 비밀번호가 올바르지 않음',
  })
  @ApiResponse({ status: 403, description: '미인증 또는 비활성 계정' })
  async login(@Body() body: unknown): Promise<{ user: UserRecord }> {
    const user = await this.usersService.login(parseLoginInput(body));

    return { user };
  }
}
