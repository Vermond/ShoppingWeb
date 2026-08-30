'use client';

import {
  ArrowBack,
  ChevronRight,
  PeopleAltOutlined,
  ReceiptLongOutlined,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import type { AdminCustomerDetailData } from '../../data/admin-customers';
import { AdminSectionHeader } from './AdminSectionHeader';
import { AdminShell, adminTextSizes } from './AdminShell';

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const statusStyles = {
  active: { color: '#426348', backgroundColor: '#e6f0e4' },
  withdrawn: { color: '#6b6d66', backgroundColor: '#ecece7' },
} as const;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: adminTextSizes.label, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

function getProductSummary(
  products: AdminCustomerDetailData['orders'][number]['productSummary'],
): string {
  const firstProduct = products[0]?.product_name ?? '상품 정보 없음';

  if (products.length <= 1) {
    return firstProduct;
  }

  return `${firstProduct} 외 ${products.length - 1}건`;
}

export function AdminCustomerDetailPage({
  initialData,
}: {
  initialData: AdminCustomerDetailData;
}) {
  const statusStyle = statusStyles[initialData.status];

  return (
    <AdminShell activePath="/admin/customers" pageLabel="고객 상세">
      <Stack spacing={2.5}>
        <Button
          component={Link}
          href="/admin/customers"
          startIcon={<ArrowBack sx={{ fontSize: 17 }} />}
          sx={{ alignSelf: 'flex-start', color: 'text.secondary', fontSize: adminTextSizes.control }}
        >
          고객 목록으로 돌아가기
        </Button>

        <AdminSectionHeader
          eyebrow="Customer detail"
          title={initialData.name}
          description={initialData.email}
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.2fr) minmax(300px, .8fr)' },
            gap: 3,
          }}
        >
          <Paper variant="outlined" sx={{ borderRadius: 0, borderColor: 'divider' }}>
            <Box sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <PeopleAltOutlined sx={{ color: 'secondary.main', fontSize: 20 }} />
                <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                  고객 정보
                </Typography>
              </Stack>
              <Stack spacing={1.5} sx={{ mt: 2.5 }}>
                <InfoRow label="고객명" value={initialData.name} />
                <InfoRow label="이메일" value={initialData.email} />
                <InfoRow label="고객 ID" value={initialData.id} />
                <InfoRow label="가입일" value={initialData.createdAt} />
                <InfoRow label="최근 수정일" value={initialData.updatedAt} />
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
                    회원 상태
                  </Typography>
                  <Chip
                    label={initialData.status}
                    size="small"
                    sx={{ height: 24, bgcolor: statusStyle.backgroundColor, color: statusStyle.color, fontSize: adminTextSizes.meta }}
                  />
                </Stack>
                <InfoRow label="이메일 인증" value={initialData.emailVerified ? '인증 완료' : '미인증'} />
              </Stack>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 0, borderColor: 'divider' }}>
            <Box sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <ReceiptLongOutlined sx={{ color: 'secondary.main', fontSize: 20 }} />
                <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                  구매 요약
                </Typography>
              </Stack>
              <Stack spacing={1.5} sx={{ mt: 2.5 }}>
                <InfoRow label="주문 수" value={`${initialData.orderCount.toLocaleString('ko-KR')}건`} />
                <InfoRow label="누적 구매" value={currencyFormatter.format(Number(initialData.totalSpent))} />
                <InfoRow label="최근 주문" value={initialData.lastOrderAt ?? '주문 없음'} />
              </Stack>
            </Box>
          </Paper>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 0, borderColor: 'divider' }}>
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
              주문 내역
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
              고객의 전체 주문을 최신순으로 표시합니다.
            </Typography>
          </Box>
          <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 780 }} size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8f8f4' }}>
                  {['주문번호', '상품', '상품 수량', '결제 금액', '주문 상태', '주문일시', '상세'].map((heading) => (
                    <TableCell key={heading} sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: adminTextSizes.meta, whiteSpace: 'nowrap' }}>
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {initialData.orders.length > 0 ? (
                  initialData.orders.map((order) => (
                    <TableRow key={order.orderId} hover>
                      <TableCell sx={{ borderColor: 'divider', fontSize: adminTextSizes.meta, whiteSpace: 'nowrap' }}>
                        {order.orderId}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'divider', fontSize: adminTextSizes.label, whiteSpace: 'nowrap' }}>
                        {getProductSummary(order.productSummary)}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'divider', fontSize: adminTextSizes.label, whiteSpace: 'nowrap' }}>
                        {order.productCount}개
                      </TableCell>
                      <TableCell sx={{ borderColor: 'divider', fontSize: adminTextSizes.label, whiteSpace: 'nowrap' }}>
                        {currencyFormatter.format(Number(order.totalAmount))}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'divider', fontSize: adminTextSizes.meta, whiteSpace: 'nowrap' }}>
                        {order.status}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: adminTextSizes.meta, whiteSpace: 'nowrap' }}>
                        {order.createdAt}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'divider' }}>
                        <Button
                          component={Link}
                          href={`/admin/orders/${encodeURIComponent(order.orderId)}`}
                          endIcon={<ChevronRight sx={{ fontSize: 15 }} />}
                          sx={{ minWidth: 0, p: 0, color: 'text.secondary', fontSize: adminTextSizes.meta, whiteSpace: 'nowrap' }}
                        >
                          주문 상세
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ borderColor: 'divider', py: 6, textAlign: 'center', color: 'text.secondary', fontSize: adminTextSizes.body }}>
                      주문 내역이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>
    </AdminShell>
  );
}
