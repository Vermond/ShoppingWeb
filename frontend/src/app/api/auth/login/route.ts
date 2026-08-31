import type { LoginRequest } from "@/repositories/auth.repository";
import { proxyAuthRequest } from "../proxy";

export const dynamic = "force-dynamic";

function isEmailLoginRequest(value: unknown): value is Extract<LoginRequest, { method: "email" }> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<Extract<LoginRequest, { method: "email" }>>;

  return (
    request.method === "email" &&
    typeof request.email === "string" &&
    request.email.length > 0 &&
    typeof request.password === "string" &&
    request.password.length > 0
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "로그인 요청 형식이 올바르지 않아요." },
      { status: 400 },
    );
  }

  if (!isEmailLoginRequest(body)) {
    return Response.json(
      { error: "로그인 정보를 확인해주세요." },
      { status: 400 },
    );
  }

  return proxyAuthRequest(
    request,
    "/api/auth/login",
    JSON.stringify({
      email: body.email,
      password: body.password,
    }),
  );
}
