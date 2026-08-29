import { proxyAuthRequest } from "../proxy";
import {
  getLoginPath,
  getSafeReturnTo,
} from "../../../../utils/auth-redirect";

export const dynamic = "force-dynamic";

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};

function getReturnPath(request: Request) {
  const requestUrl = new URL(request.url);

  return getSafeReturnTo(requestUrl.searchParams.get("returnTo"));
}

function getSetCookies(headers: Headers): string[] {
  const headersWithSetCookie = headers as HeadersWithSetCookie;
  const setCookies = headersWithSetCookie.getSetCookie?.() ?? [];

  if (setCookies.length > 0) {
    return setCookies;
  }

  const setCookie = headers.get("set-cookie");

  return setCookie ? [setCookie] : [];
}

export async function POST(request: Request) {
  return proxyAuthRequest(request, "/api/auth/refresh");
}

export async function GET(request: Request) {
  const refreshResponse = await proxyAuthRequest(
    request,
    "/api/auth/refresh",
  );

  if (!refreshResponse.ok) {
    return new Response(null, {
      status: 307,
      headers: {
        Location: new URL(
          getLoginPath(getReturnPath(request)),
          request.url,
        ).toString(),
      },
    });
  }

  const responseHeaders = new Headers({
    Location: new URL(getReturnPath(request), request.url).toString(),
  });

  for (const setCookie of getSetCookies(refreshResponse.headers)) {
    responseHeaders.append("set-cookie", setCookie);
  }

  return new Response(null, {
    status: 307,
    headers: responseHeaders,
  });
}
