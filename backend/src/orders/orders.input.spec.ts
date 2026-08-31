import { BadRequestException } from '@nestjs/common';
import { parseCreateOrderInput } from './orders.input';

describe('order input', () => {
  it('parses an address and normalizes an optional delivery request', () => {
    expect(
      parseCreateOrderInput({
        address_id: '11111111-1111-4111-8111-111111111111',
        delivery_request: '  문 앞에 놓아주세요  ',
      }),
    ).toEqual({
      address_id: '11111111-1111-4111-8111-111111111111',
      delivery_request: '문 앞에 놓아주세요',
    });
  });

  it('allows an omitted delivery request', () => {
    expect(
      parseCreateOrderInput({
        address_id: '11111111-1111-4111-8111-111111111111',
      }),
    ).toEqual({
      address_id: '11111111-1111-4111-8111-111111111111',
      delivery_request: null,
    });
  });

  it('rejects invalid and unsupported values', () => {
    expect(() => parseCreateOrderInput({})).toThrow(BadRequestException);
    expect(() =>
      parseCreateOrderInput({
        address_id: 'not-a-uuid',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateOrderInput({
        address_id: '11111111-1111-4111-8111-111111111111',
        delivery_request: 'a'.repeat(501),
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseCreateOrderInput({
        address_id: '11111111-1111-4111-8111-111111111111',
        unsupported: true,
      }),
    ).toThrow(BadRequestException);
  });
});
