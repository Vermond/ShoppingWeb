import { proxyAuthRequest } from '../../../auth/proxy';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;

  return proxyAuthRequest(
    request,
    `/api/admin/customers/${encodeURIComponent(id)}`,
  );
}
