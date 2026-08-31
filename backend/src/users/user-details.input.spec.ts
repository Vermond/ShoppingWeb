import { BadRequestException } from '@nestjs/common';
import {
  parseCreateUserAddressInput,
  parseUpdateUserAddressInput,
} from './user-details.input';

describe('user address input parsers', () => {
  it('normalizes a phone number and parses an address', () => {
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

  it('parses partial updates and allows clearing the detail address', () => {
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
    expect(() =>
      parseCreateUserAddressInput({
        recipient_name: '홍길동',
        phone_number: 'abc',
        postal_code: '06236',
        address_line1: '주소',
      }),
    ).toThrow(BadRequestException);
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
