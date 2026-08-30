"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import type {
  AdminReportData,
  AdminReportPeriodPreset,
} from "../../data/admin-reports";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { AdminShell, adminTextSizes } from "./AdminShell";

type AdminReportsPageProps = {
  initialData: AdminReportData;
};

const periodOptions: Array<{
  value: AdminReportPeriodPreset;
  label: string;
}> = [
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
  { value: "quarter", label: "이번 분기" },
];

const changeColors: Record<
  AdminReportData["summary"][number]["changeType"],
  string
> = {
  positive: "#527455",
  negative: "#b25e49",
  neutral: "text.secondary",
};

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

function formatWon(value: number): string {
  return currencyFormatter.format(value);
}

function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR");
}

function formatPeriodDate(date: string): string {
  return date.replace(/-/g, ".");
}

function getPeriodLabel(data: AdminReportData): string {
  return `${formatPeriodDate(data.period.from)} ~ ${formatPeriodDate(data.period.to)}`;
}

function buildReportUrl(preset: AdminReportPeriodPreset): string {
  return preset === "7d" ? "/admin/reports" : `/admin/reports?period=${preset}`;
}

function ReportMetric({
  metric,
}: {
  metric: AdminReportData["summary"][number];
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: 0,
        borderColor: "divider",
      }}
    >
      <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.label }}>
        {metric.label}
      </Typography>
      <Typography
        sx={{
          mt: 1.5,
          fontSize: { xs: 24, md: 29 },
          letterSpacing: "-.04em",
        }}
      >
        {metric.value}
      </Typography>
      <Typography
        sx={{
          mt: 1,
          color: changeColors[metric.changeType],
          fontSize: adminTextSizes.meta,
        }}
      >
        {metric.change} {metric.helper}
      </Typography>
    </Paper>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <Typography color="text.secondary" sx={{ py: 3, fontSize: adminTextSizes.body }}>
      {children}
    </Typography>
  );
}

export function AdminReportsPage({ initialData }: AdminReportsPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const maxRevenue = Math.max(
    0,
    ...initialData.sales.map((point) => Math.max(point.revenue, 0)),
  );
  const chartMinWidth = initialData.sales.length > 10
    ? initialData.sales.length * 48
    : "100%";

  const handlePeriodChange = (preset: AdminReportPeriodPreset) => {
    if (preset === initialData.preset) {
      return;
    }

    startTransition(() => {
      router.push(buildReportUrl(preset));
    });
  };

  return (
    <AdminShell activePath="/admin/reports" pageLabel="리포트">
      <AdminSectionHeader
        eyebrow="Insights"
        title="리포트"
        description="매출과 고객 흐름을 기준으로 다음 선택을 준비하세요."
        actions={
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="admin-report-period-label" sx={{ fontSize: adminTextSizes.control }}>
              조회 기간
            </InputLabel>
            <Select
              labelId="admin-report-period-label"
              value={initialData.preset}
              label="조회 기간"
              disabled={isPending}
              onChange={(event) => {
                handlePeriodChange(event.target.value as AdminReportPeriodPreset);
              }}
              sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
            >
              {periodOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  value={option.value}
                  sx={{ fontSize: adminTextSizes.control }}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      />

      <Box
        sx={{
          opacity: isPending ? 0.65 : 1,
          transition: "opacity 160ms ease",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
              xl: "repeat(5, minmax(0, 1fr))",
            },
            gap: 3,
            mb: 3,
          }}
        >
          {initialData.summary.map((metric) => (
            <ReportMetric key={metric.id} metric={metric} />
          ))}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "minmax(0, 1.45fr) minmax(320px, .8fr)",
            },
            gap: 3,
          }}
        >
          <Paper variant="outlined" sx={{ minWidth: 0, borderRadius: 0, borderColor: "divider" }}>
            <Box sx={{ p: { xs: 2.5, md: 3 } }}>
              <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                <Box>
                  <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                    매출 추이
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                    {getPeriodLabel(initialData)} 기준 주문 매출
                  </Typography>
                </Box>
                <Chip
                  label="원화"
                  size="small"
                  variant="outlined"
                  sx={{ height: 26, borderColor: "divider", fontSize: adminTextSizes.meta }}
                />
              </Stack>

              {initialData.sales.length === 0 ? (
                <EmptyState>선택한 기간에 매출 데이터가 없습니다.</EmptyState>
              ) : (
                <Box sx={{ mt: 2, overflowX: "auto", pb: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      minWidth: chartMinWidth,
                      height: 290,
                      alignItems: "stretch",
                      gap: { xs: 1, sm: 2 },
                      pt: 4,
                    }}
                  >
                    {initialData.sales.map((point, index) => {
                      const barHeight = maxRevenue === 0
                        ? 8
                        : Math.max((point.revenue / maxRevenue) * 100, 8);

                      return (
                        <Box
                          key={point.date}
                          sx={{
                            display: "flex",
                            minWidth: initialData.sales.length > 10 ? 32 : 0,
                            flex: 1,
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "end",
                            gap: 1,
                          }}
                        >
                          <Tooltip
                            title={`${formatWon(point.revenue)} · ${formatNumber(point.orderCount)}건`}
                            arrow
                          >
                            <Box
                              sx={{
                                width: "100%",
                                maxWidth: 42,
                                height: `${barHeight}%`,
                                minHeight: 18,
                                bgcolor: index === initialData.sales.length - 1
                                  ? "secondary.main"
                                  : "#c6d0c3",
                              }}
                            />
                          </Tooltip>
                          <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
                            {point.label}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ borderRadius: 0, borderColor: "divider" }}>
            <Box sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                카테고리별 매출
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                매출 기여도와 판매 수량을 비교해보세요.
              </Typography>
              <Stack spacing={2.5} sx={{ mt: 3.5 }}>
                {initialData.categories.length === 0 ? (
                  <EmptyState>선택한 기간에 카테고리 매출이 없습니다.</EmptyState>
                ) : (
                  initialData.categories.map((category) => (
                    <Box key={category.id}>
                      <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
                        <Typography sx={{ fontSize: adminTextSizes.label }}>
                          {category.label}
                        </Typography>
                        <Typography sx={{ fontSize: adminTextSizes.meta }}>
                          {category.share.toFixed(1)}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.max(0, Math.min(category.share, 100))}
                        sx={{
                          mt: 0.75,
                          height: 6,
                          borderRadius: 0,
                          bgcolor: "#eeeee8",
                          "& .MuiLinearProgress-bar": { bgcolor: category.color },
                        }}
                      />
                      <Typography color="text.secondary" sx={{ mt: 0.6, fontSize: adminTextSizes.meta }}>
                        {formatWon(category.revenue)} · {formatNumber(category.salesQuantity)}개 판매
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
            </Box>
          </Paper>
        </Box>

        <Paper variant="outlined" sx={{ mt: 3, borderRadius: 0, borderColor: "divider" }}>
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 1 }}
            >
              <Box>
                <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                  인기 상품
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                  선택한 기간의 판매 수량과 매출 기준 상위 상품입니다.
                </Typography>
              </Box>
              <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
                비교 기간: {formatPeriodDate(initialData.comparisonPeriod.from)} ~ {formatPeriodDate(initialData.comparisonPeriod.to)}
              </Typography>
            </Stack>

            {initialData.topProducts.length === 0 ? (
              <EmptyState>선택한 기간에 판매된 상품이 없습니다.</EmptyState>
            ) : (
              <TableContainer sx={{ mt: 2, overflowX: "auto" }}>
                <Table sx={{ minWidth: 620 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: adminTextSizes.meta }}>상품</TableCell>
                      <TableCell sx={{ fontSize: adminTextSizes.meta }}>카테고리</TableCell>
                      <TableCell align="right" sx={{ fontSize: adminTextSizes.meta }}>판매 수량</TableCell>
                      <TableCell align="right" sx={{ fontSize: adminTextSizes.meta }}>매출</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {initialData.topProducts.map((product) => (
                      <TableRow key={product.id} hover>
                        <TableCell>
                          <Typography
                            component={NextLink}
                            href={`/admin/products/${product.id}`}
                            sx={{
                              color: "inherit",
                              fontSize: adminTextSizes.body,
                              textDecoration: "none",
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            {product.name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: adminTextSizes.body }}>
                          {product.category}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: adminTextSizes.body }}>
                          {formatNumber(product.salesQuantity)}개
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: adminTextSizes.body }}>
                          {formatWon(product.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>

        <Typography color="text.secondary" sx={{ mt: 2, fontSize: adminTextSizes.meta }}>
          <Typography
            component={NextLink}
            href="/admin"
            sx={{ color: "inherit", textDecoration: "underline" }}
          >
            대시보드로 돌아가기
          </Typography>
        </Typography>
      </Box>
    </AdminShell>
  );
}
