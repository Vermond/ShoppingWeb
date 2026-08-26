import type { Metadata } from "next";
import { AdminCustomersPage } from "../../../components/admin/AdminCustomersPage";
import { getAdminCustomersData } from "../../../data/admin-pages";

export const metadata: Metadata = {
  title: "Morrow Admin — 고객 관리",
  description: "Morrow 고객 관리",
};

export default async function CustomersPage() {
  const data = await getAdminCustomersData();

  return <AdminCustomersPage customers={data.customers} />;
}
