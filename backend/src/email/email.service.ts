import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EnvironmentVariables } from '../config/environment.validation';

type VerificationEmailInput = {
  email: string;
  name: string;
  token: string;
};

export type PasswordResetEmailInput = VerificationEmailInput;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend?: Resend;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) {}

  async sendVerificationEmail({
    email,
    name,
    token,
  }: VerificationEmailInput): Promise<void> {
    const verificationUrl = this.createFrontendActionUrl(
      '/auth/verify-email',
      token,
    );
    const fromEmail =
      this.configService.getOrThrow<string>('RESEND_FROM_EMAIL');
    const fromName = this.configService.get<string>('RESEND_FROM_NAME');
    const validityText = formatDuration(
      this.configService.getOrThrow<number>(
        'EMAIL_VERIFICATION_TOKEN_TTL_MINUTES',
      ),
    );
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
        <p>이 링크는 ${validityText} 동안 유효합니다.</p>
      `,
      text: [
        `${name}님, 안녕하세요.`,
        '아래 링크를 클릭하면 이메일 인증이 완료됩니다.',
        verificationUrl,
        `이 링크는 ${validityText} 동안 유효합니다.`,
      ].join('\n\n'),
    });

    if (error) {
      this.logger.error('Resend 이메일 발송에 실패했습니다.', error.message);
      throw new Error('인증 이메일 발송에 실패했습니다.');
    }
  }

  async sendPasswordResetEmail({
    email,
    name,
    token,
  }: PasswordResetEmailInput): Promise<void> {
    const resetUrl = this.createFrontendActionUrl(
      '/auth/reset-password',
      token,
    );
    const fromEmail =
      this.configService.getOrThrow<string>('RESEND_FROM_EMAIL');
    const fromName = this.configService.get<string>('RESEND_FROM_NAME');
    const validityText = formatDuration(
      this.configService.getOrThrow<number>('PASSWORD_RESET_TOKEN_TTL_MINUTES'),
    );
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    const safeName = escapeHtml(name);
    const safeResetUrl = escapeHtml(resetUrl);

    const { error } = await this.getResend().emails.send({
      from,
      to: [email],
      subject: '비밀번호 재설정을 진행해주세요',
      html: `
        <p>${safeName}님, 안녕하세요.</p>
        <p>아래 링크를 클릭하면 비밀번호를 재설정할 수 있습니다.</p>
        <p><a href="${safeResetUrl}">비밀번호 재설정하기</a></p>
        <p>이 링크는 ${validityText} 동안 유효합니다.</p>
        <p>본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
      `,
      text: [
        `${name}님, 안녕하세요.`,
        '아래 링크를 클릭하면 비밀번호를 재설정할 수 있습니다.',
        resetUrl,
        `이 링크는 ${validityText} 동안 유효합니다.`,
        '본인이 요청하지 않았다면 이 이메일을 무시해주세요.',
      ].join('\n\n'),
    });

    if (error) {
      this.logger.error(
        'Resend 비밀번호 재설정 이메일 발송에 실패했습니다.',
        error.message,
      );
      throw new Error('비밀번호 재설정 이메일 발송에 실패했습니다.');
    }
  }

  private getResend(): Resend {
    if (this.resend) {
      return this.resend;
    }

    const apiKey = this.configService.getOrThrow<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);

    return this.resend;
  }

  private createFrontendActionUrl(path: string, token: string): string {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const url = new URL(path, frontendUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('FRONTEND_URL은 http 또는 https URL이어야 합니다.');
    }

    url.searchParams.set('token', token);

    return url.toString();
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

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}시간`);
  }

  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes}분`);
  }

  return parts.join(' ');
}
