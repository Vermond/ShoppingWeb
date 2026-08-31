import { proxyAuthRequest } from "../proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return proxyAuthRequest(request, "/api/auth/logout");
}
