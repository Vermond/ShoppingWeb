import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PasswordService } from './password.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [PasswordService, UsersRepository, UsersService],
})
export class UsersModule {}
