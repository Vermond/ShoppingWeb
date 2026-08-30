"use client";

import {
  ChevronRight,
  DownloadOutlined,
  Search,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  adminOrderStatusLabels,
  adminOrderStatusTransitions,
  adminPaymentStatusLabels,
  adminShippingStatusLabels,
  type AdminOrderListItem,
  type AdminOrderStatus,
  type AdminOrdersData,
} from "../../data/admin-orders";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { AdminShell, adminTextSizes } from "./AdminShell";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const statusStyles: Record<
  AdminOrderStatus,
  { color: string; backgroundColor: string }
> = {
  pending: { color: "#806b3b", backgroundColor: "#f6f0db" },
  paid: { color: "#426348", backgroundColor: "#e6f0e4" },
  shipped: { color: "#416b7d", backgroundColor: "#e3f0f4" },
  completed: { color: "#6b6d66", backgroundColor: "#ecece7" },
  cancelled: { color: "#8c5142", backgroundColor: "#f8e8df" },
};

const orderStatuses: Array<{ value: AdminOrderStatus | ""; label: string }> = [
  { value: "", label: "전체" },
  { value: "pending", label: "결제 대기" },
  { value: "paid", label: "결제 완료" },
  { value: "shipped", label: "배송중" },
  { value: "completed", label: "배송 완료" },
  { value: "cancelled", label: "취소" },
];

const orderActionLabels: Record<AdminOrderStatus, string> = {
  pending: "결제 대기",
  paid: "결제 확인",
  shipped: "배송 시작",
  completed: "배송 완료",
  cancelled: "취소",
};

type OrderActionRequest = {
  orderId: string;
  nextStatus: AdminOrderStatus;
};

type AdminOrdersPageProps = {
  initialData: AdminOrdersData;
};

function buildOrdersUrl(
  search: string,
  status: AdminOrderStatus | "",
  page: number,
): string {
  const params = new URLSearchParams();
  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  }

  if (status) {
    params.set("status", status);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  return queryString ? `/admin/orders?${queryString}` : "/admin/orders";
}

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
        borderColor: "divider",
      }}
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

function PaymentInfo({ order }: { order: AdminOrderListItem }) {
  return (
    <Box>
      <Typography sx={{ fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
        {order.paymentMethod ?? "결제수단 미기록"}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: adminTextSizes.meta }}>
        {adminPaymentStatusLabels[order.paymentStatus]}
      </Typography>
    </Box>
  );
}

function ShippingInfo({ order }: { order: AdminOrderListItem }) {
  const tracking = order.carrier && order.trackingNumber
    ? `${order.carrier} ${order.trackingNumber}`
    : null;

  return (
    <Box>
      <Typography sx={{ fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
        {adminShippingStatusLabels[order.shippingStatus]}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: adminTextSizes.meta }}>
        {tracking ?? "배송정보 미기록"}
      </Typography>
    </Box>
  );
}

function getOrderActions(status: AdminOrderStatus) {
  return adminOrderStatusTransitions[status].map((nextStatus) => ({
    nextStatus,
    label: orderActionLabels[nextStatus],
  }));
}

function getStatusUpdateErrorMessage(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return "주문 상태를 변경하지 못했습니다.";
  }

  const response = result as { message?: unknown; error?: unknown };

  if (typeof response.message === "string") {
    return response.message;
  }

  if (Array.isArray(response.message)) {
    const messages = response.message.filter(
      (message): message is string => typeof message === "string",
    );

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  if (typeof response.error === "string") {
    return response.error;
  }

  return "주문 상태를 변경하지 못했습니다.";
}

export function AdminOrdersPage({ initialData }: AdminOrdersPageProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialData.search);
  const [status, setStatus] = useState<AdminOrderStatus | "">(
    initialData.status ?? "",
  );
  const [notice, setNotice] = useState<{
    message: string;
    severity: "info" | "success" | "error";
  } | null>(null);
  const [actionRequest, setActionRequest] = useState<OrderActionRequest | null>(
    null,
  );
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const navigateToOrders = (
    nextSearch: string,
    nextStatus: AdminOrderStatus | "",
    nextPage: number,
  ) => {
    startTransition(() => {
      router.push(buildOrdersUrl(nextSearch, nextStatus, nextPage));
    });
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToOrders(query, status, 1);
  };

  const handleStatusChange = (nextStatus: AdminOrderStatus | "") => {
    setStatus(nextStatus);
    navigateToOrders(query, nextStatus, 1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    navigateToOrders(query, status, page);
  };

  const handleOrderActionRequest = (
    orderId: string,
    nextStatus: AdminOrderStatus,
  ) => {
    setActionRequest({ orderId, nextStatus });
  };

  const handleOrderActionCancel = () => {
    if (updatingOrderId) {
      return;
    }

    setActionRequest(null);
  };

  const handleOrderActionConfirm = async () => {
    if (!actionRequest || updatingOrderId) {
      return;
    }

    const request = actionRequest;
    setActionRequest(null);
    setUpdatingOrderId(request.orderId);

    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(request.orderId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: request.nextStatus }),
        },
      );
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getStatusUpdateErrorMessage(result));
      }

      const nextStatusLabel = adminOrderStatusLabels[request.nextStatus];
      setNotice({
        message: `주문을 ${nextStatusLabel} 상태로 변경했습니다.`,
        severity: "success",
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : "주문 상태를 변경하지 못했습니다.",
        severity: "error",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const isUpdating = updatingOrderId !== null;

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
            onClick={() =>
              setNotice({
                message: "주문 내보내기는 아직 준비 중입니다.",
                severity: "info",
              })
            }
            sx={{
              bgcolor: "primary.main",
              fontSize: adminTextSizes.control,
              "&:hover": { bgcolor: "secondary.main" },
            }}
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
        <SummaryCard
          label="조회 주문"
          value={`${initialData.totalCount.toLocaleString("ko-KR")}건`}
          description="현재 검색 조건 기준"
        />
        <SummaryCard
          label="결제 대기"
          value={`${initialData.statusCounts.pending.toLocaleString("ko-KR")}건`}
          description="결제 확인이 필요한 주문"
        />
        <SummaryCard
          label="배송중"
          value={`${initialData.statusCounts.shipped.toLocaleString("ko-KR")}건`}
          description="고객에게 이동 중인 주문"
        />
      </Box>

      <Paper
        variant="outlined"
        sx={{
          minWidth: 0,
          borderRadius: 0,
          borderColor: "divider",
          opacity: isPending || isUpdating ? 0.65 : 1,
          transition: "opacity .2s ease",
        }}
      >
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
                최신 주문부터 정렬되어 있습니다.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap>
              <Box component="form" onSubmit={handleSearchSubmit}>
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
              </Box>
              <FormControl size="small" sx={{ minWidth: { sm: 140 } }}>
                <InputLabel sx={{ fontSize: adminTextSizes.control }}>상태</InputLabel>
                <Select
                  value={status}
                  label="상태"
                  onChange={(event) =>
                    handleStatusChange(event.target.value as AdminOrderStatus | "")
                  }
                  sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                >
                  {orderStatuses.map((item) => (
                    <MenuItem key={item.value || "all"} value={item.value} sx={{ fontSize: adminTextSizes.control }}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>

        <TableContainer sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 980 }} size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f8f4" }}>
                {["주문번호", "고객", "상품", "결제 금액", "결제 정보", "배송", "상태", "주문일", "작업"].map(
                  (heading) => (
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
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {initialData.orders.length > 0 ? (
                initialData.orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell sx={{ borderColor: "divider", whiteSpace: "nowrap" }}>
                      <Typography
                        component={Link}
                        href={`/admin/orders/${order.id}`}
                        sx={{
                          color: "primary.main",
                          fontSize: adminTextSizes.meta,
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                        }}
                      >
                        {order.id}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Avatar
                          sx={{ width: 28, height: 28, bgcolor: "#d8e1d6", color: "#426348", fontSize: 10 }}
                        >
                          {order.customer.slice(0, 1)}
                        </Avatar>
                        <Typography sx={{ fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
                          {order.customer}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 230, borderColor: "divider" }}>
                      <Typography sx={{ fontSize: adminTextSizes.label }}>{order.product}</Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: adminTextSizes.meta }}>
                        총 {order.productCount}개
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
                      {currencyFormatter.format(order.amount)}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <PaymentInfo order={order} />
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <ShippingInfo order={order} />
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <Chip
                        label={adminOrderStatusLabels[order.status]}
                        size="small"
                        sx={{
                          height: 24,
                          bgcolor: statusStyles[order.status].backgroundColor,
                          color: statusStyles[order.status].color,
                          fontSize: adminTextSizes.meta,
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        borderColor: "divider",
                        color: "text.secondary",
                        fontSize: adminTextSizes.meta,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.orderedAt}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", minWidth: 160 }}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        useFlexGap
                        sx={{ flexWrap: "wrap" }}
                      >
                        {getOrderActions(order.status).length > 0 ? (
                          getOrderActions(order.status).map((action) => (
                            <Button
                              key={action.nextStatus}
                              size="small"
                              variant={
                                action.nextStatus === "cancelled"
                                  ? "outlined"
                                  : "contained"
                              }
                              color={
                                action.nextStatus === "cancelled"
                                  ? "error"
                                  : "primary"
                              }
                              disabled={isUpdating}
                              onClick={() =>
                                handleOrderActionRequest(
                                  order.id,
                                  action.nextStatus,
                                )
                              }
                              sx={{
                                minWidth: 76,
                                borderRadius: 0,
                                fontSize: adminTextSizes.meta,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {action.label}
                            </Button>
                          ))
                        ) : (
                          <Typography
                            color="text.secondary"
                            sx={{ fontSize: adminTextSizes.meta }}
                          >
                            —
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 6, borderColor: "divider", textAlign: "center" }}>
                    <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.body }}>
                      조건에 맞는 주문이 없습니다.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {initialData.pagination.total_pages > 1 ? (
          <Stack sx={{ alignItems: "center", p: 3 }}>
            <Pagination
              page={initialData.pagination.page}
              count={initialData.pagination.total_pages}
              onChange={handlePageChange}
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
        startIcon={<ChevronRight sx={{ transform: "rotate(180deg)", fontSize: 16 }} />}
        sx={{ mt: 2, color: "text.secondary", fontSize: adminTextSizes.meta }}
      >
        대시보드로 돌아가기
      </Button>

      <Dialog
        open={Boolean(actionRequest)}
        onClose={handleOrderActionCancel}
        disableScrollLock
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: adminTextSizes.cardHeading }}>
          주문 상태를 변경하시겠습니까?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: adminTextSizes.body }}>
            주문 {actionRequest?.orderId}을(를) {actionRequest ? adminOrderStatusLabels[actionRequest.nextStatus] : ""} 상태로 변경합니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleOrderActionCancel}
            disabled={isUpdating}
            sx={{ fontSize: adminTextSizes.control }}
          >
            닫기
          </Button>
          <Button
            variant="contained"
            color={actionRequest?.nextStatus === "cancelled" ? "error" : "primary"}
            onClick={handleOrderActionConfirm}
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={15} color="inherit" /> : null}
            sx={{ fontSize: adminTextSizes.control }}
          >
            {isUpdating ? "처리 중" : "변경하기"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        <Alert onClose={() => setNotice(null)} severity={notice?.severity ?? "info"} variant="filled" sx={{ fontSize: adminTextSizes.control }}>
          {notice?.message}
        </Alert>
      </Snackbar>
    </AdminShell>
  );
}
