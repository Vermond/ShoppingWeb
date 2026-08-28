import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from './config/environment.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<EnvironmentVariables>);
  if (configService.getOrThrow<boolean>('SWAGGER_ENABLED')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ShoppingWeb Backend API')
      .setDescription('ShoppingWeb backend API documentation')
      .setVersion('1.0')
      .addCookieAuth(
        'access_token',
        { type: 'apiKey', in: 'cookie' },
        'access_token',
      )
      .addCookieAuth(
        'refresh_token',
        { type: 'apiKey', in: 'cookie' },
        'refresh_token',
      )
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('docs', app, swaggerDocument, {
      jsonDocumentUrl: 'docs-json',
    });
  }

  await app.listen(configService.getOrThrow<number>('PORT'));
}
void bootstrap();
