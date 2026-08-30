import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminOrdersPage } from "../../../components/admin/AdminOrdersPage";
import {
  getAdminOrdersData,
  type AdminOrderStatus,
} from "../../../data/admin-orders";

export const metadata: Metadata = {
  title: "Morrow Admin — 주문 관리",
  description: "Morrow 주문 관리",
};

type SearchParams = Promise<{
  search?: string | string[];
  status?: string | string[];
  page?: string | string[];
}>;

function getSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isAdminOrderStatus(value: string | undefined): value is AdminOrderStatus {
  return (
    value === "pending" ||
    value === "paid" ||
    value === "shipped" ||
    value === "completed" ||
    value === "cancelled"
  );
}

function getPage(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : undefined;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = getSearchParam(params.search)?.trim() || undefined;
  const requestedStatus = getSearchParam(params.status);
  const status = isAdminOrderStatus(requestedStatus) ? requestedStatus : undefined;
  const page = getPage(getSearchParam(params.page));
  const cookieHeader = (await cookies()).toString();
  const data = await getAdminOrdersData(cookieHeader, { search, status, page });

  return (
    <AdminOrdersPage
      key={`${search ?? ""}:${status ?? ""}:${page ?? 1}`}
      initialData={data}
    />
  );
}
