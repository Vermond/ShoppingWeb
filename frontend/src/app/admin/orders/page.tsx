import type { Metadata } from "next";
import { AdminOrdersPage } from "../../../components/admin/AdminOrdersPage";
import { getAdminOrdersData } from "../../../data/admin-pages";

export const metadata: Metadata = {
  title: "Morrow Admin — 주문 관리",
  description: "Morrow 주문 관리",
};

export default async function OrdersPage() {
  const data = await getAdminOrdersData();

  return <AdminOrdersPage orders={data.orders} />;
}
