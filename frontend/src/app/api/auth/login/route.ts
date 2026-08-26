import {
  socialProviders,
  type LoginRequest,
  type SocialProvider,
} from "@/repositories/auth.repository";

export const dynamic = "force-dynamic";

const providerLabels: Record<SocialProvider, string> = Object.fromEntries(
  socialProviders.map(({ id, label }) => [id, label]),
) as Record<SocialProvider, string>;

function isSocialProvider(value: unknown): value is SocialProvider {
  return socialProviders.some(({ id }) => id === value);
}

function isLoginRequest(value: unknown): value is LoginRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<LoginRequest>;

  if (request.method === "social") {
    return isSocialProvider(request.provider);
  }

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

  if (!isLoginRequest(body)) {
    return Response.json(
      { error: "로그인 정보를 확인해주세요." },
      { status: 400 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 450));

  const provider =
    body.method === "social" ? providerLabels[body.provider] : "이메일";
  const email = body.method === "email" ? body.email : null;

  return Response.json({
    user: {
      id: "mock-user-001",
      name: email?.split("@")[0] ?? `${provider} 사용자`,
      email,
    },
    provider,
    message: `${provider} 로그인 목업이 완료되었어요.`,
  });
}
