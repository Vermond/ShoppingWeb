import { BadRequestException } from '@nestjs/common';
import { parseAddWishlistItemInput } from './wishlist.input';

describe('wishlist input parser', () => {
  it('normalizes a valid product id', () => {
    expect(
      parseAddWishlistItemInput({
        product_id: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',
      }),
    ).toEqual({
      product_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
  });

  it('rejects unsupported fields and invalid product ids', () => {
    expect(() =>
      parseAddWishlistItemInput({
        product_id: '11111111-1111-4111-8111-111111111111',
        user_id: 'user-1',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      parseAddWishlistItemInput({ product_id: 'not-a-uuid' }),
    ).toThrow(BadRequestException);
  });
});
