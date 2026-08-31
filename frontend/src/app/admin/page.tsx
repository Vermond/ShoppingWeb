import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminDashboard } from "../../components/admin/AdminDashboard";
import { getAdminDashboardData } from "../../data/admin";

export const metadata: Metadata = {
  title: "Morrow Admin — 대시보드",
  description: "Morrow 스토어 관리자 대시보드",
};

export default async function AdminPage() {
  const cookieHeader = (await cookies()).toString();
  const dashboardData = await getAdminDashboardData(cookieHeader);

  return <AdminDashboard initialData={dashboardData} />;
}
