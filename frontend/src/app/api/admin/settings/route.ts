import { proxyAuthRequest } from "../../auth/proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return proxyAuthRequest(request, "/api/admin/settings");
}

export async function PATCH(request: Request) {
  return proxyAuthRequest(request, "/api/admin/settings");
}
