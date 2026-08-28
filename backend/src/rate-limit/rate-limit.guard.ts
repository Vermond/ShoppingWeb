import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected throwThrottlingException(
    _context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        retryAfterSeconds: throttlerLimitDetail.timeToBlockExpire,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
