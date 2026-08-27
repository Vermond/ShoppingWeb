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

function isSocialLoginRequest(
  value: unknown,
): value is Extract<LoginRequest, { method: "social" }> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Partial<Extract<LoginRequest, { method: "social" }>>;

  return request.method === "social" && isSocialProvider(request.provider);
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

  if (!isSocialLoginRequest(body)) {
    return Response.json(
      { error: "로그인 정보를 확인해주세요." },
      { status: 400 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 450));

  const provider = providerLabels[body.provider];

  return Response.json({
    user: {
      id: "mock-user-001",
      name: `${provider} 사용자`,
      email: null,
    },
    provider,
    message: `${provider} 로그인 목업이 완료되었어요.`,
  });
}
