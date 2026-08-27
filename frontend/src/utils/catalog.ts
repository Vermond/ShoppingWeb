import type { Product, ProductFilter } from "../types/catalog";

export type SortOrder = "recommended" | "priceAsc" | "priceDesc";

export const sortLabels: Record<SortOrder, string> = {
  recommended: "추천순",
  priceAsc: "낮은 가격순",
  priceDesc: "높은 가격순",
};

export function filterAndSortProducts(
  products: Product[],
  activeFilter: ProductFilter,
  query: string,
  sortOrder: SortOrder,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeFilter === "전체" || product.category === activeFilter;
    const matchesQuery =
      !normalizedQuery ||
      `${product.name} ${product.description}`
        .toLowerCase()
        .includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });

  if (sortOrder === "priceAsc") {
    return filteredProducts.sort((a, b) => a.price - b.price);
  }

  if (sortOrder === "priceDesc") {
    return filteredProducts.sort((a, b) => b.price - a.price);
  }

  return filteredProducts;
}
