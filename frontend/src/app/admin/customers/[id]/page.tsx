import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { AdminCustomerDetailPage } from '../../../../components/admin/AdminCustomerDetailPage';
import { getAdminCustomerDetailData } from '../../../../data/admin-customers';
import { AuthRequestError } from '../../../../repositories/auth.repository';

export const metadata: Metadata = {
  title: 'Morrow Admin — 고객 상세',
  description: 'Morrow 고객 상세 정보',
};

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function loadCustomerDetail(cookieHeader: string, customerId: string) {
  try {
    return await getAdminCustomerDetailData(cookieHeader, customerId);
  } catch (error) {
    if (error instanceof AuthRequestError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;
  const cookieHeader = (await cookies()).toString();
  const customer = await loadCustomerDetail(cookieHeader, id);

  return <AdminCustomerDetailPage initialData={customer} />;
}
