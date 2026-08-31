import { AuthRequestError } from "./auth.repository";

export type AdminSettingsResponse = {
  shipping_policy: {
    id: string;
    base_fee: string;
    free_threshold: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
};

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function getResponseMessage(result: unknown, fallback: string): string {
  if (!isRecord(result)) {
    return fallback;
  }

  if (typeof result.message === "string") {
    return result.message;
  }

  if (Array.isArray(result.message)) {
    const messages = result.message.filter(
      (message): message is string => typeof message === "string",
    );

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  if (typeof result.error === "string") {
    return result.error;
  }

  return fallback;
}

function getResponseCode(result: unknown): string | undefined {
  return isRecord(result) && typeof result.code === "string"
    ? result.code
    : undefined;
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`관리자 배송 설정 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`관리자 배송 설정 응답의 ${fieldName} 값이 올바르지 않습니다.`);
  }

  return value;
}

function readResponse(value: unknown): AdminSettingsResponse {
  if (!isRecord(value) || !isRecord(value.shipping_policy)) {
    throw new Error("관리자 배송 설정 응답 형식이 올바르지 않습니다.");
  }

  const policy = value.shipping_policy;

  return {
    shipping_policy: {
      id: readString(policy.id, "shipping_policy.id"),
      base_fee: readString(policy.base_fee, "shipping_policy.base_fee"),
      free_threshold: readString(
        policy.free_threshold,
        "shipping_policy.free_threshold",
      ),
      is_active: readBoolean(policy.is_active, "shipping_policy.is_active"),
      created_at: readString(policy.created_at, "shipping_policy.created_at"),
      updated_at: readString(policy.updated_at, "shipping_policy.updated_at"),
    },
  };
}

export async function requestAdminSettingsOnServer(
  cookieHeader: string,
): Promise<AdminSettingsResponse> {
  const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.replace(
    /\/$/,
    "",
  );

  if (!backendApiBaseUrl) {
    throw new AuthRequestError(
      "백엔드 API 주소가 설정되지 않아 배송 설정을 불러올 수 없습니다.",
      { status: 500 },
    );
  }

  let response: Response;

  try {
    response = await fetch(`${backendApiBaseUrl}/api/admin/settings`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
  } catch {
    throw new AuthRequestError("배송 설정 서버와 통신하지 못했습니다.", {
      status: 503,
    });
  }

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthRequestError(
      getResponseMessage(result, "관리자 배송 설정을 불러오지 못했습니다."),
      {
        code: getResponseCode(result),
        status: response.status,
      },
    );
  }

  try {
    return readResponse(result);
  } catch (error) {
    throw new AuthRequestError(
      error instanceof Error
        ? error.message
        : "관리자 배송 설정 응답을 처리하지 못했습니다.",
      { status: 502 },
    );
  }
}
