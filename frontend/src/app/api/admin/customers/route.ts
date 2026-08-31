import { proxyAuthRequest } from '../../auth/proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  return proxyAuthRequest(request, `/api/admin/customers${url.search}`);
}
