import assert from "node:assert/strict";
import test from "node:test";
import {
  createUserAddress,
  deleteUserAddress,
  requestUserAddresses,
  updateUserAddress,
} from "../src/repositories/user-details.repository.ts";

const address = {
  id: "11111111-1111-4111-8111-111111111111",
  recipient_name: "홍길동",
  phone_number: "01012345678",
  postal_code: "04524",
  address_line1: "서울시 중구 세종대로 1",
  address_line2: "101호",
  is_default: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("배송지 목록은 snake_case 응답을 camelCase로 변환한다", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    jsonResponse({ addresses: [address] });

  try {
    const result = await requestUserAddresses();

    assert.deepEqual(result[0], {
      id: address.id,
      recipientName: "홍길동",
      phoneNumber: "01012345678",
      postalCode: "04524",
      addressLine1: "서울시 중구 세종대로 1",
      addressLine2: "101호",
      isDefault: true,
      createdAt: address.created_at,
      updatedAt: address.updated_at,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("배송지 변경 요청은 API별 경로와 요청 본문을 사용한다", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ path: string; method: string; body: unknown }> = [];

  globalThis.fetch = async (input, init) => {
    requests.push({
      path: String(input),
      method: String(init?.method),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });

    if (init?.method === "DELETE") {
      return jsonResponse({ message: "배송지를 삭제했습니다." });
    }

    return jsonResponse({ address });
  };

  try {
    await createUserAddress({
      recipientName: "홍길동",
      phoneNumber: "01012345678",
      postalCode: "04524",
      addressLine1: "서울시 중구 세종대로 1",
      addressLine2: null,
      isDefault: true,
    });
    await updateUserAddress(address.id, {
      addressLine2: null,
      isDefault: false,
    });
    const result = await deleteUserAddress(address.id);

    assert.equal(result.message, "배송지를 삭제했습니다.");
    assert.deepEqual(requests, [
      {
        path: "/api/users/me/addresses",
        method: "POST",
        body: {
          recipient_name: "홍길동",
          phone_number: "01012345678",
          postal_code: "04524",
          address_line1: "서울시 중구 세종대로 1",
          address_line2: null,
          is_default: true,
        },
      },
      {
        path: `/api/users/me/addresses/${address.id}`,
        method: "PATCH",
        body: {
          address_line2: null,
          is_default: false,
        },
      },
      {
        path: `/api/users/me/addresses/${address.id}`,
        method: "DELETE",
        body: null,
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
