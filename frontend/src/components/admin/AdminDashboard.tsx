"use client";

import Link from "next/link";
import {
  AssessmentOutlined,
  ChevronRight,
  Close,
  DownloadOutlined,
  Inventory2Outlined,
  PeopleAltOutlined,
  Search,
  ShoppingBagOutlined,
  TrendingDown,
  TrendingUp,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
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
  Tooltip,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { AdminShell, adminTextSizes } from "./AdminShell";
import type {
  AdminDashboardData,
  AdminMetric,
  AdminOrderStatus,
} from "../../data/admin";

const orderStatuses: Array<"전체" | AdminOrderStatus> = [
  "전체",
  "결제 완료",
  "상품 준비중",
  "배송중",
  "배송 완료",
];

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const metricIcons: Record<AdminMetric["icon"], typeof TrendingUp> = {
  sales: TrendingUp,
  orders: ShoppingBagOutlined,
  customers: PeopleAltOutlined,
  conversion: AssessmentOutlined,
};

const statusStyles: Record<
  AdminOrderStatus,
  { color: string; backgroundColor: string }
> = {
  "결제 완료": { color: "#426348", backgroundColor: "#e6f0e4" },
  "상품 준비중": { color: "#8a5d2d", backgroundColor: "#f8eddc" },
  배송중: { color: "#416b7d", backgroundColor: "#e3f0f4" },
  "배송 완료": { color: "#6b6d66", backgroundColor: "#ecece7" },
};

type AdminDashboardProps = {
  initialData: AdminDashboardData;
};

function MetricCard({ metric }: { metric: AdminMetric }) {
  const MetricIcon = metricIcons[metric.icon];
  const isPositive = metric.changeType === "positive";

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderColor: "divider",
        borderRadius: 0,
        bgcolor: "background.paper",
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, md: 3 }, "&:last-child": { pb: { xs: 2.5, md: 3 } } }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.label }}>
            {metric.label}
          </Typography>
          <Box
            sx={{
              display: "grid",
              width: 32,
              height: 32,
              placeItems: "center",
              bgcolor: isPositive ? "#e6f0e4" : "#f8e8df",
              color: isPositive ? "#426348" : "secondary.main",
            }}
          >
            <MetricIcon sx={{ fontSize: 18 }} />
          </Box>
        </Stack>
        <Typography
          sx={{
            mt: 2,
            fontSize: { xs: 22, md: 27 },
            fontWeight: 500,
            letterSpacing: "-.04em",
          }}
        >
          {metric.value}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1, alignItems: "center" }}>
          {isPositive ? (
            <TrendingUp sx={{ color: "#527455", fontSize: 15 }} />
          ) : (
            <TrendingDown sx={{ color: "secondary.main", fontSize: 15 }} />
          )}
          <Typography
            sx={{
              color: isPositive ? "#527455" : "secondary.main",
              fontSize: adminTextSizes.meta,
              fontWeight: 500,
            }}
          >
            {metric.change}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
            {metric.helper}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SalesChart({ sales }: { sales: AdminDashboardData["sales"] }) {
  const maxValue = Math.max(...sales.map((point) => point.value));

  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        borderColor: "divider",
        borderRadius: 0,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
              주간 매출 흐름
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
              이번 주 주문 금액을 기준으로 집계했어요.
            </Typography>
          </Box>
          <Chip
            label="이번 주"
            size="small"
            variant="outlined"
            sx={{
              height: 28,
              borderColor: "divider",
              color: "text.secondary",
              fontSize: adminTextSizes.meta,
            }}
          />
        </Stack>

        <Box
          sx={{
            display: "flex",
            height: 230,
            alignItems: "stretch",
            gap: { xs: 1, sm: 2 },
            pt: 4,
          }}
        >
          {sales.map((point, index) => (
            <Box
              key={point.label}
              sx={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "end",
                gap: 1,
              }}
            >
              <Tooltip title={`${point.value}만원`} arrow>
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 38,
                    height: `${Math.max((point.value / maxValue) * 100, 9)}%`,
                    minHeight: 18,
                    bgcolor: index === sales.length - 1 ? "secondary.main" : "#c6d0c3",
                    transition: "height .3s ease",
                  }}
                />
              </Tooltip>
              <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
                {point.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

function CategoryPerformance({
  categories,
}: {
  categories: AdminDashboardData["categoryPerformance"];
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        borderColor: "divider",
        borderRadius: 0,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
          카테고리별 매출
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
          이번 달 매출 비중이에요.
        </Typography>
        <Stack spacing={2.25} sx={{ mt: 3.5 }}>
          {categories.map((category) => (
            <Box key={category.category}>
              <Stack direction="row" sx={{ mb: 0.75, justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: adminTextSizes.label }}>{category.category}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
                  {currencyFormatter.format(category.sales)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                <LinearProgress
                  variant="determinate"
                  value={category.share}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 0,
                    bgcolor: "#eeeee8",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: category.color,
                    },
                  }}
                />
                <Typography sx={{ minWidth: 25, fontSize: adminTextSizes.meta, textAlign: "right" }}>
                  {category.share}%
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}

function OrdersTable({
  orders,
  query,
  statusFilter,
  onQueryChange,
  onStatusChange,
}: {
  orders: AdminDashboardData["orders"];
  query: string;
  statusFilter: "전체" | AdminOrderStatus;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: "전체" | AdminOrderStatus) => void;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        minWidth: 0,
        borderColor: "divider",
        borderRadius: 0,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
              최근 주문
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
              최근 접수된 주문을 확인하고 상태를 관리하세요.
            </Typography>
          </Box>
          <Button
            endIcon={<ChevronRight sx={{ fontSize: 16 }} />}
            onClick={() => onQueryChange("")}
            sx={{ alignSelf: { xs: "flex-start", sm: "auto" }, color: "text.secondary", fontSize: adminTextSizes.meta }}
          >
            전체 주문 보기
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            size="small"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="주문번호 또는 고객명 검색"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "text.secondary", fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              maxWidth: { sm: 280 },
              "& .MuiOutlinedInput-root": { borderRadius: 0 },
              "& input": { fontSize: adminTextSizes.control },
            }}
          />
          <FormControl size="small" sx={{ minWidth: { sm: 150 } }}>
            <InputLabel sx={{ fontSize: adminTextSizes.control }}>주문 상태</InputLabel>
            <Select
              value={statusFilter}
              label="주문 상태"
              onChange={(event) => onStatusChange(event.target.value as "전체" | AdminOrderStatus)}
              sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
            >
              {orderStatuses.map((status) => (
                <MenuItem key={status} value={status} sx={{ fontSize: adminTextSizes.control }}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      <TableContainer sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
        <Table sx={{ minWidth: 720 }} size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8f8f4" }}>
              {[
                "주문번호",
                "고객",
                "상품",
                "결제 금액",
                "상태",
                "주문일",
              ].map((heading) => (
                <TableCell
                  key={heading}
                  sx={{
                    borderColor: "divider",
                    color: "text.secondary",
                    fontSize: adminTextSizes.meta,
                    whiteSpace: "nowrap",
                  }}
                >
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                    {order.id}
                  </TableCell>
                  <TableCell sx={{ borderColor: "divider" }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Avatar sx={{ width: 27, height: 27, bgcolor: "#d8e1d6", color: "#426348", fontSize: 10 }}>
                        {order.initials}
                      </Avatar>
                      <Typography sx={{ fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
                        {order.customer}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 210, borderColor: "divider", fontSize: adminTextSizes.label }}>
                    {order.product}
                  </TableCell>
                  <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
                    {currencyFormatter.format(order.amount)}
                  </TableCell>
                  <TableCell sx={{ borderColor: "divider" }}>
                    <Chip
                      label={order.status}
                      size="small"
                      sx={{
                        height: 24,
                        bgcolor: statusStyles[order.status].backgroundColor,
                        color: statusStyles[order.status].color,
                        fontSize: adminTextSizes.meta,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                    {order.orderedAt}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 6, borderColor: "divider", textAlign: "center" }}>
                  <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.body }}>
                    조건에 맞는 주문이 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function InventorySummary({
  inventory,
}: {
  inventory: AdminDashboardData["inventory"];
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        borderColor: "divider",
        borderRadius: 0,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
              재고 현황
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
              판매 속도가 빠른 상품부터 보여드려요.
            </Typography>
          </Box>
          <Inventory2Outlined sx={{ color: "secondary.main", fontSize: 20 }} />
        </Stack>

        <Stack spacing={2.5} sx={{ mt: 3.5 }}>
          {inventory.map((item) => (
            <Box key={item.id}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    bgcolor: item.color,
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontSize: adminTextSizes.label }}>
                    {item.name}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: adminTextSizes.meta }}>
                    {item.category}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    color: item.stock < 10 ? "secondary.main" : "text.primary",
                    fontSize: adminTextSizes.label,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.stock}개
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={(item.stock / item.targetStock) * 100}
                sx={{
                  mt: 1,
                  height: 4,
                  borderRadius: 0,
                  bgcolor: "#eeeee8",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: item.stock < 10 ? "secondary.main" : "#9db29b",
                  },
                }}
              />
            </Box>
          ))}
        </Stack>
      </Box>
    </Paper>
  );
}

export function AdminDashboard({ initialData }: AdminDashboardProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"전체" | AdminOrderStatus>("전체");
  const [notice, setNotice] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return initialData.orders.filter((order) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        order.id.toLowerCase().includes(normalizedQuery) ||
        order.customer.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "전체" || order.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [initialData.orders, query, statusFilter]);

  const handleExport = () => {
    setNotice("리포트 다운로드 기능은 API 연결 후 활성화됩니다.");
  };

  return (
    <AdminShell activePath="/admin" pageLabel="대시보드">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              mb: { xs: 3, md: 4 },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.eyebrow, letterSpacing: ".14em", textTransform: "uppercase" }}>
                Good morning, Morrow
              </Typography>
              <Typography component="h1" sx={{ mt: 1, fontSize: { xs: 31, md: 42 }, lineHeight: 1 }}>
                오늘의 스토어
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: adminTextSizes.body }}>
                8월 26일 수요일, 운영 현황을 한눈에 확인하세요.
              </Typography>
            </Box>
            <Stack
              direction="row"
              spacing={1.25}
              useFlexGap
              sx={{
                alignSelf: { xs: "flex-start", sm: "auto" },
                flexWrap: "wrap",
                justifyContent: { xs: "flex-start", sm: "flex-end" },
              }}
            >
              <Button
                component={Link}
                href="/"
                variant="outlined"
                startIcon={<Close sx={{ fontSize: 16 }} />}
                sx={{ borderColor: "divider", color: "text.primary", fontSize: adminTextSizes.control }}
              >
                스토어 보기
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadOutlined sx={{ fontSize: 16 }} />}
                onClick={handleExport}
                sx={{ bgcolor: "primary.main", color: "primary.contrastText", fontSize: adminTextSizes.control, "&:hover": { bgcolor: "secondary.main" } }}
              >
                리포트 내보내기
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" },
              gap: 3,
            }}
          >
            {initialData.metrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.45fr) minmax(300px, .8fr)" },
              gap: 3,
              mt: 3,
            }}
          >
            <SalesChart sales={initialData.sales} />
            <CategoryPerformance categories={initialData.categoryPerformance} />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.45fr) minmax(300px, .8fr)" },
              gap: 3,
              mt: 3,
            }}
          >
            <OrdersTable
              orders={filteredOrders}
              query={query}
              statusFilter={statusFilter}
              onQueryChange={setQuery}
              onStatusChange={setStatusFilter}
            />
            <InventorySummary inventory={initialData.inventory} />
          </Box>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setNotice(null)} severity="info" variant="filled" sx={{ fontSize: adminTextSizes.control }}>
          {notice}
        </Alert>
      </Snackbar>
    </AdminShell>
  );
}
