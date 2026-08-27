import type { CheckoutRequest, OrderSummary } from "../types/orders";

export type { CheckoutItem, CheckoutRequest, OrderSummary } from "../types/orders";

export async function createOrder(payload: CheckoutRequest) {
  const response = await fetch("/api/mock/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = (await response.json()) as OrderSummary & { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "주문을 생성하지 못했어요.");
  }

  return result;
}

export async function fetchOrders() {
  const response = await fetch("/api/mock/orders");
  const result = (await response.json()) as {
    orders?: OrderSummary[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(result.error ?? "주문 내역을 불러오지 못했어요.");
  }

  return result.orders ?? [];
}
