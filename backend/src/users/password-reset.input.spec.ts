import { BadRequestException } from '@nestjs/common';
import {
  parsePasswordResetConfirmInput,
  parsePasswordResetRequestInput,
} from './password-reset.input';

describe('password reset input parser', () => {
  it('normalizes a valid reset request email', () => {
    expect(
      parsePasswordResetRequestInput({ email: ' USER@EXAMPLE.COM ' }),
    ).toEqual({ email: 'user@example.com' });
  });

  it('parses a valid reset confirmation', () => {
    expect(
      parsePasswordResetConfirmInput({
        token: 'raw-token',
        new_password: 'password123',
      }),
    ).toEqual({ token: 'raw-token', new_password: 'password123' });
  });

  it('rejects unsupported fields and invalid values', () => {
    expect(() =>
      parsePasswordResetRequestInput({
        email: 'user@example.com',
        name: 'User',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      parsePasswordResetConfirmInput({
        token: 'raw-token',
        new_password: 'short',
      }),
    ).toThrow(BadRequestException);
  });
});
