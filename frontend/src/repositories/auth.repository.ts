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

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  role?: string;
  status?: string;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type LoginResponse = {
  user: AuthUser;
  provider: string;
  message: string;
};

export type LogoutResponse = {
  message: string;
};

export type SignupRequest = {
  name: string;
  email: string;
  password: string;
};

export type SignupResponse = {
  user: AuthUser & { email: string };
};

export type EmailVerificationResponse = {
  code: string;
  message: string;
};

export class AuthRequestError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message);
    this.name = "AuthRequestError";
    this.code = options.code;
    this.status = options.status ?? 500;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (typeof value.email === "string" || value.email === null)
  );
}

function readAuthUser(result: unknown, fallback: string): AuthUser {
  if (!isRecord(result) || !isAuthUser(result.user)) {
    throw new AuthRequestError(fallback, { status: 502 });
  }

  return result.user;
}

function getResponseMessage(result: unknown, fallback: string) {
  if (!isRecord(result)) {
    return fallback;
  }

  if (typeof result.message === "string") {
    return result.message;
  }

  if (typeof result.error === "string") {
    return result.error;
  }

  return fallback;
}

function getResponseCode(result: unknown) {
  if (isRecord(result) && typeof result.code === "string") {
    return result.code;
  }

  return undefined;
}

async function readResponse(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

async function throwIfRequestFailed(
  response: Response,
  fallback: string,
  result?: unknown,
) {
  if (response.ok) {
    return;
  }

  const errorResult = result ?? (await readResponse(response));
  throw new AuthRequestError(getResponseMessage(errorResult, fallback), {
    code: getResponseCode(errorResult),
    status: response.status,
  });
}

export async function requestLogin(
  payload: LoginRequest,
): Promise<LoginResponse> {
  const endpoint =
    payload.method === "social"
      ? "/api/mock/auth/login"
      : "/api/auth/login";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const result = await readResponse(response);
  if (!response.ok) {
    throw new AuthRequestError(
      getResponseMessage(result, "로그인 요청을 처리하지 못했어요."),
      {
        code: getResponseCode(result),
        status: response.status,
      },
    );
  }

  const user = readAuthUser(result, "로그인 응답을 확인하지 못했어요.");
  const resultRecord = isRecord(result) ? result : {};

  return {
    user,
    provider:
      typeof resultRecord.provider === "string"
        ? resultRecord.provider
        : payload.method === "email"
          ? "이메일"
          : payload.provider,
    message:
      typeof resultRecord.message === "string"
        ? resultRecord.message
        : "로그인이 완료되었어요.",
  };
}

export async function requestCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const result = await readResponse(response);

  if (response.status === 401) {
    return null;
  }

  await throwIfRequestFailed(
    response,
    "현재 사용자 정보를 확인하지 못했어요.",
    result,
  );

  return readAuthUser(result, "현재 사용자 응답을 확인하지 못했어요.");
}

export async function requestRefresh(): Promise<AuthUser> {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  const result = await readResponse(response);

  await throwIfRequestFailed(
    response,
    "로그인 상태를 갱신하지 못했어요.",
    result,
  );

  return readAuthUser(result, "토큰 갱신 응답을 확인하지 못했어요.");
}

export async function requestLogout(): Promise<LogoutResponse> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  const result = await readResponse(response);

  await throwIfRequestFailed(response, "로그아웃하지 못했어요.", result);

  if (!isRecord(result) || typeof result.message !== "string") {
    throw new AuthRequestError("로그아웃 응답을 확인하지 못했어요.", {
      status: 502,
    });
  }

  return { message: result.message };
}

export async function requestSignup(
  payload: SignupRequest,
): Promise<SignupResponse> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const result = await readResponse(response);
  await throwIfRequestFailed(
    response,
    "회원가입을 처리하지 못했어요.",
    result,
  );

  const user = isRecord(result) ? result.user : undefined;

  if (!isAuthUser(user) || typeof user.email !== "string") {
    throw new AuthRequestError("회원가입 응답을 확인하지 못했어요.", {
      status: 502,
    });
  }

  return { user: { ...user, email: user.email } };
}

export async function requestVerifyEmail(
  token: string,
): Promise<EmailVerificationResponse> {
  const response = await fetch("/api/users/email-verification/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ token }),
  });

  const result = await readResponse(response);
  await throwIfRequestFailed(
    response,
    "이메일 인증을 처리하지 못했어요.",
    result,
  );

  if (
    !isRecord(result) ||
    typeof result.code !== "string" ||
    typeof result.message !== "string"
  ) {
    throw new AuthRequestError("이메일 인증 응답을 확인하지 못했어요.", {
      status: 502,
    });
  }

  return {
    code: result.code,
    message: result.message,
  };
}

export async function requestResendVerification(
  email: string,
): Promise<EmailVerificationResponse> {
  const response = await fetch("/api/users/email-verification/resend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  const result = await readResponse(response);
  await throwIfRequestFailed(
    response,
    "인증 메일을 다시 보내지 못했어요.",
    result,
  );

  if (
    !isRecord(result) ||
    typeof result.code !== "string" ||
    typeof result.message !== "string"
  ) {
    throw new AuthRequestError("인증 메일 응답을 확인하지 못했어요.", {
      status: 502,
    });
  }

  return {
    code: result.code,
    message: result.message,
  };
}

export async function requestPasswordReset(email: string) {
  const response = await fetch("/api/mock/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  const result = await readResponse(response);
  await throwIfRequestFailed(
    response,
    "재설정 요청을 처리하지 못했어요.",
    result,
  );

  return isRecord(result) && typeof result.message === "string"
    ? { message: result.message }
    : { message: "재설정 요청을 확인해주세요." };
}
