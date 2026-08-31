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

export const orderStatuses = [
  "pending",
  "paid",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export type CreateOrderRequest = {
  addressId: string;
  deliveryRequest?: string | null;
};

export type OrderAmounts = {
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
};

export type OrderListItem = {
  id: string;
  userId: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
} & OrderAmounts;

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type OrderAddress = {
  orderId: string;
  recipientName: string;
  phoneNumber: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string | null;
  deliveryRequest: string | null;
  createdAt: string;
};

export type Order = OrderListItem & {
  items: OrderItem[];
  address: OrderAddress;
};
