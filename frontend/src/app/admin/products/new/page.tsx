import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminProductEditorPage } from "../../../../components/admin/AdminProductEditorPage";
import { requestAdminCategoriesOnServer } from "../../../../repositories/admin-products.server.repository";

export const metadata: Metadata = {
  title: "Morrow Admin — 상품 등록",
  description: "Morrow 상품 등록",
};

export default async function NewProductPage() {
  const cookieHeader = (await cookies()).toString();
  const categories = await requestAdminCategoriesOnServer(cookieHeader);

  return (
    <AdminProductEditorPage
      mode="create"
      initialData={null}
      categories={categories}
    />
  );
}

