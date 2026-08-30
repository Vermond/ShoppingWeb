import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { WishlistController } from './wishlist.controller';
import { WishlistRepository } from './wishlist.repository';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({}), UsersModule],
  controllers: [WishlistController],
  providers: [AccessTokenGuard, WishlistRepository, WishlistService],
})
export class WishlistModule {}
