import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminProductsPage } from "../../../components/admin/AdminProductsPage";
import {
  getAdminProductsData,
  type AdminProductStatus,
} from "../../../data/admin-products";
import type {
  AdminProductListQuery,
  AdminProductSort,
} from "../../../repositories/admin-products.server.repository";

export const metadata: Metadata = {
  title: "Morrow Admin — 상품 관리",
  description: "Morrow 상품 관리",
};

type SearchParams = Promise<{
  search?: string | string[];
  category_id?: string | string[];
  status?: string | string[];
  low_stock_threshold?: string | string[];
  sort?: string | string[];
  page?: string | string[];
}>;

function getSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getPage(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : undefined;
}

function getOptionalInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function isAdminProductStatus(
  value: string | undefined,
): value is AdminProductStatus {
  return (
    value === "active" ||
    value === "inactive" ||
    value === "draft" ||
    value === "archived"
  );
}

function isAdminProductSort(value: string | undefined): value is AdminProductSort {
  return (
    value === "created_at_desc" ||
    value === "created_at_asc" ||
    value === "price_desc" ||
    value === "price_asc" ||
    value === "stock_asc" ||
    value === "stock_desc" ||
    value === "sales_desc" ||
    value === "sales_asc"
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = getSearchParam(params.search)?.trim() || undefined;
  const categoryValue = getSearchParam(params.category_id);
  const categoryId = categoryValue && /^\d+$/.test(categoryValue)
    ? categoryValue
    : undefined;
  const statusValue = getSearchParam(params.status);
  const status = isAdminProductStatus(statusValue) ? statusValue : undefined;
  const lowStockThreshold = getOptionalInteger(
    getSearchParam(params.low_stock_threshold),
  );
  const sortValue = getSearchParam(params.sort);
  const sort = isAdminProductSort(sortValue) ? sortValue : undefined;
  const page = getPage(getSearchParam(params.page));
  const query: AdminProductListQuery = {
    search,
    categoryId,
    status,
    lowStockThreshold,
    sort,
    page,
  };
  const cookieHeader = (await cookies()).toString();
  const data = await getAdminProductsData(cookieHeader, query);

  return <AdminProductsPage key={JSON.stringify(query)} initialData={data} />;
}
