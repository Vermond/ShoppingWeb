import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  parseEmailVerificationInput,
  parseEmailVerificationResendInput,
} from './users.input';
import { EmailVerificationService } from './email-verification.service';
import {
  EmailVerificationBodyDto,
  EmailVerificationResendBodyDto,
  EmailVerificationResponseDto,
} from '../swagger/swagger.schemas';

@Controller('api/users/email-verification')
@ApiTags('email-verification')
export class EmailVerificationController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '이메일 인증 토큰 확인' })
  @ApiBody({ type: EmailVerificationBodyDto })
  @ApiResponse({ status: 200, type: EmailVerificationResponseDto })
  @ApiResponse({ status: 400, description: '인증 토큰이 유효하지 않음' })
  @ApiResponse({ status: 410, description: '인증 토큰이 만료됨' })
  async verify(@Body() body: unknown) {
    const result = await this.emailVerificationService.verify(
      parseEmailVerificationInput(body).token,
    );

    if (result.status === 'already_verified') {
      return {
        code: 'EMAIL_ALREADY_VERIFIED',
        message: '이미 인증된 이메일입니다.',
      };
    }

    return {
      code: 'EMAIL_VERIFIED',
      message: '이메일 인증이 완료되었습니다.',
    };
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '이메일 인증 메일 재전송' })
  @ApiBody({ type: EmailVerificationResendBodyDto })
  @ApiResponse({ status: 200, type: EmailVerificationResponseDto })
  @ApiResponse({ status: 400, description: '입력 이메일이 유효하지 않음' })
  @ApiResponse({ status: 503, description: '인증 메일 발송 실패' })
  async resend(@Body() body: unknown) {
    const result = await this.emailVerificationService.resend(
      parseEmailVerificationResendInput(body).email,
    );

    if (result.status === 'already_verified') {
      return {
        code: 'EMAIL_ALREADY_VERIFIED',
        message: '이미 인증된 이메일입니다.',
      };
    }

    return {
      code: 'EMAIL_VERIFICATION_SENT',
      message: '인증 메일을 전송했습니다.',
    };
  }
}
