export type CheckoutItem = {
  productId: string;
  quantity: number;
  // The mock route accepts this until the real server calculates prices.
  price?: number;
};

export type CheckoutRequest = {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    detailAddress: string;
  };
  paymentMethod: "card" | "bank";
  items: CheckoutItem[];
};

export type OrderSummary = {
  id: string;
  status: "결제 완료" | "상품 준비중" | "배송중" | "배송 완료";
  createdAt: string;
  total: number;
  itemCount: number;
};
