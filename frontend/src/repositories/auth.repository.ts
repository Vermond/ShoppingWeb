export const socialProviders = [
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
  { id: "naver", label: "네이버" },
  { id: "kakao", label: "카카오" },
] as const;

export type SocialProvider = (typeof socialProviders)[number]["id"];

export type LoginRequest =
  | {
      method: "email";
      email: string;
      password: string;
    }
  | {
      method: "social";
      provider: SocialProvider;
    };

export type LoginResponse = {
  user: {
    id: string;
    name: string;
    email: string | null;
  };
  provider: string;
  message: string;
};

export async function requestLogin(
  payload: LoginRequest,
): Promise<LoginResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as LoginResponse & { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "로그인 요청을 처리하지 못했어요.");
  }

  return result;
}
