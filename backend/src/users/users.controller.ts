import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { parseCreateUserInput, parseUpdateUserInput } from './users.input';
import { UsersService } from './users.service';
import type { UserRecord } from './users.repository';
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
  @ApiOperation({ summary: '사용자 정보 수정' })
  @ApiParam({ name: 'id', format: 'uuid', description: '사용자 ID' })
  @ApiBody({ type: UpdateUserBodyDto })
  @ApiResponse({ status: 200, type: UserEnvelopeResponseDto })
  @ApiResponse({ status: 400, description: '입력값이 유효하지 않음' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  @ApiResponse({ status: 409, description: '이미 사용 중인 이메일' })
  @ApiResponse({ status: 503, description: '인증 메일 발송 실패' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: unknown,
  ): Promise<{ user: UserRecord }> {
    const user = await this.usersService.update(id, parseUpdateUserInput(body));

    return { user };
  }

  @Delete(':id')
  @ApiOperation({ summary: '사용자 탈퇴 처리' })
  @ApiParam({ name: 'id', format: 'uuid', description: '사용자 ID' })
  @ApiResponse({ status: 200, type: UserEnvelopeResponseDto })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async withdraw(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ user: UserRecord }> {
    const user = await this.usersService.withdraw(id);

    return { user };
  }
}
