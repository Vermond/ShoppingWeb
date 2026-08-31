import {
  AuthRequestError,
  requestRefresh,
} from "./auth.repository.ts";

export type UserAddress = {
  id: string;
  recipientName: string;
  phoneNumber: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserAddressRequest = {
  recipientName: string;
  phoneNumber: string;
  postalCode: string;
  addressLine1: string;
  addressLine2: string | null;
  isDefault?: boolean;
};

export type UpdateUserAddressRequest = Partial<
  Omit<CreateUserAddressRequest, "isDefault">
> & {
  isDefault?: boolean;
};

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

async function requestWithAuthRetry(
  request: () => Promise<Response>,
): Promise<Response> {
  const response = await request();

  if (response.status !== 401) {
    return response;
  }

  try {
    await requestRefresh();
  } catch {
    return response;
  }

  return request();
}

async function requestUserDetailsApi(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await requestWithAuthRetry(() =>
    fetch(path, {
      ...init,
      credentials: "include",
      cache: "no-store",
    }),
  );
  const result = await readResponse(response);

  if (!response.ok) {
    throw new AuthRequestError(
      getResponseMessage(result, "사용자 정보를 처리하지 못했어요."),
      {
        code: getResponseCode(result),
        status: response.status,
      },
    );
  }

  return result;
}

function parseAddress(value: unknown): UserAddress | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const recipientName = readString(value.recipient_name);
  const phoneNumber = readString(value.phone_number);
  const postalCode = readString(value.postal_code);
  const addressLine1 = readString(value.address_line1);
  const createdAt = readString(value.created_at);
  const updatedAt = readString(value.updated_at);

  if (
    !id ||
    !recipientName ||
    !phoneNumber ||
    !postalCode ||
    !addressLine1 ||
    typeof value.is_default !== "boolean" ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  let addressLine2: string | null = null;

  if (value.address_line2 !== null && value.address_line2 !== undefined) {
    if (typeof value.address_line2 !== "string") {
      return null;
    }

    addressLine2 = value.address_line2.trim() || null;
  }

  return {
    id,
    recipientName,
    phoneNumber,
    postalCode,
    addressLine1,
    addressLine2,
    isDefault: value.is_default,
    createdAt,
    updatedAt,
  };
}

function parseAddressEnvelope(value: unknown): UserAddress {
  const address = isRecord(value) ? parseAddress(value.address) : null;

  if (!address) {
    throw new AuthRequestError("배송지 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  return address;
}

export async function requestUserAddresses(): Promise<UserAddress[]> {
  const result = await requestUserDetailsApi("/api/users/me/addresses", {
    method: "GET",
  });
  const addresses = isRecord(result) ? result.addresses : null;

  if (!Array.isArray(addresses)) {
    throw new AuthRequestError("배송지 목록 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  const parsedAddresses = addresses
    .map(parseAddress)
    .filter((address): address is UserAddress => address !== null);

  if (parsedAddresses.length !== addresses.length) {
    throw new AuthRequestError("배송지 목록 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  return parsedAddresses;
}

export async function createUserAddress(
  payload: CreateUserAddressRequest,
): Promise<UserAddress> {
  const result = await requestUserDetailsApi("/api/users/me/addresses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient_name: payload.recipientName,
      phone_number: payload.phoneNumber,
      postal_code: payload.postalCode,
      address_line1: payload.addressLine1,
      address_line2: payload.addressLine2,
      ...(payload.isDefault === undefined
        ? {}
        : { is_default: payload.isDefault }),
    }),
  });

  return parseAddressEnvelope(result);
}

export async function updateUserAddress(
  addressId: string,
  payload: UpdateUserAddressRequest,
): Promise<UserAddress> {
  const result = await requestUserDetailsApi(
    `/api/users/me/addresses/${encodeURIComponent(addressId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(payload.recipientName === undefined
          ? {}
          : { recipient_name: payload.recipientName }),
        ...(payload.phoneNumber === undefined
          ? {}
          : { phone_number: payload.phoneNumber }),
        ...(payload.postalCode === undefined
          ? {}
          : { postal_code: payload.postalCode }),
        ...(payload.addressLine1 === undefined
          ? {}
          : { address_line1: payload.addressLine1 }),
        ...(payload.addressLine2 === undefined
          ? {}
          : { address_line2: payload.addressLine2 }),
        ...(payload.isDefault === undefined
          ? {}
          : { is_default: payload.isDefault }),
      }),
    },
  );

  return parseAddressEnvelope(result);
}

export async function deleteUserAddress(
  addressId: string,
): Promise<{ message: string }> {
  const result = await requestUserDetailsApi(
    `/api/users/me/addresses/${encodeURIComponent(addressId)}`,
    {
      method: "DELETE",
    },
  );

  if (!isRecord(result) || typeof result.message !== "string") {
    throw new AuthRequestError("배송지 삭제 응답 형식이 올바르지 않아요.", {
      status: 502,
    });
  }

  return { message: result.message };
}
