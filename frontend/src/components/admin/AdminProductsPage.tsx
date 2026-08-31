"use client";

import { Add, Search } from "@mui/icons-material";
import {
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
import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import {
  type AdminProductListQuery,
  type AdminProductSort,
} from "../../repositories/admin-products.server.repository";
import {
  type AdminProductListItem,
  type AdminProductsData,
  type AdminProductStatus,
} from "../../data/admin-products";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { AdminShell, adminTextSizes } from "./AdminShell";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const statusLabels: Record<AdminProductStatus, string> = {
  active: "판매중",
  inactive: "판매 중지",
  draft: "임시 저장",
  archived: "보관",
};

const statusStyles: Record<
  AdminProductStatus,
  { color: string; backgroundColor: string }
> = {
  active: { color: "#426348", backgroundColor: "#e6f0e4" },
  inactive: { color: "#6b6d66", backgroundColor: "#ecece7" },
  draft: { color: "#8a5d2d", backgroundColor: "#f8eddc" },
  archived: { color: "#8c5142", backgroundColor: "#f8e8df" },
};

const statuses: Array<{ value: AdminProductStatus | ""; label: string }> = [
  { value: "", label: "전체 상태" },
  { value: "active", label: "판매중" },
  { value: "inactive", label: "판매 중지" },
  { value: "draft", label: "임시 저장" },
  { value: "archived", label: "보관" },
];

const sorts: Array<{ value: AdminProductSort; label: string }> = [
  { value: "created_at_desc", label: "최신 등록순" },
  { value: "created_at_asc", label: "오래된 등록순" },
  { value: "price_desc", label: "높은 가격순" },
  { value: "price_asc", label: "낮은 가격순" },
  { value: "stock_asc", label: "재고 적은순" },
  { value: "stock_desc", label: "재고 많은순" },
  { value: "sales_desc", label: "판매량 많은순" },
  { value: "sales_asc", label: "판매량 적은순" },
];

type AdminProductsPageProps = {
  initialData: AdminProductsData;
};

function buildProductsUrl(query: AdminProductListQuery): string {
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.categoryId) params.set("category_id", query.categoryId);
  if (query.status) params.set("status", query.status);
  if (query.lowStockThreshold !== undefined) {
    params.set("low_stock_threshold", String(query.lowStockThreshold));
  }
  if (query.sort && query.sort !== "created_at_desc") {
    params.set("sort", query.sort);
  }
  if (query.page && query.page > 1) params.set("page", String(query.page));

  const queryString = params.toString();
  return queryString ? `/admin/products?${queryString}` : "/admin/products";
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

function ProductImage({ product }: { product: AdminProductListItem }) {
  if (product.representativeImageUrl) {
    return (
      <Box
        component="img"
        src={product.representativeImageUrl}
        alt=""
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          border: "1px solid",
          borderColor: "divider",
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <Avatar
      variant="rounded"
      sx={{
        width: 44,
        height: 44,
        flexShrink: 0,
        bgcolor: "#e4e3dc",
        color: "text.secondary",
        fontSize: 12,
      }}
    >
      상품
    </Avatar>
  );
}

export function AdminProductsPage({ initialData }: AdminProductsPageProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialData.query.search ?? "");
  const [categoryId, setCategoryId] = useState(initialData.query.categoryId ?? "");
  const [status, setStatus] = useState<AdminProductStatus | "">(
    initialData.query.status ?? "",
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initialData.query.lowStockThreshold === undefined
      ? ""
      : String(initialData.query.lowStockThreshold),
  );
  const [sort, setSort] = useState<AdminProductSort>(
    initialData.query.sort ?? "created_at_desc",
  );
  const [isPending, startTransition] = useTransition();

  const navigateToProducts = (nextQuery: AdminProductListQuery) => {
    startTransition(() => {
      router.push(buildProductsUrl(nextQuery));
    });
  };

  const getCurrentQuery = (page = 1): AdminProductListQuery => ({
    search: search.trim() || undefined,
    categoryId: categoryId || undefined,
    status: status || undefined,
    lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : undefined,
    sort,
    page,
  });

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToProducts(getCurrentQuery());
  };

  const handleFilterChange = (filter: Partial<AdminProductListQuery>) => {
    navigateToProducts({ ...getCurrentQuery(), ...filter, page: 1 });
  };

  const handlePageChange = (_event: ChangeEvent<unknown>, page: number) => {
    navigateToProducts(getCurrentQuery(page));
  };

  return (
    <AdminShell activePath="/admin/products" pageLabel="상품 관리">
      <AdminSectionHeader
        eyebrow="Catalog"
        title="상품 관리"
        description="상품 정보와 재고 상태를 한 곳에서 관리하세요."
        actions={
          <Button
            component={Link}
            href="/admin/products/new"
            variant="contained"
            startIcon={<Add sx={{ fontSize: 17 }} />}
            sx={{
              bgcolor: "primary.main",
              color: "var(--morrow-palette-primary-contrastText, #f7f7f3) !important",
              fontSize: adminTextSizes.control,
              "&:hover": {
                bgcolor: "secondary.main",
                color: "var(--morrow-palette-secondary-contrastText, #1f211e) !important",
              },
            }}
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
        <SummaryCard
          label="조회 상품"
          value={`${initialData.totalCount.toLocaleString("ko-KR")}개`}
          description="현재 검색 조건 기준"
        />
        <SummaryCard
          label="판매중"
          value={`${initialData.statusCounts.active.toLocaleString("ko-KR")}개`}
          description="스토어에 공개된 상품"
        />
        <SummaryCard
          label="재고 알림"
          value={`${initialData.lowStockCount.toLocaleString("ko-KR")}개`}
          description="재고 10개 이하 상품"
        />
      </Box>

      <Paper
        variant="outlined"
        sx={{
          minWidth: 0,
          borderRadius: 0,
          borderColor: "divider",
          opacity: isPending ? 0.65 : 1,
          transition: "opacity .2s ease",
        }}
      >
        <Box sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1.5}
            sx={{ alignItems: { xs: "stretch", lg: "center" }, justifyContent: "space-between" }}
          >
            <Box>
              <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                상품 목록
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                전체 상태의 상품을 조회하고 관리할 수 있습니다.
              </Typography>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.25}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              <Box component="form" onSubmit={handleSearchSubmit}>
                <TextField
                  size="small"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
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
                  sx={{
                    minWidth: { sm: 220 },
                    "& .MuiOutlinedInput-root": { borderRadius: 0 },
                    "& input": { fontSize: adminTextSizes.control },
                  }}
                />
              </Box>
              <FormControl size="small" sx={{ minWidth: { sm: 130 } }}>
                <InputLabel sx={{ fontSize: adminTextSizes.control }}>카테고리</InputLabel>
                <Select
                  value={categoryId}
                  label="카테고리"
                  onChange={(event) => {
                    const nextCategoryId = event.target.value;
                    setCategoryId(nextCategoryId);
                    handleFilterChange({ categoryId: nextCategoryId || undefined });
                  }}
                  sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                >
                  <MenuItem value="" sx={{ fontSize: adminTextSizes.control }}>
                    전체 카테고리
                  </MenuItem>
                  {initialData.categories.map((category) => (
                    <MenuItem key={category.id} value={category.id} sx={{ fontSize: adminTextSizes.control }}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { sm: 130 } }}>
                <InputLabel sx={{ fontSize: adminTextSizes.control }}>상태</InputLabel>
                <Select
                  value={status}
                  label="상태"
                  onChange={(event) => {
                    const nextStatus = event.target.value as AdminProductStatus | "";
                    setStatus(nextStatus);
                    handleFilterChange({ status: nextStatus || undefined });
                  }}
                  sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                >
                  {statuses.map((item) => (
                    <MenuItem key={item.value || "all"} value={item.value} sx={{ fontSize: adminTextSizes.control }}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { sm: 130 } }}>
                <InputLabel sx={{ fontSize: adminTextSizes.control }}>재고</InputLabel>
                <Select
                  value={lowStockThreshold}
                  label="재고"
                  onChange={(event) => {
                    const nextThreshold = event.target.value;
                    setLowStockThreshold(nextThreshold);
                    handleFilterChange({
                      lowStockThreshold: nextThreshold ? Number(nextThreshold) : undefined,
                    });
                  }}
                  sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                >
                  <MenuItem value="" sx={{ fontSize: adminTextSizes.control }}>
                    전체 재고
                  </MenuItem>
                  <MenuItem value="10" sx={{ fontSize: adminTextSizes.control }}>
                    10개 이하
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { sm: 140 } }}>
                <InputLabel sx={{ fontSize: adminTextSizes.control }}>정렬</InputLabel>
                <Select
                  value={sort}
                  label="정렬"
                  onChange={(event) => {
                    const nextSort = event.target.value as AdminProductSort;
                    setSort(nextSort);
                    handleFilterChange({ sort: nextSort });
                  }}
                  sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}
                >
                  {sorts.map((item) => (
                    <MenuItem key={item.value} value={item.value} sx={{ fontSize: adminTextSizes.control }}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </Box>

        <TableContainer sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 1120 }} size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f8f4" }}>
                {["상품", "카테고리", "판매가", "재고 / 구매한도", "판매량", "상태", "수정일", "관리"].map(
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
              {initialData.products.length > 0 ? (
                initialData.products.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <ProductImage product={product} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            component={Link}
                            href={`/admin/products/${product.id}`}
                            sx={{
                              display: "block",
                              color: "primary.main",
                              fontSize: adminTextSizes.label,
                              textDecoration: "underline",
                              textUnderlineOffset: 3,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {product.name}
                          </Typography>
                          <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: adminTextSizes.meta }}>
                            ID {product.id}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                      {product.categoryName}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
                      {currencyFormatter.format(product.price)}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <Typography
                        sx={{
                          color: product.stock <= 10 ? "secondary.main" : "text.primary",
                          fontSize: adminTextSizes.label,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {product.stock}개
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.25, fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                        최대 {product.maxOrderQuantity}개
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", fontSize: adminTextSizes.label, whiteSpace: "nowrap" }}>
                      {product.salesQuantity.toLocaleString("ko-KR")}개
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider" }}>
                      <Chip
                        label={statusLabels[product.status]}
                        size="small"
                        sx={{
                          height: 24,
                          bgcolor: statusStyles[product.status].backgroundColor,
                          color: statusStyles[product.status].color,
                          fontSize: adminTextSizes.meta,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", color: "text.secondary", fontSize: adminTextSizes.meta, whiteSpace: "nowrap" }}>
                      {product.updatedAt}
                    </TableCell>
                    <TableCell sx={{ borderColor: "divider", whiteSpace: "nowrap" }}>
                      <Button
                        component={Link}
                        href={`/admin/products/${product.id}`}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 0, fontSize: adminTextSizes.meta }}
                      >
                        상세·수정
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 6, borderColor: "divider", textAlign: "center" }}>
                    <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.body }}>
                      조건에 맞는 상품이 없습니다.
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
    </AdminShell>
  );
}
