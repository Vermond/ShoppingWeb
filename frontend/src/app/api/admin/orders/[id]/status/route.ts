import { proxyAuthRequest } from "../../../../auth/proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  return proxyAuthRequest(
    request,
    `/api/admin/orders/${encodeURIComponent(id)}/status`,
  );
}
