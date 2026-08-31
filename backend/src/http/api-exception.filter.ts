import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

type ApiErrorResponse = {
  code: string;
  message: string;
  retryAfterSeconds?: number;
};

const DEFAULT_ERROR_CODES = new Map<number, string>([
  [HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR'],
  [HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'],
  [HttpStatus.FORBIDDEN, 'FORBIDDEN'],
  [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
  [HttpStatus.METHOD_NOT_ALLOWED, 'METHOD_NOT_ALLOWED'],
  [HttpStatus.CONFLICT, 'CONFLICT'],
  [HttpStatus.GONE, 'GONE'],
  [HttpStatus.UNPROCESSABLE_ENTITY, 'UNPROCESSABLE_ENTITY'],
  [HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED'],
  [HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_SERVER_ERROR'],
  [HttpStatus.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE'],
]);

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(this.normalizeHttpException(exception));
      return;
    }

    this.logger.error(
      '처리되지 않은 예외가 발생했습니다.',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류가 발생했습니다.',
    });
  }

  private normalizeHttpException(exception: HttpException): ApiErrorResponse {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return {
        code: this.getErrorCode(status),
        message: exceptionResponse,
      };
    }

    if (!isRecord(exceptionResponse)) {
      return {
        code: this.getErrorCode(status),
        message: '요청을 처리할 수 없습니다.',
      };
    }

    const response: ApiErrorResponse = {
      code: readString(exceptionResponse.code) ?? this.getErrorCode(status),
      message:
        readMessage(exceptionResponse.message) ?? '요청을 처리할 수 없습니다.',
    };
    const retryAfterSeconds = exceptionResponse.retryAfterSeconds;

    if (typeof retryAfterSeconds === 'number' && retryAfterSeconds >= 0) {
      response.retryAfterSeconds = retryAfterSeconds;
    }

    return response;
  }

  private getErrorCode(status: number): string {
    const code = DEFAULT_ERROR_CODES.get(status);

    return typeof code === 'string' ? code : `HTTP_ERROR_${status}`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  return value;
}

function readMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value.join(' ');
  }

  return undefined;
}
