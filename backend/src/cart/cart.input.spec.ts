import { BadRequestException } from '@nestjs/common';
import {
  MAX_CART_MERGE_ITEMS,
  parseAddCartItemInput,
  parseMergeCartInput,
  parseUpdateCartItemInput,
} from './cart.input';

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

  it('merges duplicate products in a batch request', () => {
    expect(
      parseMergeCartInput({
        items: [
          {
            product_id: '11111111-1111-4111-8111-111111111111',
            quantity: 2,
          },
          {
            product_id: '22222222-2222-4222-8222-222222222222',
            quantity: 1,
          },
          {
            product_id: '11111111-1111-4111-8111-111111111111',
            quantity: 3,
          },
        ],
      }),
    ).toEqual({
      items: [
        {
          product_id: '11111111-1111-4111-8111-111111111111',
          quantity: 5,
        },
        {
          product_id: '22222222-2222-4222-8222-222222222222',
          quantity: 1,
        },
      ],
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
    expect(() => parseMergeCartInput({ items: 'invalid' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseMergeCartInput({
        items: Array.from({ length: MAX_CART_MERGE_ITEMS + 1 }, () => ({
          product_id: '11111111-1111-4111-8111-111111111111',
          quantity: 1,
        })),
      }),
    ).toThrow(BadRequestException);
  });
});
