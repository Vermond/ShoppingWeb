import { requestCurrentUserOnServer } from "@/repositories/auth.server.repository";
import { mockOrders } from "@/data/mock/orders";
import type { CheckoutRequest } from "@/types/orders";

export const dynamic = "force-dynamic";

async function hasAuthenticatedUser(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return false;
  }

  try {
    return Boolean(await requestCurrentUserOnServer(cookieHeader));
  } catch {
    return false;
  }
}

function isCheckoutRequest(value: unknown): value is CheckoutRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<CheckoutRequest>;
  const customer = request.customer;

  return (
    (request.paymentMethod === "card" || request.paymentMethod === "bank") &&
    Boolean(
      customer &&
        typeof customer.name === "string" &&
        typeof customer.email === "string" &&
        typeof customer.phone === "string" &&
        typeof customer.address === "string" &&
        Array.isArray(request.items) &&
        request.items.length > 0 &&
        request.items.every(
          (item) =>
            item &&
            typeof item.productId === "string" &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0,
        ),
    )
  );
}

export async function GET(request: Request) {
  if (!(await hasAuthenticatedUser(request))) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  return Response.json({ orders: mockOrders });
}

export async function POST(request: Request) {
  if (!(await hasAuthenticatedUser(request))) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

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
    const price =
      typeof item.price === "number" && Number.isFinite(item.price)
        ? item.price
        : 0;

    return sum + price * item.quantity;
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
