import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/environment.validation';

export type RateLimitRule = {
  limit: number;
  ttlMilliseconds: number;
};

export type RateLimitName =
  'login' | 'resend' | 'signup' | 'verify' | 'refresh';

export type RateLimitConfig = Record<RateLimitName, RateLimitRule>;

let registeredConfig: RateLimitConfig | undefined;

export function createRateLimitConfig(
  configService: ConfigService<EnvironmentVariables>,
): RateLimitConfig {
  return {
    login: createRule(configService, 'LOGIN'),
    resend: createRule(configService, 'RESEND'),
    signup: createRule(configService, 'SIGNUP'),
    verify: createRule(configService, 'VERIFY'),
    refresh: createRule(configService, 'REFRESH'),
  };
}

export function setRateLimitConfig(config: RateLimitConfig): void {
  registeredConfig = config;
}

export function getRateLimitConfig(): RateLimitConfig {
  if (!registeredConfig) {
    throw new Error('Rate Limit 설정이 초기화되지 않았습니다.');
  }

  return registeredConfig;
}

function createRule(
  configService: ConfigService<EnvironmentVariables>,
  suffix: Uppercase<RateLimitName>,
): RateLimitRule {
  const limitName =
    `AUTH_RATE_LIMIT_${suffix}_LIMIT` as keyof EnvironmentVariables;
  const ttlName =
    `AUTH_RATE_LIMIT_${suffix}_TTL_SECONDS` as keyof EnvironmentVariables;

  return {
    limit: configService.getOrThrow<number>(limitName),
    ttlMilliseconds: configService.getOrThrow<number>(ttlName) * 1_000,
  };
}
