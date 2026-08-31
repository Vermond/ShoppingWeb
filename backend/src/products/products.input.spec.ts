import { BadRequestException } from '@nestjs/common';
import { parseProductsQuery } from './products.input';

describe('products query parser', () => {
  it('uses the default page and limit', () => {
    expect(parseProductsQuery({})).toEqual({
      page: 1,
      limit: 20,
      categoryId: null,
      search: null,
      sort: 'created_at_desc',
    });
  });

  it('parses valid page and limit values', () => {
    expect(parseProductsQuery({ page: '3', limit: '50' })).toEqual({
      page: 3,
      limit: 50,
      categoryId: null,
      search: null,
      sort: 'created_at_desc',
    });
  });

  it('parses product filters and sort order', () => {
    expect(
      parseProductsQuery({
        category_id: '12',
        search: '  mug ',
        sort: 'price_asc',
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      categoryId: '12',
      search: 'mug',
      sort: 'price_asc',
    });
  });

  it('allows the maximum offset and rejects larger offsets', () => {
    expect(parseProductsQuery({ page: '1001', limit: '100' })).toEqual({
      page: 1001,
      limit: 100,
      categoryId: null,
      search: null,
      sort: 'created_at_desc',
    });
    expectBadRequest(() => parseProductsQuery({ page: '1002', limit: '100' }));
  });

  it('rejects invalid, oversized, and unsupported query values', () => {
    expectBadRequest(() => parseProductsQuery({ page: '0' }));
    expectBadRequest(() => parseProductsQuery({ limit: '0' }));
    expectBadRequest(() => parseProductsQuery({ page: '1.5' }));
    expectBadRequest(() => parseProductsQuery({ limit: '101' }));
    expectBadRequest(() => parseProductsQuery({ page: ['1', '2'] }));
    expectBadRequest(() => parseProductsQuery({ category_id: '0' }));
    expectBadRequest(() => parseProductsQuery({ sort: 'name_asc' }));
  });
});

function expectBadRequest(callback: () => unknown): void {
  expect(callback).toThrow(BadRequestException);
}
