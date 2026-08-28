import { BadRequestException } from '@nestjs/common';
import {
  parseCreateUserInput,
  parseEmailVerificationInput,
  parseEmailVerificationResendInput,
  parseLoginInput,
  parseUpdateUserInput,
} from './users.input';

describe('users input parsers', () => {
  it('normalizes valid create input', () => {
    expect(
      parseCreateUserInput({
        email: '  User@Example.COM ',
        password: 'password123',
        name: '  Jane Doe  ',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: 'password123',
      name: 'Jane Doe',
    });
  });

  it('rejects non-object and unsupported request bodies', () => {
    expectBadRequest(() => parseCreateUserInput(null));
    expectBadRequest(() =>
      parseCreateUserInput({
        email: 'user@example.com',
        password: 'password123',
        name: 'Jane',
        role: 'admin',
      }),
    );
  });

  it('rejects invalid create fields', () => {
    expectBadRequest(() =>
      parseCreateUserInput({
        email: 'invalid-email',
        password: 'password123',
        name: 'Jane',
      }),
    );
    expectBadRequest(() =>
      parseCreateUserInput({
        email: 'user@example.com',
        password: 'short',
        name: 'Jane',
      }),
    );
    expectBadRequest(() =>
      parseCreateUserInput({
        email: 'user@example.com',
        password: 'password123',
        name: '   ',
      }),
    );
  });

  it('parses partial update input and rejects empty updates', () => {
    expect(
      parseUpdateUserInput({
        email: 'New@Example.COM',
        name: '  New Name ',
      }),
    ).toEqual({ email: 'new@example.com', name: 'New Name' });

    expectBadRequest(() => parseUpdateUserInput({}));
    expectBadRequest(() => parseUpdateUserInput({ status: 'active' }));
  });

  it('parses login input with a non-empty password', () => {
    expect(
      parseLoginInput({ email: 'USER@example.com', password: 'password123' }),
    ).toEqual({ email: 'user@example.com', password: 'password123' });

    expectBadRequest(() =>
      parseLoginInput({ email: 'user@example.com', password: '' }),
    );
  });

  it('validates email verification token input', () => {
    expect(parseEmailVerificationInput({ token: 'token-value' })).toEqual({
      token: 'token-value',
    });
    expectBadRequest(() => parseEmailVerificationInput({ token: '' }));
    expectBadRequest(() =>
      parseEmailVerificationInput({ token: 'a'.repeat(257) }),
    );
  });

  it('parses and validates verification resend email input', () => {
    expect(
      parseEmailVerificationResendInput({ email: 'USER@example.com' }),
    ).toEqual({ email: 'user@example.com' });
    expectBadRequest(() =>
      parseEmailVerificationResendInput({ email: 'invalid-email' }),
    );
  });
});

function expectBadRequest(callback: () => unknown): void {
  expect(callback).toThrow(BadRequestException);
}
