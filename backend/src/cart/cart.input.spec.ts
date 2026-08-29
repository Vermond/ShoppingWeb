import { BadRequestException } from '@nestjs/common';
import { parseAddCartItemInput, parseUpdateCartItemInput } from './cart.input';

describe('cart input', () => {
  it('parses an add item request and normalizes the product id', () => {
    expect(
      parseAddCartItemInput({
        product_id: '11111111-1111-4111-8111-111111111111'.toUpperCase(),
        quantity: 2,
      }),
    ).toEqual({
      product_id: '11111111-1111-4111-8111-111111111111',
      quantity: 2,
    });
  });

  it('parses a quantity update request', () => {
    expect(parseUpdateCartItemInput({ quantity: 3 })).toEqual({
      quantity: 3,
    });
  });

  it('rejects unsupported fields and invalid values', () => {
    expect(() =>
      parseAddCartItemInput({
        product_id: '11111111-1111-4111-8111-111111111111',
        quantity: 1,
        extra: true,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseAddCartItemInput({
        product_id: 'not-a-uuid',
        quantity: 1,
      }),
    ).toThrow(BadRequestException);
    expect(() => parseUpdateCartItemInput({ quantity: 0 })).toThrow(
      BadRequestException,
    );
    expect(() => parseUpdateCartItemInput({ quantity: '2' })).toThrow(
      BadRequestException,
    );
  });
});
