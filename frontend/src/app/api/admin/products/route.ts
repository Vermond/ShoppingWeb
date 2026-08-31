import { proxyAuthRequest } from "../../auth/proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return proxyAuthRequest(request, `/api/admin/products${url.search}`);
}

export async function POST(request: Request) {
  return proxyAuthRequest(request, "/api/admin/products");
}
