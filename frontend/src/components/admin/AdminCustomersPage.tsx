'use client';

import { ChevronRight, Search } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import type {
  AdminCustomerListItem,
  AdminCustomersData,
} from '../../data/admin-customers';
import type {
  AdminCustomerSort,
  AdminCustomerStatus,
} from '../../repositories/admin-customers.server.repository';
import { AdminSectionHeader } from './AdminSectionHeader';
import { AdminShell, adminTextSizes } from './AdminShell';

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const customerStatuses: Array<{
  value: AdminCustomerStatus | '';
  label: string;
}> = [
  { value: '', label: '전체' },
  { value: 'active', label: 'active' },
  { value: 'withdrawn', label: 'withdrawn' },
];

const emailVerificationOptions = [
  { value: '', label: '전체' },
  { value: 'true', label: '인증 완료' },
  { value: 'false', label: '미인증' },
] as const;

const customerSorts: Array<{ value: AdminCustomerSort; label: string }> = [
  { value: 'created_at_desc', label: '가입일 최신순' },
  { value: 'created_at_asc', label: '가입일 오래된순' },
  { value: 'order_count_desc', label: '주문 수 많은순' },
  { value: 'total_spent_desc', label: '누적 구매 많은순' },
  { value: 'last_order_at_desc', label: '최근 주문 최신순' },
];

const statusStyles: Record<
  AdminCustomerStatus,
  { color: string; backgroundColor: string }
> = {
  active: { color: '#426348', backgroundColor: '#e6f0e4' },
  withdrawn: { color: '#6b6d66', backgroundColor: '#ecece7' },
};

type AdminCustomersPageProps = {
  initialData: AdminCustomersData;
};

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        minWidth: 0,
        p: { xs: 2.5, md: 3 },
        borderRadius: 0,
        borderColor: 'divider',
      }}
    >
      <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.label }}>
        {label}
      </Typography>
      <Typography
        sx={{ mt: 1.5, fontSize: { xs: 24, md: 29 }, letterSpacing: '-.04em' }}
      >
        {value}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, fontSize: adminTextSizes.meta }}>
        {description}
      </Typography>
    </Paper>
  );
}

function buildCustomersUrl({
  search,
  status,
  emailVerified,
  from,
  to,
  sort,
  page,
}: {
  search: string;
  status: AdminCustomerStatus | '';
  emailVerified: string;
  from: string;
  to: string;
  sort: AdminCustomerSort;
  page: number;
}): string | null {
  if ((from && !to) || (!from && to)) {
    return null;
  }

  const params = new URLSearchParams();
  const normalizedSearch = search.trim();

  if (normalizedSearch) params.set('search', normalizedSearch);
  if (status) params.set('status', status);
  if (emailVerified) params.set('email_verified', emailVerified);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (sort !== 'created_at_desc') params.set('sort', sort);
  if (page > 1) params.set('page', String(page));

  const queryString = params.toString();
  return queryString ? `/admin/customers?${queryString}` : '/admin/customers';
}

function formatCustomerId(id: string): string {
  return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

function getOrderSummary(customer: AdminCustomerListItem): string {
  return customer.orderCount === 0 ? '주문 없음' : `${customer.orderCount}건 주문`;
}

export function AdminCustomersPage({ initialData }: AdminCustomersPageProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialData.query.search ?? '');
  const [status, setStatus] = useState<AdminCustomerStatus | ''>(
    initialData.query.status ?? '',
  );
  const [emailVerified, setEmailVerified] = useState(
    initialData.query.emailVerified === undefined
      ? ''
      : String(initialData.query.emailVerified),
  );
  const [from, setFrom] = useState(initialData.query.from ?? '');
  const [to, setTo] = useState(initialData.query.to ?? '');
  const [sort, setSort] = useState<AdminCustomerSort>(
    initialData.query.sort ?? 'created_at_desc',
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const navigateToCustomers = (page: number) => {
    const url = buildCustomersUrl({
      search,
      status,
      emailVerified,
      from,
      to,
      sort,
      page,
    });

    if (!url) {
      setNotice('가입일 기간은 시작일과 종료일을 함께 입력해주세요.');
      return;
    }

    startTransition(() => {
      router.push(url);
    });
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToCustomers(1);
  };

  const handleStatusChange = (nextStatus: AdminCustomerStatus | '') => {
    setStatus(nextStatus);
    const url = buildCustomersUrl({
      search,
      status: nextStatus,
      emailVerified,
      from,
      to,
      sort,
      page: 1,
    });

    if (url) {
      startTransition(() => router.push(url));
    } else {
      setNotice('가입일 기간은 시작일과 종료일을 함께 입력해주세요.');
    }
  };

  const handleEmailVerifiedChange = (nextValue: string) => {
    setEmailVerified(nextValue);
    const url = buildCustomersUrl({
      search,
      status,
      emailVerified: nextValue,
      from,
      to,
      sort,
      page: 1,
    });

    if (url) {
      startTransition(() => router.push(url));
    } else {
      setNotice('가입일 기간은 시작일과 종료일을 함께 입력해주세요.');
    }
  };

  const handleSortChange = (nextSort: AdminCustomerSort) => {
    setSort(nextSort);
    const url = buildCustomersUrl({
      search,
      status,
      emailVerified,
      from,
      to,
      sort: nextSort,
      page: 1,
    });

    if (url) {
      startTransition(() => router.push(url));
    } else {
      setNotice('가입일 기간은 시작일과 종료일을 함께 입력해주세요.');
    }
  };

  return (
    <AdminShell activePath="/admin/customers" pageLabel="고객 관리">
      <AdminSectionHeader
        eyebrow="Community"
        title="고객 관리"
        description="고객의 가입 현황과 주문 이력을 확인하세요."
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 3,
          mb: 3,
        }}
      >
        <SummaryCard
          label="전체 가입 고객"
          value={`${initialData.summary.totalCustomerCount.toLocaleString('ko-KR')}명`}
          description="고객 역할 계정 전체"
        />
        <SummaryCard
          label="활성 고객"
          value={`${initialData.summary.activeCustomerCount.toLocaleString('ko-KR')}명`}
          description="status = active"
        />
        <SummaryCard
          label="기간 내 신규 고객"
          value={`${initialData.summary.newCustomerCount.toLocaleString('ko-KR')}명`}
          description="가입일 기준 서버 집계"
        />
        <SummaryCard
          label="재구매율"
          value={`${initialData.summary.repurchaseRatePercent.toFixed(2)}%`}
          description="구매 고객 중 2건 이상"
        />
      </Box>

      <Paper
        variant="outlined"
        sx={{
          minWidth: 0,
          borderRadius: 0,
          borderColor: 'divider',
          opacity: isPending ? 0.65 : 1,
          transition: 'opacity .2s ease',
        }}
      >
        <Box sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={3}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                  고객 목록
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                  검색과 정렬은 서버에서 처리됩니다. 총 {initialData.totalCount.toLocaleString('ko-KR')}명
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap>
                <Box component="form" onSubmit={handleSearchSubmit}>
                  <TextField
                    size="small"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="이름·이메일·고객 ID 검색"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search sx={{ color: 'text.secondary', fontSize: 18 }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      minWidth: { sm: 250 },
                      '& .MuiOutlinedInput-root': { borderRadius: 0 },
                      '& input': { fontSize: adminTextSizes.control },
                    }}
                  />
                </Box>
                <FormControl size="small" sx={{ minWidth: { sm: 120 } }}>
                  <InputLabel sx={{ fontSize: adminTextSizes.control }}>상태</InputLabel>
                  <Select
                    value={status}
                    label="상태"
                    onChange={(event) => handleStatusChange(event.target.value as AdminCustomerStatus | '')}
                    sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                  >
                    {customerStatuses.map((item) => (
                      <MenuItem key={item.value || 'all'} value={item.value} sx={{ fontSize: adminTextSizes.control }}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              useFlexGap
            >
              <FormControl size="small" sx={{ minWidth: { md: 150 } }}>
                <InputLabel shrink sx={{ fontSize: adminTextSizes.control }}>
                  이메일 인증
                </InputLabel>
                <Select
                  value={emailVerified}
                  label="이메일 인증"
                  displayEmpty
                  renderValue={(selected) => {
                    if (selected === '') {
                      return '전체';
                    }

                    return selected === 'true' ? '인증 완료' : '미인증';
                  }}
                  onChange={(event) => handleEmailVerifiedChange(event.target.value)}
                  sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                >
                  {emailVerificationOptions.map((item) => (
                    <MenuItem key={item.value || 'all'} value={item.value} sx={{ fontSize: adminTextSizes.control }}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="가입일 시작"
                type="date"
                size="small"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                    sx: { fontSize: adminTextSizes.control },
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 }, '& input': { fontSize: adminTextSizes.control } }}
              />
              <TextField
                label="가입일 종료"
                type="date"
                size="small"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                    sx: { fontSize: adminTextSizes.control },
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0 }, '& input': { fontSize: adminTextSizes.control } }}
              />
              <Button
                variant="outlined"
                onClick={() => navigateToCustomers(1)}
                sx={{ borderRadius: 0, borderColor: 'divider', color: 'text.primary', fontSize: adminTextSizes.control }}
              >
                필터 적용
              </Button>
              <FormControl size="small" sx={{ minWidth: { md: 170 }, ml: { md: 'auto' } }}>
                <InputLabel sx={{ fontSize: adminTextSizes.control }}>정렬</InputLabel>
                <Select
                  value={sort}
                  label="정렬"
                  onChange={(event) => handleSortChange(event.target.value as AdminCustomerSort)}
                  sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                >
                  {customerSorts.map((item) => (
                    <MenuItem key={item.value} value={item.value} sx={{ fontSize: adminTextSizes.control }}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>

        <TableContainer sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: 1_050 }} size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f8f4' }}>
                {['고객', '이메일 인증', '상태', '주문 수', '누적 구매', '최근 주문', '가입일', '상세'].map((heading) => (
                  <TableCell key={heading} sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: adminTextSizes.meta, whiteSpace: 'nowrap' }}>
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {initialData.customers.length > 0 ? (
                initialData.customers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell sx={{ borderColor: 'divider' }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: '#d8e1d6', color: '#426348', fontSize: 10 }}>
                          {customer.name.slice(0, 1)}
                        </Avatar>
                        <Box>
                          <Typography
                            component={Link}
                            href={`/admin/customers/${encodeURIComponent(customer.id)}`}
                            sx={{ color: 'text.primary', fontSize: adminTextSizes.label, textDecoration: 'none', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {customer.name}
                          </Typography>
                          <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: adminTextSizes.meta, whiteSpace: 'nowrap' }}>
                            {formatCustomerId(customer.id)}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider' }}>
                      <Chip
                        label={customer.emailVerified ? '인증 완료' : '미인증'}
                        size="small"
                        sx={{ height: 24, bgcolor: customer.emailVerified ? '#e6f0e4' : '#f8e8df', color: customer.emailVerified ? '#426348' : '#8c5142', fontSize: adminTextSizes.meta }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider' }}>
                      <Chip
                        label={customer.status}
                        size="small"
                        sx={{ height: 24, bgcolor: statusStyles[customer.status].backgroundColor, color: statusStyles[customer.status].color, fontSize: adminTextSizes.meta }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider', fontSize: adminTextSizes.label, whiteSpace: 'nowrap' }}>
                      {getOrderSummary(customer)}
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider', fontSize: adminTextSizes.label, whiteSpace: 'nowrap' }}>
                      {currencyFormatter.format(customer.totalSpent)}
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: adminTextSizes.meta, whiteSpace: 'nowrap' }}>
                      {customer.lastOrderAt ?? '주문 없음'}
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: adminTextSizes.meta, whiteSpace: 'nowrap' }}>
                      {customer.createdAt}
                    </TableCell>
                    <TableCell sx={{ borderColor: 'divider' }}>
                      <Button
                        component={Link}
                        href={`/admin/customers/${encodeURIComponent(customer.id)}`}
                        endIcon={<ChevronRight sx={{ fontSize: 15 }} />}
                        sx={{ minWidth: 0, p: 0, color: 'text.secondary', fontSize: adminTextSizes.meta, whiteSpace: 'nowrap' }}
                      >
                        보기
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} sx={{ borderColor: 'divider', py: 6, textAlign: 'center', color: 'text.secondary', fontSize: adminTextSizes.body }}>
                    조회된 고객이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {initialData.pagination.total_pages > 1 ? (
          <Stack sx={{ alignItems: 'center', p: 3 }}>
            <Pagination
              page={initialData.pagination.page}
              count={initialData.pagination.total_pages}
              onChange={(_event, page) => navigateToCustomers(page)}
              disabled={isPending}
              shape="rounded"
              color="primary"
            />
          </Stack>
        ) : null}
      </Paper>

      <Button
        component={Link}
        href="/admin"
        startIcon={<ChevronRight sx={{ transform: 'rotate(180deg)', fontSize: 16 }} />}
        sx={{ mt: 2, color: 'text.secondary', fontSize: adminTextSizes.meta }}
      >
        대시보드로 돌아가기
      </Button>

      <Snackbar open={Boolean(notice)} autoHideDuration={4_000} onClose={() => setNotice(null)}>
        <Alert onClose={() => setNotice(null)} severity="info" variant="filled" sx={{ fontSize: adminTextSizes.control }}>
          {notice}
        </Alert>
      </Snackbar>
    </AdminShell>
  );
}
