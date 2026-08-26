"use client";

import {
  DownloadOutlined,
  Search,
} from "@mui/icons-material";
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
} from "@mui/material";
import { useMemo, useState } from "react";
import type { AdminOrderRecord } from "../../data/admin-pages";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { AdminShell, adminTextSizes } from "./AdminShell";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const statusStyles: Record<
  AdminOrderRecord["status"],
  { color: string; backgroundColor: string }
> = {
  "결제 완료": { color: "#426348", backgroundColor: "#e6f0e4" },
  "상품 준비중": { color: "#8a5d2d", backgroundColor: "#f8eddc" },
  배송중: { color: "#416b7d", backgroundColor: "#e3f0f4" },
  "배송 완료": { color: "#6b6d66", backgroundColor: "#ecece7" },
};

const orderStatuses = [
  "전체",
  "결제 완료",
  "상품 준비중",
  "배송중",
  "배송 완료",
] as const;

type AdminOrdersPageProps = {
  orders: AdminOrderRecord[];
};

function SummaryCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{ minWidth: 0, p: { xs: 2.5, md: 3 }, borderRadius: 0, borderColor: "divider" }}
    >
      <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.label }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 1.5, fontSize: { xs: 24, md: 29 }, letterSpacing: "-.04em" }}>
        {value}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, fontSize: adminTextSizes.meta }}>
        {description}
      </Typography>
    </Paper>
  );
}

export function AdminOrdersPage({ orders }: AdminOrdersPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof orderStatuses)[number]>("전체");
  const [notice, setNotice] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        order.id.toLowerCase().includes(normalizedQuery) ||
        order.customer.toLowerCase().includes(normalizedQuery) ||
        order.product.toLowerCase().includes(normalizedQuery);
      const matchesStatus = status === "전체" || order.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [orders, query, status]);

  return (
    <AdminShell activePath="/admin/orders" pageLabel="주문 관리">
      <AdminSectionHeader
        eyebrow="Operations"
        title="주문 관리"
        description="주문 상태를 확인하고 배송 준비를 이어가세요."
        actions={
          <Button
            variant="contained"
            startIcon={<DownloadOutlined sx={{ fontSize: 17 }} />}
            onClick={() => setNotice("주문 내보내기는 API 연결 후 활성화됩니다.")}
            sx={{ bgcolor: "primary.main", fontSize: adminTextSizes.control, "&:hover": { bgcolor: "secondary.main" } }}
          >
            주문 내보내기
          </Button>
        }
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
          gap: 3,
          mb: 3,
        }}
      >
        <SummaryCard label="전체 주문" value="184건" description="이번 달 누적 주문" />
        <SummaryCard label="상품 준비중" value="12건" description="오늘 처리할 주문" />
        <SummaryCard label="배송중" value="8건" description="고객에게 이동 중" />
      </Box>

      <Paper variant="outlined" sx={{ minWidth: 0, borderRadius: 0, borderColor: "divider" }}>
        <Box sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
          >
            <Box>
              <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                주문 목록
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                최근 주문부터 정렬되어 있습니다.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap>
              <TextField
                size="small"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="주문번호·고객·상품 검색"
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
                  minWidth: { sm: 240 },
                  "& .MuiOutlinedInput-root": { borderRadius: 0 },
                  "& input": { fontSize: adminTextSizes.control },
                }}
              />
              <FormControl size="small" sx={{ minWidth: { sm: 140 } }}>
                <InputLabel sx={{ fontSize: adminTextSizes.control }}>상태</InputLabel>
                <Select
                  value={status}
                  label="상태"
                  onChange={(event) => setStatus(event.target.value as (typeof orderStatuses)[number])}
                  sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                >
                  {orderStatuses.map((item) => (
                    <MenuItem key={item} value={item} sx={{ fontSize: adminTextSizes.control }}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>

        <TableContainer sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 840 }} size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f8f4" }}>
                {["주문번호", "고객", "상품", "결제 금액", "결제 수단", "상태", "주문일"].map((heading) => (
                  <TableCell key={heading} sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                      {order.id}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: "#d8e1d6", color: "#426348", fontSize: 10 }}>
                          {order.customer.slice(0, 1)}
                        </Avatar>
                        <Typography sx={{ fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
                          {order.customer}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 230, borderColor: "divider", fontSize: adminTextSizes.label }}>
                      {order.product}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
                      {currencyFormatter.format(order.amount)}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                      {order.payment}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <Chip
                        label={order.status}
                        size="small"
                        sx={{ height: 24, bgcolor: statusStyles[order.status].backgroundColor, color: statusStyles[order.status].color, fontSize: adminTextSizes.meta }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                      {order.orderedAt}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 6, borderColor: "divider", textAlign: "center" }}>
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

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        <Alert onClose={() => setNotice(null)} severity="info" variant="filled" sx={{ fontSize: adminTextSizes.control }}>
          {notice}
        </Alert>
      </Snackbar>
    </AdminShell>
  );
}
