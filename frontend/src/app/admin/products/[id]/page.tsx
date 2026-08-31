import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminProductEditorPage } from "../../../../components/admin/AdminProductEditorPage";
import { getAdminProductDetailData } from "../../../../data/admin-products";
import { AuthRequestError } from "../../../../repositories/auth.repository";
import { requestAdminCategoriesOnServer } from "../../../../repositories/admin-products.server.repository";

export const metadata: Metadata = {
  title: "Morrow Admin — 상품 수정",
  description: "Morrow 상품 수정",
};

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function loadProductDetail(cookieHeader: string, productId: string) {
  try {
    return await getAdminProductDetailData(cookieHeader, productId);
  } catch (error) {
    if (error instanceof AuthRequestError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;
  const cookieHeader = (await cookies()).toString();
  const [product, categories] = await Promise.all([
    loadProductDetail(cookieHeader, id),
    requestAdminCategoriesOnServer(cookieHeader),
  ]);

  return (
    <AdminProductEditorPage
      mode="edit"
      initialData={product}
      categories={categories}
    />
  );
}

