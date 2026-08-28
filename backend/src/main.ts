import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from './config/environment.validation';
import { setupSwagger } from './swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvironmentVariables>);
  setupSwagger(app, configService.getOrThrow<boolean>('SWAGGER_ENABLED'));

  await app.listen(configService.getOrThrow<number>('PORT'));
}
void bootstrap();
