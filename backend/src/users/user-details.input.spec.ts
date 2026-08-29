import { BadRequestException } from '@nestjs/common';
import {
  parseCreateUserAddressInput,
  parseUpdateUserAddressInput,
  parseUserProfileInput,
} from './user-details.input';

describe('user details input parsers', () => {
  it('normalizes a required profile phone number', () => {
    expect(parseUserProfileInput({ phone_number: ' 010-1234-5678 ' })).toEqual({
      phone_number: '01012345678',
    });
  });

  it('parses a user address and defaults the default flag to false', () => {
    expect(
      parseCreateUserAddressInput({
        recipient_name: ' 홍길동 ',
        phone_number: '010-1234-5678',
        postal_code: '06236',
        address_line1: ' 서울특별시 강남구 테헤란로 1 ',
        address_line2: ' 101호 ',
      }),
    ).toEqual({
      recipient_name: '홍길동',
      phone_number: '01012345678',
      postal_code: '06236',
      address_line1: '서울특별시 강남구 테헤란로 1',
      address_line2: '101호',
      is_default: false,
    });
  });

  it('parses partial address updates and allows clearing details', () => {
    expect(
      parseUpdateUserAddressInput({
        phone_number: '010 9876 5432',
        address_line2: null,
        is_default: true,
      }),
    ).toEqual({
      phone_number: '01098765432',
      address_line2: null,
      is_default: true,
    });
  });

  it('rejects invalid, empty, and unsupported values', () => {
    expect(() => parseUserProfileInput({ phone_number: 'abc' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseCreateUserAddressInput({
        recipient_name: '홍길동',
        phone_number: '01012345678',
        postal_code: '06236',
        address_line1: '주소',
        unsupported: true,
      }),
    ).toThrow(BadRequestException);
    expect(() => parseUpdateUserAddressInput({})).toThrow(BadRequestException);
    expect(() => parseUpdateUserAddressInput({ is_default: 'true' })).toThrow(
      BadRequestException,
    );
  });
});
