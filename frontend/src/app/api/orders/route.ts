import { products } from "@/data/products";
import type { CheckoutRequest, MockOrder } from "@/repositories/orders.repository";

export const dynamic = "force-dynamic";

const mockOrders: MockOrder[] = [
  {
    id: "MORROW-250615",
    status: "배송 완료",
    createdAt: "2025. 06. 15",
    total: 117000,
    itemCount: 2,
  },
  {
    id: "MORROW-250528",
    status: "상품 준비중",
    createdAt: "2025. 05. 28",
    total: 89000,
    itemCount: 1,
  },
];

function isCheckoutRequest(value: unknown): value is CheckoutRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<CheckoutRequest>;
  const customer = request.customer;

  return (
    request.paymentMethod === "card" || request.paymentMethod === "bank"
  ) && Boolean(
    customer &&
      typeof customer.name === "string" &&
      typeof customer.email === "string" &&
      typeof customer.phone === "string" &&
      typeof customer.address === "string" &&
      Array.isArray(request.items) &&
      request.items.length > 0,
  );
}

export async function GET() {
  return Response.json({ orders: mockOrders });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "주문 요청 형식이 올바르지 않아요." },
      { status: 400 },
    );
  }

  if (!isCheckoutRequest(body)) {
    return Response.json(
      { error: "배송 정보를 모두 입력해주세요." },
      { status: 400 },
    );
  }

  const itemCount = body.items.reduce((total, item) => total + item.quantity, 0);
  const total = body.items.reduce((sum, item) => {
    const product = products.find(({ id }) => id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity;
  }, 0);
  const order = {
    id: `MORROW-${Date.now().toString().slice(-8)}`,
    status: "결제 완료" as const,
    createdAt: new Date().toISOString().slice(0, 10).replaceAll("-", ". "),
    total,
    itemCount,
  };

  await new Promise((resolve) => setTimeout(resolve, 450));

  return Response.json(order, { status: 201 });
}
