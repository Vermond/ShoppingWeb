import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminReportsPage } from "../../../components/admin/AdminReportsPage";
import {
  getAdminReportData,
  type AdminReportPeriodPreset,
} from "../../../data/admin-reports";

export const metadata: Metadata = {
  title: "Morrow Admin — 리포트",
  description: "Morrow 매출 리포트",
};

type SearchParams = Promise<{ period?: string | string[] }>;

function getSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getPeriodPreset(value: string | undefined): AdminReportPeriodPreset {
  if (value === "30d" || value === "quarter") {
    return value;
  }

  return "7d";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const preset = getPeriodPreset(getSearchParam(params.period));
  const cookieHeader = (await cookies()).toString();
  const report = await getAdminReportData(cookieHeader, preset);

  return <AdminReportsPage initialData={report} />;
}
