import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  it('normalizes string exception responses to the common error format', () => {
    const { filter, response, json } = createFilter();

    filter.catch(
      new BadRequestException('입력값이 올바르지 않습니다.'),
      response.host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      code: 'VALIDATION_ERROR',
      message: '입력값이 올바르지 않습니다.',
    });
  });

  it('preserves domain error codes and supported metadata only', () => {
    const { filter, response, json } = createFilter();

    filter.catch(
      new HttpException(
        {
          code: 'EMAIL_NOT_VERIFIED',
          message: '이메일 인증이 필요합니다.',
          retryAfterSeconds: 60,
          internalDetail: 'must not be exposed',
        },
        HttpStatus.FORBIDDEN,
      ),
      response.host,
    );

    expect(json).toHaveBeenCalledWith({
      code: 'EMAIL_NOT_VERIFIED',
      message: '이메일 인증이 필요합니다.',
      retryAfterSeconds: 60,
    });
  });

  it('flattens validation message arrays', () => {
    const { filter, response, json } = createFilter();

    filter.catch(
      new BadRequestException(['email is required', 'name is required']),
      response.host,
    );

    expect(json).toHaveBeenCalledWith({
      code: 'VALIDATION_ERROR',
      message: 'email is required name is required',
    });
  });

  it('hides unexpected exception details', () => {
    const { filter, response, json } = createFilter();

    filter.catch(new Error('database password'), response.host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(json).toHaveBeenCalledWith({
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류가 발생했습니다.',
    });
  });
});

function createFilter() {
  const json = jest.fn();
  const response = {
    status: jest.fn().mockReturnValue({ json }),
  } as unknown as Response;
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return {
    filter: new ApiExceptionFilter(),
    response: { ...response, host },
    json,
  };
}
