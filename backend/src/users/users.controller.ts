import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { parseCreateUserInput, parseUpdateUserInput } from './users.input';
import { UsersService } from './users.service';
import type { UserRecord } from './users.repository';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/auth.decorators';
import {
  CreateUserBodyDto,
  UpdateUserBodyDto,
  UserEnvelopeResponseDto,
} from '../swagger/swagger.schemas';

@Controller('api/users')
@ApiTags('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '신규 사용자 등록' })
  @ApiBody({ type: CreateUserBodyDto })
  @ApiCreatedResponse({ type: UserEnvelopeResponseDto })
  @ApiResponse({ status: 400, description: '입력값이 유효하지 않음' })
  @ApiResponse({ status: 409, description: '이미 사용 중인 이메일' })
  @ApiResponse({ status: 503, description: '인증 메일 발송 실패' })
  async create(@Body() body: unknown): Promise<{ user: UserRecord }> {
    const user = await this.usersService.create(parseCreateUserInput(body));

    return { user };
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '사용자 정보 수정' })
  @ApiCookieAuth('access_token')
  @ApiParam({ name: 'id', format: 'uuid', description: '사용자 ID' })
  @ApiBody({ type: UpdateUserBodyDto })
  @ApiResponse({ status: 200, type: UserEnvelopeResponseDto })
  @ApiResponse({ status: 400, description: '입력값이 유효하지 않음' })
  @ApiResponse({ status: 401, description: '로그인이 필요함' })
  @ApiResponse({
    status: 403,
    description: '본인 사용자 정보만 수정할 수 있음',
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  @ApiResponse({ status: 409, description: '이미 사용 중인 이메일' })
  @ApiResponse({ status: 503, description: '인증 메일 발송 실패' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: unknown,
    @CurrentUser() currentUser: UserRecord,
  ): Promise<{ user: UserRecord }> {
    this.assertSelf(id, currentUser);
    const user = await this.usersService.update(id, parseUpdateUserInput(body));

    return { user };
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: '사용자 탈퇴 처리' })
  @ApiCookieAuth('access_token')
  @ApiParam({ name: 'id', format: 'uuid', description: '사용자 ID' })
  @ApiResponse({ status: 200, type: UserEnvelopeResponseDto })
  @ApiResponse({ status: 401, description: '로그인이 필요함' })
  @ApiResponse({ status: 403, description: '본인 계정만 탈퇴할 수 있음' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async withdraw(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() currentUser: UserRecord,
  ): Promise<{ user: UserRecord }> {
    this.assertSelf(id, currentUser);
    const user = await this.usersService.withdraw(id);

    return { user };
  }

  private assertSelf(id: string, currentUser: UserRecord): void {
    if (id !== currentUser.id) {
      throw new ForbiddenException('본인 사용자 정보만 변경할 수 있습니다.');
    }
  }
}
