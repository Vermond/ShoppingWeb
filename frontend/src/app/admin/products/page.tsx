import type { Metadata } from "next";
import { AdminProductsPage } from "../../../components/admin/AdminProductsPage";
import { getAdminProductsData } from "../../../data/admin-pages";

export const metadata: Metadata = {
  title: "Morrow Admin — 상품 관리",
  description: "Morrow 상품 관리",
};

export default async function ProductsPage() {
  const data = await getAdminProductsData();

  return <AdminProductsPage products={data.products} />;
}
