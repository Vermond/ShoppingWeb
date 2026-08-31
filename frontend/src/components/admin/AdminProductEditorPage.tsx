"use client";

import {
  Add,
  ArrowBack,
  DeleteOutlined,
  Save,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AdminCategoryResponse } from "../../repositories/admin-products.server.repository";
import {
  type AdminProductDetailData,
  type AdminProductStatus,
} from "../../data/admin-products";
import { AdminShell, adminTextSizes } from "./AdminShell";

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

const statusOptions: Array<{ value: AdminProductStatus; label: string }> = [
  { value: "draft", label: "임시 저장" },
  { value: "active", label: "판매중" },
  { value: "inactive", label: "판매 중지" },
  { value: "archived", label: "보관" },
];

type ProductFormValues = {
  name: string;
  categoryId: string;
  description: string;
  price: string;
  stock: string;
  maxOrderQuantity: string;
  status: AdminProductStatus;
  imageUrls: string[];
};

type AdminProductEditorPageProps = {
  mode: "create" | "edit";
  initialData: AdminProductDetailData | null;
  categories: AdminCategoryResponse[];
};

function createInitialValues(
  mode: "create" | "edit",
  initialData: AdminProductDetailData | null,
): ProductFormValues {
  if (mode === "edit" && initialData) {
    return {
      name: initialData.name,
      categoryId: initialData.categoryId,
      description: initialData.description ?? "",
      price: initialData.price,
      stock: String(initialData.stock),
      maxOrderQuantity: String(initialData.maxOrderQuantity),
      status: initialData.status,
      imageUrls: initialData.images.map((image) => image.imageUrl),
    };
  }

  return {
    name: "",
    categoryId: "",
    description: "",
    price: "",
    stock: "0",
    maxOrderQuantity: "1",
    status: "draft",
    imageUrls: [],
  };
}

function getErrorMessage(result: unknown): string {
  if (typeof result !== "object" || result === null) {
    return "상품을 저장하지 못했습니다.";
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

  return "상품을 저장하지 못했습니다.";
}

function validateForm(values: ProductFormValues): string | null {
  if (!values.name.trim()) {
    return "상품명을 입력해주세요.";
  }

  if (!values.categoryId) {
    return "카테고리를 선택해주세요.";
  }

  if (!/^\d+(\.\d{1,2})?$/.test(values.price.trim())) {
    return "가격은 0 이상이며 소수점 둘째 자리까지 입력해주세요.";
  }

  const price = Number(values.price);
  const stock = Number(values.stock);
  const maxOrderQuantity = Number(values.maxOrderQuantity);

  if (!Number.isFinite(price) || price < 0) {
    return "가격을 확인해주세요.";
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return "재고는 0 이상의 정수로 입력해주세요.";
  }

  if (!Number.isInteger(maxOrderQuantity) || maxOrderQuantity < 1) {
    return "최대 구매 수량은 1 이상의 정수로 입력해주세요.";
  }

  return null;
}

export function AdminProductEditorPage({
  mode,
  initialData,
  categories,
}: AdminProductEditorPageProps) {
  const router = useRouter();
  const [values, setValues] = useState(() => createInitialValues(mode, initialData));
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);

  const updateValue = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleImageChange = (index: number, value: string) => {
    setValues((current) => ({
      ...current,
      imageUrls: current.imageUrls.map((imageUrl, imageIndex) =>
        imageIndex === index ? value : imageUrl,
      ),
    }));
  };

  const addImage = () => {
    setValues((current) => ({
      ...current,
      imageUrls: [...current.imageUrls, ""],
    }));
  };

  const removeImage = (index: number) => {
    setValues((current) => ({
      ...current,
      imageUrls: current.imageUrls.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validateForm(values);
    if (validationMessage) {
      setNotice({ message: validationMessage, severity: "error" });
      return;
    }

    if (mode === "edit" && !initialData) {
      setNotice({ message: "수정할 상품 정보가 없습니다.", severity: "error" });
      return;
    }

    setIsSaving(true);

    const payload = {
      name: values.name.trim(),
      category_id: values.categoryId,
      description: values.description.trim() || null,
      price: values.price.trim(),
      stock: Number(values.stock),
      max_order_quantity: Number(values.maxOrderQuantity),
      status: values.status,
      images: values.imageUrls
        .map((imageUrl) => imageUrl.trim())
        .filter(Boolean)
        .map((imageUrl, index) => ({ image_url: imageUrl, sort_order: index })),
    };

    try {
      const path =
        mode === "create"
          ? "/api/admin/products"
          : `/api/admin/products/${encodeURIComponent(initialData?.id ?? "")}`;
      const response = await fetch(path, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(result));
      }

      const product =
        typeof result === "object" && result !== null && "product" in result
          ? result.product
          : null;
      const productId =
        typeof product === "object" && product !== null && "id" in product
          ? product.id
          : null;

      if (mode === "create" && typeof productId === "string") {
        router.replace(`/admin/products/${productId}`);
        return;
      }

      setNotice({ message: "상품 정보를 저장했습니다.", severity: "success" });
      router.refresh();
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : "상품을 저장하지 못했습니다.",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const pageTitle = mode === "create" ? "상품 등록" : "상품 수정";
  const pageDescription =
    mode === "create"
      ? "상품 정보를 입력하고 저장하면 기본 상태는 임시 저장으로 등록됩니다."
      : "상품 정보와 판매 상태, 재고를 수정할 수 있습니다.";

  return (
    <AdminShell activePath="/admin/products" pageLabel={pageTitle}>
      <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
        <Button
          component={Link}
          href="/admin/products"
          startIcon={<ArrowBack sx={{ fontSize: 17 }} />}
          sx={{ alignSelf: "flex-start", color: "text.secondary", fontSize: adminTextSizes.control }}
        >
          상품 목록으로 돌아가기
        </Button>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}
        >
          <Box>
            <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.eyebrow, letterSpacing: ".14em", textTransform: "uppercase" }}>
              Catalog
            </Typography>
            <Typography component="h1" sx={{ mt: 1, fontSize: { xs: 28, md: 38 }, lineHeight: 1 }}>
              {pageTitle}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1.25, fontSize: adminTextSizes.body }}>
              {pageDescription}
            </Typography>
          </Box>
          {mode === "edit" && initialData ? (
            <Chip
              label={statusLabels[values.status]}
              sx={{
                alignSelf: { xs: "flex-start", sm: "center" },
                bgcolor: statusStyles[values.status].backgroundColor,
                color: statusStyles[values.status].color,
                fontSize: adminTextSizes.control,
              }}
            />
          ) : null}
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.35fr) minmax(300px, .8fr)" },
            gap: 3,
          }}
        >
          <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 0, borderColor: "divider" }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                  기본 정보
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                  고객에게 노출되는 상품의 기본 내용을 입력하세요.
                </Typography>
              </Box>
              <TextField
                label="상품명"
                value={values.name}
                onChange={(event) => updateValue("name", event.target.value)}
                required
                fullWidth
                size="small"
                sx={{ "& input": { fontSize: adminTextSizes.control } }}
              />
              <FormControl fullWidth size="small" required>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={values.categoryId}
                  label="카테고리"
                  onChange={(event) => updateValue("categoryId", event.target.value)}
                  sx={{ fontSize: adminTextSizes.control }}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id} sx={{ fontSize: adminTextSizes.control }}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="상품 설명"
                value={values.description}
                onChange={(event) => updateValue("description", event.target.value)}
                fullWidth
                multiline
                minRows={7}
                placeholder="상품의 특징과 안내사항을 입력하세요."
                sx={{ "& textarea": { fontSize: adminTextSizes.control, lineHeight: 1.7 } }}
              />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 0, borderColor: "divider" }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                  판매 및 재고
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                  가격은 원화 기준으로 입력합니다.
                </Typography>
              </Box>
              <TextField
                label="판매가"
                value={values.price}
                onChange={(event) => updateValue("price", event.target.value)}
                required
                fullWidth
                size="small"
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
                sx={{ "& input": { fontSize: adminTextSizes.control } }}
              />
              <TextField
                label="재고"
                type="number"
                value={values.stock}
                onChange={(event) => updateValue("stock", event.target.value)}
                required
                fullWidth
                size="small"
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                sx={{ "& input": { fontSize: adminTextSizes.control } }}
              />
              <TextField
                label="최대 구매 수량"
                type="number"
                value={values.maxOrderQuantity}
                onChange={(event) => updateValue("maxOrderQuantity", event.target.value)}
                required
                fullWidth
                size="small"
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                sx={{ "& input": { fontSize: adminTextSizes.control } }}
              />
              <FormControl fullWidth size="small">
                <InputLabel>상품 상태</InputLabel>
                <Select
                  value={values.status}
                  label="상품 상태"
                  onChange={(event) => updateValue("status", event.target.value as AdminProductStatus)}
                  sx={{ fontSize: adminTextSizes.control }}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value} sx={{ fontSize: adminTextSizes.control }}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {mode === "edit" && initialData ? (
                <Stack spacing={0.75} sx={{ pt: 0.5 }}>
                  <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
                    누적 판매량
                  </Typography>
                  <Typography sx={{ fontSize: 22 }}>
                    {initialData.salesQuantity.toLocaleString("ko-KR")}개
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
          </Paper>
        </Box>

        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 0, borderColor: "divider" }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
                  상품 이미지
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
                  이미지 URL을 입력하고 위에서부터 대표 이미지 순서로 저장합니다.
                </Typography>
              </Box>
              <Button
                type="button"
                variant="outlined"
                startIcon={<Add sx={{ fontSize: 17 }} />}
                onClick={addImage}
                sx={{ alignSelf: { xs: "flex-start", sm: "center" }, borderRadius: 0, fontSize: adminTextSizes.control }}
              >
                이미지 추가
              </Button>
            </Stack>
            {values.imageUrls.length > 0 ? (
              <Stack spacing={1.25}>
                {values.imageUrls.map((imageUrl, index) => (
                  <Stack key={`image-${index}`} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography color="text.secondary" sx={{ width: 24, flexShrink: 0, fontSize: adminTextSizes.meta, textAlign: "center" }}>
                      {index + 1}
                    </Typography>
                    <TextField
                      value={imageUrl}
                      onChange={(event) => handleImageChange(index, event.target.value)}
                      placeholder="https://example.com/product-image.png"
                      fullWidth
                      size="small"
                      slotProps={{ htmlInput: { inputMode: "url" } }}
                      sx={{ "& input": { fontSize: adminTextSizes.control } }}
                    />
                    <IconButton
                      type="button"
                      aria-label={`${index + 1}번 이미지 삭제`}
                      onClick={() => removeImage(index)}
                      sx={{ color: "text.secondary" }}
                    >
                      <DeleteOutlined />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ py: 2, fontSize: adminTextSizes.body }}>
                등록된 이미지가 없습니다.
              </Typography>
            )}
          </Stack>
        </Paper>

        {mode === "edit" && initialData ? (
          <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
            생성일 {initialData.createdAt} · 최근 수정일 {initialData.updatedAt}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1.25} sx={{ justifyContent: "flex-end" }}>
          <Button component={Link} href="/admin/products" disabled={isSaving} sx={{ fontSize: adminTextSizes.control }}>
            취소
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSaving}
            startIcon={<Save sx={{ fontSize: 17 }} />}
            sx={{ bgcolor: "primary.main", color: "primary.contrastText", fontSize: adminTextSizes.control, "&:hover": { bgcolor: "secondary.main" } }}
          >
            {isSaving ? "저장 중" : "저장하기"}
          </Button>
        </Stack>
      </Stack>

      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)}>
        <Alert onClose={() => setNotice(null)} severity={notice?.severity ?? "error"} variant="filled" sx={{ fontSize: adminTextSizes.control }}>
          {notice?.message}
        </Alert>
      </Snackbar>
    </AdminShell>
  );
}
