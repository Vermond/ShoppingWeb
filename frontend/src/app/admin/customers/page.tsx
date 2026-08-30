import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { AdminCustomersPage } from '../../../components/admin/AdminCustomersPage';
import { getAdminCustomersData } from '../../../data/admin-customers';
import type {
  AdminCustomerSort,
  AdminCustomerStatus,
} from '../../../repositories/admin-customers.server.repository';

export const metadata: Metadata = {
  title: 'Morrow Admin — 고객 관리',
  description: 'Morrow 고객 관리',
};

type SearchParams = Promise<{
  search?: string | string[];
  status?: string | string[];
  email_verified?: string | string[];
  from?: string | string[];
  to?: string | string[];
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

function getEmailVerified(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function isCustomerStatus(value: string | undefined): value is AdminCustomerStatus {
  return value === 'active' || value === 'withdrawn';
}

function isCustomerSort(value: string | undefined): value is AdminCustomerSort {
  return (
    value === 'created_at_desc' ||
    value === 'created_at_asc' ||
    value === 'order_count_desc' ||
    value === 'total_spent_desc' ||
    value === 'last_order_at_desc'
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = getSearchParam(params.search)?.trim() || undefined;
  const statusValue = getSearchParam(params.status);
  const status = isCustomerStatus(statusValue) ? statusValue : undefined;
  const emailVerified = getEmailVerified(getSearchParam(params.email_verified));
  const from = getSearchParam(params.from);
  const to = getSearchParam(params.to);
  const sortValue = getSearchParam(params.sort);
  const sort = isCustomerSort(sortValue) ? sortValue : undefined;
  const page = getPage(getSearchParam(params.page));
  const query = { search, status, emailVerified, from, to, sort, page };
  const cookieHeader = (await cookies()).toString();
  const data = await getAdminCustomersData(cookieHeader, query);

  return <AdminCustomersPage key={JSON.stringify(query)} initialData={data} />;
}
