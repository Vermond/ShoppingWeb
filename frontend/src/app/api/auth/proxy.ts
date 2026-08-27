const forwardedResponseHeaders = [
  "cache-control",
  "content-type",
  "vary",
  "www-authenticate",
];

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};

function getResponseHeaders(response: Response): Headers {
  const headers = new Headers();

  for (const headerName of forwardedResponseHeaders) {
    const value = response.headers.get(headerName);

    if (value) {
      headers.set(headerName, value);
    }
  }

  const responseHeaders = response.headers as HeadersWithSetCookie;
  const setCookies = responseHeaders.getSetCookie?.() ?? [];

  if (setCookies.length > 0) {
    for (const setCookie of setCookies) {
      headers.append("set-cookie", setCookie);
    }
  } else {
    const setCookie = response.headers.get("set-cookie");

    if (setCookie) {
      headers.set("set-cookie", setCookie);
    }
  }

  return headers;
}

export async function proxyAuthRequest(
  request: Request,
  backendPath: string,
  bodyOverride?: string,
): Promise<Response> {
  const backendApiBaseUrl = process.env.BACKEND_API_BASE_URL?.replace(
    /\/$/,
    "",
  );

  if (!backendApiBaseUrl) {
    return Response.json(
      { error: "인증 서버 주소가 설정되지 않았어요." },
      { status: 503 },
    );
  }

  try {
    const headers = new Headers();
    const cookie = request.headers.get("cookie");

    if (cookie) {
      headers.set("cookie", cookie);
    }

    let body = bodyOverride;

    if (
      body === undefined &&
      request.method !== "GET" &&
      request.method !== "HEAD"
    ) {
      body = await request.text();
    }

    if (body !== undefined) {
      headers.set(
        "content-type",
        request.headers.get("content-type") ?? "application/json",
      );
    }

    const backendResponse = await fetch(`${backendApiBaseUrl}${backendPath}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: getResponseHeaders(backendResponse),
    });
  } catch {
    return Response.json(
      { error: "인증 서버에 연결하지 못했어요." },
      { status: 503 },
    );
  }
}
