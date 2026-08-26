"use client";

import { Add, Search } from "@mui/icons-material";
import {
  Alert,
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
import type { AdminProductRecord } from "../../data/admin-pages";
import type { ProductCategory } from "../../data/products";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { AdminShell, adminTextSizes } from "./AdminShell";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const categories: Array<"전체" | ProductCategory> = ["전체", "리빙", "패션", "액세서리", "뷰티"];

const statusStyles: Record<AdminProductRecord["status"], { color: string; backgroundColor: string }> = {
  판매중: { color: "#426348", backgroundColor: "#e6f0e4" },
  "재고 부족": { color: "#a15134", backgroundColor: "#f8e8df" },
  "판매 예정": { color: "#8a5d2d", backgroundColor: "#f8eddc" },
};

type AdminProductsPageProps = {
  products: AdminProductRecord[];
};

export function AdminProductsPage({ products }: AdminProductsPageProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("전체");
  const [notice, setNotice] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery = normalizedQuery.length === 0 || product.name.toLowerCase().includes(normalizedQuery);
      const matchesCategory = category === "전체" || product.category === category;

      return matchesQuery && matchesCategory;
    });
  }, [category, products, query]);

  return (
    <AdminShell activePath="/admin/products" pageLabel="상품 관리">
      <AdminSectionHeader
        eyebrow="Catalog"
        title="상품 관리"
        description="상품 정보와 재고 상태를 한 곳에서 관리하세요."
        actions={
          <Button
            variant="contained"
            startIcon={<Add sx={{ fontSize: 17 }} />}
            onClick={() => setNotice("상품 등록 화면은 API 연결 후 활성화됩니다.")}
            sx={{ bgcolor: "primary.main", fontSize: adminTextSizes.control, "&:hover": { bgcolor: "secondary.main" } }}
          >
            상품 등록
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
          ["전체 상품", "24개", "스토어에 등록된 상품"],
          ["판매중", "20개", "정상적으로 판매 중"],
          ["재고 알림", "1개", "확인이 필요한 상품"],
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
              <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>상품 목록</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                현재 등록된 상품 {filteredProducts.length}개를 표시하고 있습니다.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap>
              <TextField
                size="small"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="상품명 검색"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: "text.secondary", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ minWidth: { sm: 220 }, "& .MuiOutlinedInput-root": { borderRadius: 0 }, "& input": { fontSize: adminTextSizes.control } }}
              />
              <FormControl size="small" sx={{ minWidth: { sm: 130 } }}>
                <InputLabel sx={{ fontSize: adminTextSizes.control }}>카테고리</InputLabel>
                <Select
                  value={category}
                  label="카테고리"
                  onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}
                  sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                >
                  {categories.map((item) => (
                    <MenuItem key={item} value={item} sx={{ fontSize: adminTextSizes.control }}>{item}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>

        <TableContainer sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 780 }} size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f8f4" }}>
                {["상품", "카테고리", "판매가", "재고", "판매량", "상태", "수정일"].map((heading) => (
                  <TableCell key={heading} sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell sx={{ borderColor: "divider" }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Box sx={{ width: 38, height: 38, flexShrink: 0, bgcolor: product.color }} />
                      <Typography sx={{ fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>{product.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta }}>{product.category}</TableCell>
                  <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>{currencyFormatter.format(product.price)}</TableCell>
                  <TableCell sx={{ borderColor: "divider", color: product.stock < 10 ? "secondary.main" : "text.primary", fontSize: adminTextSizes.label }}>{product.stock}개</TableCell>
                  <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label }}>{product.sales}개</TableCell>
                  <TableCell sx={{ borderColor: "divider" }}>
                    <Chip label={product.status} size="small" sx={{ height: 24, bgcolor: statusStyles[product.status].backgroundColor, color: statusStyles[product.status].color, fontSize: adminTextSizes.meta }} />
                  </TableCell>
                  <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>{product.updatedAt}</TableCell>
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
