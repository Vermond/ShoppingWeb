import type { Metadata } from "next";
import { AdminReportsPage } from "../../../components/admin/AdminReportsPage";
import { getAdminReportData } from "../../../data/admin-pages";

export const metadata: Metadata = {
  title: "Morrow Admin — 리포트",
  description: "Morrow 매출 리포트",
};

export default async function ReportsPage() {
  const report = await getAdminReportData();

  return <AdminReportsPage report={report} />;
}
