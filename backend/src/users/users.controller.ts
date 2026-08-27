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
import { parseCreateUserInput, parseUpdateUserInput } from './users.input';
import { UsersService } from './users.service';
import type { UserRecord } from './users.repository';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown): Promise<{ user: UserRecord }> {
    const user = await this.usersService.create(parseCreateUserInput(body));

    return { user };
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: unknown,
  ): Promise<{ user: UserRecord }> {
    const user = await this.usersService.update(id, parseUpdateUserInput(body));

    return { user };
  }

  @Delete(':id')
  async withdraw(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<{ user: UserRecord }> {
    const user = await this.usersService.withdraw(id);

    return { user };
  }
}
