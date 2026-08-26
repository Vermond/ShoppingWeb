import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function loadLocalEnvironment(): void {
  if (existsSync('.env.local')) {
    loadEnvFile('.env.local');
  }
}

async function bootstrap() {
  loadLocalEnvironment();

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
