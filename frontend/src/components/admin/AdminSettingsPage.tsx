"use client";

import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AdminSettingsData } from "../../data/admin-settings";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { AdminShell, adminTextSizes } from "./AdminShell";

type AdminSettingsPageProps = {
  settings: AdminSettingsData;
};

type Notice = {
  message: string;
  severity: "success" | "error";
};

const MAX_MONEY_VALUE = 9999999999.99;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(result: unknown): string {
  if (!isRecord(result)) {
    return "배송 설정을 저장하지 못했습니다.";
  }

  if (typeof result.message === "string") {
    return result.message;
  }

  if (Array.isArray(result.message)) {
    const messages = result.message.filter(
      (message): message is string => typeof message === "string",
    );

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  if (typeof result.error === "string") {
    return result.error;
  }

  return "배송 설정을 저장하지 못했습니다.";
}

function normalizeMoney(value: string, label: string): string {
  const trimmedValue = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(trimmedValue)) {
    throw new Error(`${label}는 0 이상이며 소수점 둘째 자리까지 입력해주세요.`);
  }

  const amount = Number(trimmedValue);

  if (!Number.isFinite(amount) || amount > MAX_MONEY_VALUE) {
    throw new Error(`${label} 금액을 확인해주세요.`);
  }

  return amount.toFixed(2);
}

function formatMoneyForInput(value: string): string {
  const [integerPart, decimalPart] = value.split(".");

  if (!decimalPart) {
    return value;
  }

  const trimmedDecimalPart = decimalPart.replace(/0+$/, "");
  return trimmedDecimalPart
    ? `${integerPart}.${trimmedDecimalPart}`
    : integerPart;
}

function readUpdatedSettings(result: unknown): {
  baseFee: string;
  freeThreshold: string;
} | null {
  if (!isRecord(result) || !isRecord(result.shipping_policy)) {
    return null;
  }

  const policy = result.shipping_policy;

  if (
    typeof policy.base_fee !== "string" ||
    typeof policy.free_threshold !== "string"
  ) {
    return null;
  }

  return {
    baseFee: policy.base_fee,
    freeThreshold: policy.free_threshold,
  };
}

export function AdminSettingsPage({ settings }: AdminSettingsPageProps) {
  const router = useRouter();
  const [baseFee, setBaseFee] = useState(() =>
    formatMoneyForInput(settings.baseFee),
  );
  const [freeThreshold, setFreeThreshold] = useState(() =>
    formatMoneyForInput(settings.freeThreshold),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let normalizedBaseFee: string;
    let normalizedFreeThreshold: string;

    try {
      normalizedBaseFee = normalizeMoney(baseFee, "기본 배송비");
      normalizedFreeThreshold = normalizeMoney(
        freeThreshold,
        "무료 배송 기준 금액",
      );
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : "배송 설정 입력값을 확인해주세요.",
        severity: "error",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          base_fee: normalizedBaseFee,
          free_threshold: normalizedFreeThreshold,
        }),
      });
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(result));
      }

      const updatedSettings = readUpdatedSettings(result);

      if (!updatedSettings) {
        throw new Error("배송 설정 응답을 확인하지 못했습니다.");
      }

      setBaseFee(formatMoneyForInput(updatedSettings.baseFee));
      setFreeThreshold(formatMoneyForInput(updatedSettings.freeThreshold));
      setNotice({ message: "배송 설정을 저장했습니다.", severity: "success" });
      router.refresh();
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : "배송 설정을 저장하지 못했습니다.",
        severity: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell activePath="/admin/settings" pageLabel="설정">
      <AdminSectionHeader
        eyebrow="Workspace"
        title="설정"
        description="배송 운영에 필요한 기본값을 관리하세요."
      />

      <Paper
        component="form"
        onSubmit={handleSubmit}
        variant="outlined"
        sx={{ borderRadius: 0, borderColor: "divider" }}
      >
        <Box sx={{ p: { xs: 2.5, md: 3 } }}>
          <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>
            배송 설정
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
            주문에 적용할 배송비와 무료 배송 기준 금액을 설정합니다.
          </Typography>
          <Box
            sx={{
              mt: 3,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 2.5,
            }}
          >
            <TextField
              fullWidth
              label="기본 배송비"
              type="number"
              value={baseFee}
              onChange={(event) => setBaseFee(event.target.value)}
              size="small"
              slotProps={{ htmlInput: { min: 0, step: 500 } }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 0 },
                "& input": { fontSize: adminTextSizes.control },
              }}
            />
            <TextField
              fullWidth
              label="무료 배송 기준 금액"
              type="number"
              value={freeThreshold}
              onChange={(event) => setFreeThreshold(event.target.value)}
              size="small"
              slotProps={{ htmlInput: { min: 0, step: 1000 } }}
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: 0 },
                "& input": { fontSize: adminTextSizes.control },
              }}
            />
          </Box>
        </Box>
        <Divider />
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            p: { xs: 2.5, md: 3 },
          }}
        >
          <Button
            type="submit"
            variant="contained"
            disabled={isSaving}
            sx={{
              bgcolor: "primary.main",
              fontSize: adminTextSizes.control,
              "&:hover": { bgcolor: "secondary.main" },
            }}
          >
            {isSaving ? "저장 중" : "변경사항 저장"}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
      >
        <Alert
          onClose={() => setNotice(null)}
          severity={notice?.severity ?? "error"}
          variant="filled"
          sx={{ fontSize: adminTextSizes.control }}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </AdminShell>
  );
}
