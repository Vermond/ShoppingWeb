import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from '../email/email.module';
import { DatabaseModule } from '../database/database.module';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { RefreshTokenRepository } from '../auth/refresh-token.repository';
import { EmailVerificationController } from './email-verification.controller';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerificationService } from './email-verification.service';
import { PasswordService } from './password.service';
import { UserDetailsController } from './user-details.controller';
import { UserDetailsRepository } from './user-details.repository';
import { UserDetailsService } from './user-details.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule, EmailModule, JwtModule.register({})],
  controllers: [
    UserDetailsController,
    UsersController,
    EmailVerificationController,
  ],
  providers: [
    PasswordService,
    UsersRepository,
    UsersService,
    UserDetailsRepository,
    UserDetailsService,
    EmailVerificationRepository,
    EmailVerificationService,
    RefreshTokenRepository,
    AccessTokenGuard,
  ],
  exports: [
    PasswordService,
    UsersRepository,
    UsersService,
    RefreshTokenRepository,
    AccessTokenGuard,
  ],
})
export class UsersModule {}
