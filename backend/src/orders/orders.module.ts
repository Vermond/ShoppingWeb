import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { MockPaymentService } from './mock-payment.service';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({}), UsersModule],
  controllers: [OrdersController],
  providers: [
    AccessTokenGuard,
    MockPaymentService,
    OrdersRepository,
    OrdersService,
  ],
})
export class OrdersModule {}
