export type ProductCategory = string;
export type ProductFilter = "전체" | ProductCategory;

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  tag?: string;
  description: string;
  color: string;
  art: "ceramic" | "linen" | "bag" | "glow" | "wood" | "glass";
};
