import {
  AuthRequestError,
  type AuthUser,
  type EmailVerificationResponse,
} from "./auth.repository";

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
    (typeof value.email === "string" || value.email === null) &&
    typeof value.role === "string" &&
    typeof value.status === "string"
  );
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

export async function requestCurrentUserOnServer(
  cookieHeader: string,
): Promise<AuthUser | null> {
  const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.replace(
    /\/$/,
    "",
  );

  if (!backendApiBaseUrl) {
    throw new AuthRequestError("인증 서버 주소가 설정되지 않았어요.", {
      status: 503,
    });
  }

  let response: Response;

  try {
    response = await fetch(`${backendApiBaseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });
  } catch {
    throw new AuthRequestError("인증 서버에 연결하지 못했어요.", {
      status: 503,
    });
  }

  const result: unknown = await response.json().catch(() => null);

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new AuthRequestError(
      getResponseMessage(result, "현재 사용자 정보를 확인하지 못했어요."),
      {
        code: getResponseCode(result),
        status: response.status,
      },
    );
  }

  if (!isRecord(result) || !isAuthUser(result.user)) {
    throw new AuthRequestError("현재 사용자 응답을 확인하지 못했어요.", {
      status: 502,
    });
  }

  return result.user;
}

export async function requestVerifyEmailOnServer(
  token: string,
): Promise<EmailVerificationResponse> {
  const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.replace(
    /\/$/,
    "",
  );

  if (!backendApiBaseUrl) {
    throw new AuthRequestError("인증 서버 주소가 설정되지 않았어요.", {
      status: 503,
    });
  }

  let response: Response;

  try {
    response = await fetch(
      `${backendApiBaseUrl}/api/users/email-verification/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
        cache: "no-store",
      },
    );
  } catch {
    throw new AuthRequestError("인증 서버에 연결하지 못했어요.", {
      status: 503,
    });
  }

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthRequestError(
      getResponseMessage(result, "이메일 인증을 처리하지 못했어요."),
      {
        code: getResponseCode(result),
        status: response.status,
      },
    );
  }

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
