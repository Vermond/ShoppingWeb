export type CheckoutItem = {
  productId: string;
  quantity: number;
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

export type MockOrder = {
  id: string;
  status: "결제 완료" | "상품 준비중" | "배송중" | "배송 완료";
  createdAt: string;
  total: number;
  itemCount: number;
};

export async function createOrder(payload: CheckoutRequest) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as MockOrder & { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "주문을 생성하지 못했어요.");
  }

  return result;
}

export async function fetchOrders() {
  const response = await fetch("/api/orders");
  const result = (await response.json()) as { orders?: MockOrder[]; error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "주문 내역을 불러오지 못했어요.");
  }

  return result.orders ?? [];
}
