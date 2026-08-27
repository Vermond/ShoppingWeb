import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthRequestError,
  requestAuthenticatedUser,
  requestLogin,
  requestUpdateProfile,
} from "../src/repositories/auth.repository.ts";

const user = {
  id: "user-1",
  name: "홍길동",
  email: "user@example.com",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("이메일 로그인은 실제 인증 API와 credentials를 사용한다", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: unknown;
  let requestPath = "";

  globalThis.fetch = async (input, init) => {
    requestPath = String(input);
    requestBody = JSON.parse(String(init?.body));
    return jsonResponse({ user, provider: "이메일", message: "로그인 성공" });
  };

  try {
    const result = await requestLogin({
      method: "email",
      email: "user@example.com",
      password: "password",
    });

    assert.equal(requestPath, "/api/auth/login");
    assert.deepEqual(requestBody, {
      method: "email",
      email: "user@example.com",
      password: "password",
    });
    assert.deepEqual(result.user, user);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("인증된 사용자 조회가 401이면 refresh 후 세션을 복구한다", async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];

  globalThis.fetch = async (input) => {
    const path = String(input);
    requests.push(path);

    if (path === "/api/auth/me") {
      return jsonResponse({ message: "만료된 세션" }, 401);
    }

    return jsonResponse({ user });
  };

  try {
    const result = await requestAuthenticatedUser();

    assert.deepEqual(result, user);
    assert.deepEqual(requests, ["/api/auth/me", "/api/auth/refresh"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("프로필 수정은 401 응답 이후 refresh를 거쳐 한 번 재시도한다", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ path: string; method: string }> = [];
  let profileAttempt = 0;

  globalThis.fetch = async (input, init) => {
    const path = String(input);
    const method = String(init?.method ?? "GET");
    requests.push({ path, method });

    if (path === "/api/users/user-1") {
      profileAttempt += 1;
      return profileAttempt === 1
        ? jsonResponse({ message: "토큰 만료" }, 401)
        : jsonResponse({ user: { ...user, name: "김길동" } });
    }

    return jsonResponse({ user });
  };

  try {
    const result = await requestUpdateProfile("user-1", { name: "김길동" });

    assert.equal(result.user.name, "김길동");
    assert.deepEqual(requests, [
      { path: "/api/users/user-1", method: "PATCH" },
      { path: "/api/auth/refresh", method: "POST" },
      { path: "/api/users/user-1", method: "PATCH" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("인증 API 오류는 서버 code와 status를 보존한다", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    jsonResponse({ code: "EMAIL_NOT_VERIFIED", message: "이메일 인증이 필요해요." }, 403);

  try {
    await assert.rejects(
      requestLogin({
        method: "email",
        email: "user@example.com",
        password: "password",
      }),
      (error: unknown) => {
        assert.ok(error instanceof AuthRequestError);
        assert.equal(error.code, "EMAIL_NOT_VERIFIED");
        assert.equal(error.status, 403);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
