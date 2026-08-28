import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  it('/health/live (GET)', () => {
    return request(baseUrl)
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/api/auth/login rate limits repeated requests', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(baseUrl).post('/api/auth/login').send({}).expect(400);
    }

    const response = await request(baseUrl).post('/api/auth/login').send({});

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('60');
    expect(response.body).toEqual({
      code: 'RATE_LIMIT_EXCEEDED',
      message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfterSeconds: 60,
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
