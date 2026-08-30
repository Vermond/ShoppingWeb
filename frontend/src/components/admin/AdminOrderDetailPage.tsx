"use client";

import {
  ArrowBack,
  Check,
  LocalShippingOutlined,
  PeopleAltOutlined,
  ReceiptLongOutlined,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
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
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminOrderStatusLabels,
  adminOrderStatusTransitions,
  adminPaymentStatusLabels,
  adminShippingStatusLabels,
  type AdminOrderDetailData,
  type AdminOrderStatus,
} from "../../data/admin-orders";
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

const statusHistoryStyles: Record<
  AdminOrderStatus,
  { color: string; backgroundColor: string }
> = statusStyles;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between" }}>
      <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: adminTextSizes.label, textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 0,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {icon}
          <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
            {title}
          </Typography>
        </Stack>
        <Box sx={{ mt: 2.5 }}>{children}</Box>
      </Box>
    </Paper>
  );
}

function getErrorMessage(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    const result = value as { message?: unknown; error?: unknown };

    if (typeof result.message === "string") return result.message;
    if (typeof result.error === "string") return result.error;
  }

  return "주문 상태를 변경하지 못했습니다.";
}

export function AdminOrderDetailPage({
  initialData,
}: {
  initialData: AdminOrderDetailData;
}) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<AdminOrderStatus>(
    initialData.status,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const nextStatuses = adminOrderStatusTransitions[initialData.status];
  const statusOptions = [initialData.status, ...nextStatuses].filter(
    (status, index, statuses) => statuses.indexOf(status) === index,
  );

  const handleStatusUpdate = async () => {
    if (selectedStatus === initialData.status || isUpdating) {
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(initialData.orderId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: selectedStatus }),
        },
      );
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(result));
      }

      setNotice({ message: "주문 상태를 변경했습니다.", severity: "success" });
      router.refresh();
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : "주문 상태를 변경하지 못했습니다.",
        severity: "error",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AdminShell activePath="/admin/orders" pageLabel="주문 상세">
      <Stack spacing={2.5}>
        <Button
          component={Link}
          href="/admin/orders"
          startIcon={<ArrowBack sx={{ fontSize: 17 }} />}
          sx={{ alignSelf: "flex-start", color: "text.secondary", fontSize: adminTextSizes.control }}
        >
          주문 목록으로 돌아가기
        </Button>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
        >
          <Box>
            <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.eyebrow, letterSpacing: ".14em", textTransform: "uppercase" }}>
              Order detail
            </Typography>
            <Typography component="h1" sx={{ mt: 1, fontSize: { xs: 28, md: 38 }, lineHeight: 1 }}>
              주문 상세
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.25, fontSize: adminTextSizes.body }}>
              {initialData.orderId}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <Chip
              label={adminOrderStatusLabels[initialData.status]}
              sx={{
                bgcolor: statusStyles[initialData.status].backgroundColor,
                color: statusStyles[initialData.status].color,
                fontSize: adminTextSizes.control,
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ fontSize: adminTextSizes.control }}>상태 변경</InputLabel>
              <Select
                value={selectedStatus}
                label="상태 변경"
                onChange={(event) => setSelectedStatus(event.target.value as AdminOrderStatus)}
                disabled={nextStatuses.length === 0 || isUpdating}
                sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
              >
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status} sx={{ fontSize: adminTextSizes.control }}>
                    {adminOrderStatusLabels[status]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<Check sx={{ fontSize: 17 }} />}
              disabled={selectedStatus === initialData.status || isUpdating}
              onClick={handleStatusUpdate}
              sx={{ bgcolor: "primary.main", fontSize: adminTextSizes.control, "&:hover": { bgcolor: "secondary.main" } }}
            >
              {isUpdating ? "저장 중" : "상태 저장"}
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.4fr) minmax(300px, .8fr)" },
            gap: 3,
          }}
        >
          <SectionCard icon={<PeopleAltOutlined sx={{ color: "secondary.main", fontSize: 20 }} />} title="고객 정보">
            <Stack spacing={1.5}>
              <InfoRow label="고객명" value={initialData.customer.name} />
              <InfoRow label="이메일" value={initialData.customer.email} />
              <InfoRow label="전화번호" value={initialData.customer.phone_number ?? "미기록"} />
              <InfoRow label="고객 ID" value={initialData.customer.id} />
            </Stack>
          </SectionCard>

          <SectionCard icon={<ReceiptLongOutlined sx={{ color: "secondary.main", fontSize: 20 }} />} title="주문 금액">
            <Stack spacing={1.5}>
              <InfoRow label="상품 금액" value={currencyFormatter.format(initialData.subtotal)} />
              <InfoRow label="배송비" value={currencyFormatter.format(initialData.shippingFee)} />
              <InfoRow label="할인 금액" value={`-${currencyFormatter.format(initialData.discountAmount)}`} />
              <Divider />
              <InfoRow label="최종 결제 금액" value={currencyFormatter.format(initialData.totalAmount)} />
            </Stack>
          </SectionCard>
        </Box>

        <SectionCard icon={<ReceiptLongOutlined sx={{ color: "secondary.main", fontSize: 20 }} />} title="주문 상품">
          <TableContainer>
            <Table sx={{ minWidth: 620 }} size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8f8f4" }}>
                  {["상품", "옵션", "단가", "수량", "소계"].map((heading) => (
                    <TableCell key={heading} sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {initialData.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label }}>
                      {item.productName}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta }}>
                      {item.options ?? "옵션 없음"}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
                      {currencyFormatter.format(item.unitPrice)}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label }}>
                      {item.quantity}개
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
                      {currencyFormatter.format(item.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
            gap: 3,
          }}
        >
          <SectionCard icon={<LocalShippingOutlined sx={{ color: "secondary.main", fontSize: 20 }} />} title="배송 정보">
            {initialData.address ? (
              <Stack spacing={1.5}>
                <InfoRow label="배송 상태" value={adminShippingStatusLabels[initialData.shipping.status]} />
                <InfoRow label="수령인" value={initialData.address.recipient_name} />
                <InfoRow label="연락처" value={initialData.address.phone_number} />
                <InfoRow label="우편번호" value={initialData.address.postal_code} />
                <InfoRow label="주소" value={`${initialData.address.address_line1}${initialData.address.address_line2 ? ` ${initialData.address.address_line2}` : ""}`} />
                <InfoRow label="배송 요청" value={initialData.address.delivery_request ?? "없음"} />
                <InfoRow label="택배·운송장" value={initialData.shipping.carrier && initialData.shipping.tracking_number ? `${initialData.shipping.carrier} ${initialData.shipping.tracking_number}` : "미기록"} />
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.body }}>
                배송지 정보가 없습니다.
              </Typography>
            )}
          </SectionCard>

          <SectionCard icon={<ReceiptLongOutlined sx={{ color: "secondary.main", fontSize: 20 }} />} title="결제 정보">
            <Stack spacing={1.5}>
              <InfoRow label="결제 제공자" value={initialData.payment.provider} />
              <InfoRow label="결제 상태" value={adminPaymentStatusLabels[initialData.payment.status]} />
              <InfoRow label="결제 수단" value={initialData.payment.method ?? "미기록"} />
              <InfoRow label="승인 ID" value={initialData.payment.transaction_id ?? "미기록"} />
              <InfoRow label="승인 시각" value={initialData.payment.approved_at ?? "미기록"} />
            </Stack>
          </SectionCard>
        </Box>

        <SectionCard icon={<Check sx={{ color: "secondary.main", fontSize: 20 }} />} title="상태 변경 이력">
          {initialData.statusHistory.length > 0 ? (
            <Stack spacing={1.5}>
              {initialData.statusHistory.map((history) => (
                <Stack key={history.id} direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { xs: "flex-start", sm: "center" } }}>
                  <Chip
                    label={adminOrderStatusLabels[history.toStatus]}
                    size="small"
                    sx={{ bgcolor: statusHistoryStyles[history.toStatus].backgroundColor, color: statusHistoryStyles[history.toStatus].color, fontSize: adminTextSizes.meta }}
                  />
                  <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
                    {history.fromStatus ? `${adminOrderStatusLabels[history.fromStatus]}에서 변경` : "주문 생성 상태"} · {history.createdAt} · 변경자 {history.changedBy ?? "시스템"}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.body }}>
              기록된 상태 변경 이력이 없습니다.
            </Typography>
          )}
        </SectionCard>

        <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
          주문 생성일 {initialData.createdAt} · 최근 수정일 {initialData.updatedAt}
        </Typography>
      </Stack>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        <Alert onClose={() => setNotice(null)} severity={notice?.severity ?? "info"} variant="filled" sx={{ fontSize: adminTextSizes.control }}>
          {notice?.message}
        </Alert>
      </Snackbar>
    </AdminShell>
  );
}
