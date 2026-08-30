import type { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EnvironmentVariables } from '../config/environment.validation';
import { EmailService } from './email.service';

jest.mock('resend', () => ({
  Resend: jest.fn(),
}));

describe('EmailService', () => {
  const resendConstructor = Resend as unknown as jest.Mock;
  const configValues: Record<string, string | number> = {
    RESEND_API_KEY: 're_test_key',
    RESEND_FROM_EMAIL: 'onboarding@resend.dev',
    RESEND_FROM_NAME: 'ShoppingWeb',
    FRONTEND_URL: 'http://localhost:3000',
    EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: 1_440,
    PASSWORD_RESET_TOKEN_TTL_MINUTES: 30,
  };
  const configService = {
    getOrThrow: jest.fn((name: string) => configValues[name]),
    get: jest.fn((name: string) => configValues[name]),
  } as unknown as ConfigService<EnvironmentVariables>;
  let send: jest.Mock;

  beforeEach(() => {
    resendConstructor.mockClear();
    send = jest.fn().mockResolvedValue({ error: null });
    resendConstructor.mockImplementation(() => ({ emails: { send } }));
  });

  it('sends a verification email with the configured frontend URL', async () => {
    const service = new EmailService(configService);

    await expect(
      service.sendVerificationEmail({
        email: 'user@example.com',
        name: '<User & Friend>',
        token: 'raw-token',
      }),
    ).resolves.toBeUndefined();

    expect(resendConstructor).toHaveBeenCalledWith('re_test_key');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'ShoppingWeb <onboarding@resend.dev>',
        to: ['user@example.com'],
        subject: '이메일 인증을 완료해주세요',
        html: expect.stringContaining('&lt;User &amp; Friend&gt;'),
        text: expect.stringContaining(
          'http://localhost:3000/auth/verify-email?token=raw-token',
        ),
      }),
    );
    expect(send.mock.calls[0]?.[0].html).toContain(
      '이 링크는 24시간 동안 유효합니다.',
    );
    expect(send.mock.calls[0]?.[0].text).toContain(
      '이 링크는 24시간 동안 유효합니다.',
    );
    expect(send.mock.calls[0]?.[0].html).toContain(
      'http://localhost:3000/auth/verify-email?token=raw-token',
    );
  });

  it('formats the configured validity period in the email', async () => {
    configValues.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = 90;
    const service = new EmailService(configService);

    await service.sendVerificationEmail({
      email: 'user@example.com',
      name: 'User',
      token: 'raw-token',
    });

    expect(send.mock.calls[0]?.[0].html).toContain(
      '이 링크는 1시간 30분 동안 유효합니다.',
    );
    expect(send.mock.calls[0]?.[0].text).toContain(
      '이 링크는 1시간 30분 동안 유효합니다.',
    );
    configValues.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = 1_440;
  });

  it('converts a Resend error response into an exception', async () => {
    send.mockResolvedValue({ error: { message: 'delivery failed' } });
    const service = new EmailService(configService);

    await expect(
      service.sendVerificationEmail({
        email: 'user@example.com',
        name: 'User',
        token: 'raw-token',
      }),
    ).rejects.toThrow('인증 이메일 발송에 실패했습니다.');
  });

  it('sends a password reset email with the configured frontend URL', async () => {
    const service = new EmailService(configService);

    await expect(
      service.sendPasswordResetEmail({
        email: 'user@example.com',
        name: '<User & Friend>',
        token: 'raw-reset-token',
      }),
    ).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'ShoppingWeb <onboarding@resend.dev>',
        to: ['user@example.com'],
        subject: '비밀번호 재설정을 진행해주세요',
        html: expect.stringContaining('&lt;User &amp; Friend&gt;'),
        text: expect.stringContaining(
          'http://localhost:3000/auth/reset-password?token=raw-reset-token',
        ),
      }),
    );
    expect(send.mock.calls[0]?.[0].html).toContain(
      '이 링크는 30분 동안 유효합니다.',
    );
    expect(send.mock.calls[0]?.[0].html).toContain(
      '본인이 요청하지 않았다면 이 이메일을 무시해주세요.',
    );
  });

  it('rejects a transport error and an invalid verification URL', async () => {
    send.mockRejectedValue(new Error('network failed'));
    const service = new EmailService(configService);

    await expect(
      service.sendVerificationEmail({
        email: 'user@example.com',
        name: 'User',
        token: 'raw-token',
      }),
    ).rejects.toThrow('network failed');

    configValues.FRONTEND_URL = 'ftp://shop.example.com';
    const invalidUrlService = new EmailService(configService);
    await expect(
      invalidUrlService.sendVerificationEmail({
        email: 'user@example.com',
        name: 'User',
        token: 'raw-token',
      }),
    ).rejects.toThrow('FRONTEND_URL은 http 또는 https URL이어야 합니다.');
    configValues.FRONTEND_URL = 'http://localhost:3000';
  });

  it('reuses the Resend client for subsequent sends', async () => {
    const service = new EmailService(configService);
    const input = {
      email: 'user@example.com',
      name: 'User',
      token: 'raw-token',
    };

    await service.sendVerificationEmail(input);
    await service.sendVerificationEmail(input);

    expect(resendConstructor).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
