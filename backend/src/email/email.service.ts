import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

type VerificationEmailInput = {
  email: string;
  name: string;
  token: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend?: Resend;

  async sendVerificationEmail({
    email,
    name,
    token,
  }: VerificationEmailInput): Promise<void> {
    const verificationUrl = this.createVerificationUrl(token);
    const fromEmail = this.readRequiredEnvironmentVariable('RESEND_FROM_EMAIL');
    const fromName = process.env.RESEND_FROM_NAME?.trim();
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    const safeName = escapeHtml(name);
    const safeVerificationUrl = escapeHtml(verificationUrl);

    const { error } = await this.getResend().emails.send({
      from,
      to: [email],
      subject: '이메일 인증을 완료해주세요',
      html: `
        <p>${safeName}님, 안녕하세요.</p>
        <p>아래 링크를 클릭하면 이메일 인증이 완료됩니다.</p>
        <p><a href="${safeVerificationUrl}">이메일 인증하기</a></p>
        <p>이 링크는 24시간 동안 유효합니다.</p>
      `,
      text: [
        `${name}님, 안녕하세요.`,
        '아래 링크를 클릭하면 이메일 인증이 완료됩니다.',
        verificationUrl,
        '이 링크는 24시간 동안 유효합니다.',
      ].join('\n\n'),
    });

    if (error) {
      this.logger.error('Resend 이메일 발송에 실패했습니다.', error.message);
      throw new Error('인증 이메일 발송에 실패했습니다.');
    }
  }

  private getResend(): Resend {
    if (this.resend) {
      return this.resend;
    }

    const apiKey = this.readRequiredEnvironmentVariable('RESEND_API_KEY');
    this.resend = new Resend(apiKey);

    return this.resend;
  }

  private createVerificationUrl(token: string): string {
    const frontendUrl = this.readRequiredEnvironmentVariable('FRONTEND_URL');
    const url = new URL('/auth/verify-email', frontendUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('FRONTEND_URL은 http 또는 https URL이어야 합니다.');
    }

    url.searchParams.set('token', token);

    return url.toString();
  }

  private readRequiredEnvironmentVariable(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
      throw new Error(`${name} 환경변수가 설정되지 않았습니다.`);
    }

    return value;
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character] ?? character,
  );
}
