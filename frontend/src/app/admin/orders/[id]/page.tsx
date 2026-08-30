import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminOrderDetailPage } from "../../../../components/admin/AdminOrderDetailPage";
import { getAdminOrderDetailData } from "../../../../data/admin-orders";
import { AuthRequestError } from "../../../../repositories/auth.repository";

export const metadata: Metadata = {
  title: "Morrow Admin — 주문 상세",
  description: "Morrow 주문 상세 정보",
};

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function loadOrderDetail(cookieHeader: string, orderId: string) {
  try {
    return await getAdminOrderDetailData(cookieHeader, orderId);
  } catch (error) {
    if (error instanceof AuthRequestError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const cookieHeader = (await cookies()).toString();
  const order = await loadOrderDetail(cookieHeader, id);

  return <AdminOrderDetailPage initialData={order} />;
}
