export type WishlistProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  maxOrderQuantity: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  imageUrl: string | null;
};

export type WishlistItem = {
  productId: string;
  createdAt: string;
  product: WishlistProduct;
};
