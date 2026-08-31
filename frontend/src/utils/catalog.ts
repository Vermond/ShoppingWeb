import type { Product, ProductFilter } from "../types/catalog";

const productArts = new Set<Product["art"]>([
  "ceramic",
  "linen",
  "bag",
  "glow",
  "wood",
  "glass",
]);

export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const product = value as Record<string, unknown>;

  return (
    typeof product.id === "string" &&
    typeof product.name === "string" &&
    typeof product.category === "string" &&
    typeof product.price === "number" &&
    Number.isFinite(product.price) &&
    typeof product.stock === "number" &&
    Number.isInteger(product.stock) &&
    product.stock >= 0 &&
    typeof product.maxOrderQuantity === "number" &&
    Number.isInteger(product.maxOrderQuantity) &&
    product.maxOrderQuantity >= 0 &&
    (typeof product.tag === "string" || product.tag === undefined) &&
    typeof product.description === "string" &&
    (typeof product.imageUrl === "string" || product.imageUrl === null) &&
    typeof product.color === "string" &&
    typeof product.art === "string" &&
    productArts.has(product.art as Product["art"])
  );
}

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
