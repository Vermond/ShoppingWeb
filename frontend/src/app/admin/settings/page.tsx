import type { Metadata } from "next";
import { AdminSettingsPage } from "../../../components/admin/AdminSettingsPage";
import { getAdminSettingsData } from "../../../data/admin-pages";

export const metadata: Metadata = {
  title: "Morrow Admin — 설정",
  description: "Morrow 스토어 설정",
};

export default async function SettingsPage() {
  const settings = await getAdminSettingsData();

  return <AdminSettingsPage settings={settings} />;
}
