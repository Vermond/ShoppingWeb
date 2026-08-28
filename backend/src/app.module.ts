import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { resolve } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { DatabaseModule } from './database/database.module';
import { ProductsModule } from './products/products.module';
import {
  createRateLimitConfig,
  setRateLimitConfig,
} from './rate-limit/rate-limit.config';
import { RateLimitGuard } from './rate-limit/rate-limit.guard';
import { UsersModule } from './users/users.module';
import {
  validateEnvironment,
  type EnvironmentVariables,
} from './config/environment.validation';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [
        resolve(__dirname, '..', '.env.local'),
        resolve(__dirname, '..', '.env'),
      ],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables>) => {
        const config = createRateLimitConfig(configService);
        setRateLimitConfig(config);

        return {
          throttlers: [
            {
              name: 'default',
              limit: config.login.limit,
              ttl: config.login.ttlMilliseconds,
            },
          ],
        };
      },
    }),
    DatabaseModule,
    ProductsModule,
    CategoriesModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [RateLimitGuard],
})
export class AppModule {}
