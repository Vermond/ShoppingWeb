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
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsRepository } from './admin-products.repository';
import { AdminProductsService } from './admin-products.service';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminCustomersRepository } from './admin-customers.repository';
import { AdminCustomersService } from './admin-customers.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({}), UsersModule],
  controllers: [
    AdminDashboardController,
    AdminOrdersController,
    AdminProductsController,
    AdminCustomersController,
  ],
  providers: [
    AccessTokenGuard,
    AdminGuard,
    AdminDashboardRepository,
    AdminDashboardService,
    AdminOrdersRepository,
    AdminOrdersService,
    AdminProductsRepository,
    AdminProductsService,
    AdminCustomersRepository,
    AdminCustomersService,
  ],
})
export class AdminModule {}
