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
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [DatabaseModule, EmailModule, JwtModule.register({})],
  controllers: [
    UserDetailsController,
    UsersController,
    EmailVerificationController,
    PasswordResetController,
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
    PasswordResetRepository,
    PasswordResetService,
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
