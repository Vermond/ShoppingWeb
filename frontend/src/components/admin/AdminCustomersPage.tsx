"use client";

import { DownloadOutlined, Search } from "@mui/icons-material";
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
import type { AdminCustomerRecord } from "../../data/admin-pages";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { AdminShell, adminTextSizes } from "./AdminShell";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const customerStatuses = ["전체", "활성", "휴면"] as const;

type AdminCustomersPageProps = {
  customers: AdminCustomerRecord[];
};

export function AdminCustomersPage({ customers }: AdminCustomersPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof customerStatuses)[number]>("전체");
  const [notice, setNotice] = useState<string | null>(null);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        customer.name.toLowerCase().includes(normalizedQuery) ||
        customer.email.toLowerCase().includes(normalizedQuery);
      const matchesStatus = status === "전체" || customer.status === status;

      return matchesQuery && matchesStatus;
    });
  }, [customers, query, status]);

  return (
    <AdminShell activePath="/admin/customers" pageLabel="고객 관리">
      <AdminSectionHeader
        eyebrow="Community"
        title="고객 관리"
        description="고객의 쇼핑 흐름과 관계를 오래 이어가세요."
        actions={
          <Button
            variant="outlined"
            startIcon={<DownloadOutlined sx={{ fontSize: 17 }} />}
            onClick={() => setNotice("고객 목록 내보내기는 API 연결 후 활성화됩니다.")}
            sx={{ borderColor: "divider", color: "text.primary", fontSize: adminTextSizes.control }}
          >
            고객 목록 내보내기
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
        {[
          ["전체 고객", "1,248명", "누적 가입 고객"],
          ["이번 달 신규", "96명", "지난달 대비 +8.2%"],
          ["재구매 고객", "28.6%", "지난달 대비 +3.8%"],
        ].map(([label, value, description]) => (
          <Paper key={label} variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 0, borderColor: "divider" }}>
            <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.label }}>{label}</Typography>
            <Typography sx={{ mt: 1.5, fontSize: { xs: 24, md: 29 }, letterSpacing: "-.04em" }}>{value}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, fontSize: adminTextSizes.meta }}>{description}</Typography>
          </Paper>
        ))}
      </Box>

      <Paper variant="outlined" sx={{ minWidth: 0, borderRadius: 0, borderColor: "divider" }}>
        <Box sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
          >
            <Box>
              <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>고객 목록</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                최근 활동 순으로 정리했습니다.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap>
              <TextField
                size="small"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="이름 또는 이메일 검색"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: "text.secondary", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ minWidth: { sm: 230 }, "& .MuiOutlinedInput-root": { borderRadius: 0 }, "& input": { fontSize: adminTextSizes.control } }}
              />
              <FormControl size="small" sx={{ minWidth: { sm: 120 } }}>
                <InputLabel sx={{ fontSize: adminTextSizes.control }}>상태</InputLabel>
                <Select
                  value={status}
                  label="상태"
                  onChange={(event) => setStatus(event.target.value as (typeof customerStatuses)[number])}
                  sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                >
                  {customerStatuses.map((item) => (
                    <MenuItem key={item} value={item} sx={{ fontSize: adminTextSizes.control }}>{item}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>

        <TableContainer sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 800 }} size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f8f4" }}>
                {["고객", "고객 번호", "주문 수", "누적 구매", "최근 주문", "가입일", "상태"].map((heading) => (
                  <TableCell key={heading} sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>{heading}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id} hover>
                  <TableCell sx={{ borderColor: "divider" }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: "#d8e1d6", color: "#426348", fontSize: 10 }}>{customer.name.slice(0, 1)}</Avatar>
                      <Box>
                        <Typography sx={{ fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>{customer.name}</Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>{customer.email}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>{customer.id}</TableCell>
                  <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label }}>{customer.orders}회</TableCell>
                  <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>{currencyFormatter.format(customer.totalSpent)}</TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>{customer.lastOrderAt}</TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>{customer.joinedAt}</TableCell>
                  <TableCell sx={{ borderColor: "divider" }}>
                    <Chip label={customer.status} size="small" sx={{ height: 24, bgcolor: customer.status === "활성" ? "#e6f0e4" : "#ecece7", color: customer.status === "활성" ? "#426348" : "#6b6d66", fontSize: adminTextSizes.meta }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        <Alert onClose={() => setNotice(null)} severity="info" variant="filled" sx={{ fontSize: adminTextSizes.control }}>{notice}</Alert>
      </Snackbar>
    </AdminShell>
  );
}
