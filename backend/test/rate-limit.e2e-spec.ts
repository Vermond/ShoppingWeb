import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AuthService } from './../src/auth/auth.service';
import {
  getRateLimitConfig,
  setRateLimitConfig,
  type RateLimitConfig,
} from './../src/rate-limit/rate-limit.config';

describe('Rate limits (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let originalRateLimitConfig: RateLimitConfig | undefined;

  beforeAll(async () => {
    const authService = {
      refresh: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('invalid refresh token')),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authService)
      .compile();

    originalRateLimitConfig = getRateLimitConfig();
    setRateLimitConfig({
      login: { limit: 2, ttlMilliseconds: 60_000 },
      resend: { limit: 2, ttlMilliseconds: 900_000 },
      signup: { limit: 2, ttlMilliseconds: 3_600_000 },
      verify: { limit: 2, ttlMilliseconds: 60_000 },
      refresh: { limit: 2, ttlMilliseconds: 60_000 },
    });

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  it('limits login requests', async () => {
    expect(getRateLimitConfig().login.limit).toBe(2);
    await expectRateLimit(baseUrl, '/api/auth/login', 2, 60, 400);
  });

  it('limits signup requests', async () => {
    await expectRateLimit(baseUrl, '/api/users', 2, 3_600, 400);
  });

  it('limits verification resend requests', async () => {
    await expectRateLimit(
      baseUrl,
      '/api/users/email-verification/resend',
      2,
      900,
      400,
    );
  });

  it('limits email verification requests', async () => {
    await expectRateLimit(
      baseUrl,
      '/api/users/email-verification/verify',
      2,
      60,
      400,
    );
  });

  it('limits refresh requests', async () => {
    await expectRateLimit(baseUrl, '/api/auth/refresh', 2, 60, 401);
  });

  afterAll(async () => {
    if (originalRateLimitConfig) {
      setRateLimitConfig(originalRateLimitConfig);
    }

    await app.close();
  });
});

async function expectRateLimit(
  baseUrl: string,
  path: string,
  limit: number,
  retryAfterSeconds: number,
  statusBeforeLimit: number,
): Promise<void> {
  let rateLimitedResponse: Response | undefined;
  const maxAttempts = limit + 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await request(baseUrl).post(path).send({});

      if (response.status === 429) {
        rateLimitedResponse = response;
        break;
      }

      expect(response.status).toBe(statusBeforeLimit);
    } catch (error) {
      if (!isConnectionReset(error)) {
        throw error;
      }
    }
  }

  expect(rateLimitedResponse).toBeDefined();
  expect(rateLimitedResponse?.headers['retry-after']).toBe(
    String(retryAfterSeconds),
  );
  expect(rateLimitedResponse?.body).toEqual({
    code: 'RATE_LIMIT_EXCEEDED',
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    retryAfterSeconds,
  });
}

function isConnectionReset(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ECONNRESET'
  );
}
