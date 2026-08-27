import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from '../auth/auth.controller';
import { EmailVerificationController } from './email-verification.controller';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerificationService } from './email-verification.service';
import { PasswordService } from './password.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [UsersController, EmailVerificationController, AuthController],
  providers: [
    PasswordService,
    UsersRepository,
    UsersService,
    EmailVerificationRepository,
    EmailVerificationService,
  ],
})
export class UsersModule {}
