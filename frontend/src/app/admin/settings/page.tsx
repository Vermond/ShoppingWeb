import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminSettingsPage } from "../../../components/admin/AdminSettingsPage";
import { getAdminSettingsData } from "../../../data/admin-settings";

export const metadata: Metadata = {
  title: "Morrow Admin — 설정",
  description: "Morrow 스토어 설정",
};

export default async function SettingsPage() {
  const cookieHeader = (await cookies()).toString();
  const settings = await getAdminSettingsData(cookieHeader);

  return <AdminSettingsPage settings={settings} />;
}
