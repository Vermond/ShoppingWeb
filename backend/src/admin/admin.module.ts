import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { AdminGuard } from './admin.guard';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardRepository } from './admin-dashboard.repository';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersRepository } from './admin-orders.repository';
import { AdminOrdersService } from './admin-orders.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({}), UsersModule],
  controllers: [AdminDashboardController, AdminOrdersController],
  providers: [
    AccessTokenGuard,
    AdminGuard,
    AdminDashboardRepository,
    AdminDashboardService,
    AdminOrdersRepository,
    AdminOrdersService,
  ],
})
export class AdminModule {}
