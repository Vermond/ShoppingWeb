import type { ProductsQuery } from './products.input';
import type { ProductPagination } from './products.types';

export function calculateProductPagination(
  query: ProductsQuery,
  totalItems: number,
): ProductPagination {
  const totalPages = Math.ceil(totalItems / query.limit);

  return {
    page: query.page,
    limit: query.limit,
    totalItems,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPreviousPage: query.page > 1 && totalPages > 0,
  };
}
