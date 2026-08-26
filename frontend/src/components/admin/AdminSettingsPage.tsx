"use client";

import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import type { AdminSettingsData } from "../../data/admin-pages";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { AdminShell, adminTextSizes } from "./AdminShell";

type AdminSettingsPageProps = {
  settings: AdminSettingsData;
};

export function AdminSettingsPage({ settings }: AdminSettingsPageProps) {
  const [storeName, setStoreName] = useState(settings.storeName);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [orderNotifications, setOrderNotifications] = useState(settings.orderNotifications);
  const [lowStockNotifications, setLowStockNotifications] = useState(settings.lowStockNotifications);
  const [newsletterNotifications, setNewsletterNotifications] = useState(settings.newsletterNotifications);
  const [defaultShippingFee, setDefaultShippingFee] = useState(String(settings.defaultShippingFee));
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(String(settings.freeShippingThreshold));
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <AdminShell activePath="/admin/settings" pageLabel="설정">
      <AdminSectionHeader
        eyebrow="Workspace"
        title="설정"
        description="스토어 운영에 필요한 기본값과 알림을 관리하세요."
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.2fr) minmax(320px, .8fr)" }, gap: 3 }}>
        <Paper variant="outlined" sx={{ borderRadius: 0, borderColor: "divider" }}>
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>스토어 기본 정보</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
              고객에게 표시되는 정보를 설정합니다.
            </Typography>
            <Stack spacing={2.5} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="스토어 이름"
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                size="small"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0 }, "& input": { fontSize: adminTextSizes.control } }}
              />
              <TextField
                fullWidth
                label="고객 지원 이메일"
                type="email"
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
                size="small"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0 }, "& input": { fontSize: adminTextSizes.control } }}
              />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
                <TextField
                  label="기본 배송비"
                  type="number"
                  value={defaultShippingFee}
                  onChange={(event) => setDefaultShippingFee(event.target.value)}
                  size="small"
                  slotProps={{ htmlInput: { min: 0, step: 500 } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0 }, "& input": { fontSize: adminTextSizes.control } }}
                />
                <TextField
                  label="무료 배송 기준 금액"
                  type="number"
                  value={freeShippingThreshold}
                  onChange={(event) => setFreeShippingThreshold(event.target.value)}
                  size="small"
                  slotProps={{ htmlInput: { min: 0, step: 1000 } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 0 }, "& input": { fontSize: adminTextSizes.control } }}
                />
              </Box>
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ display: "flex", justifyContent: "flex-end", p: { xs: 2.5, md: 3 } }}>
            <Button
              variant="contained"
              onClick={() => setNotice("설정 저장은 API 연결 후 반영됩니다.")}
              sx={{ bgcolor: "primary.main", fontSize: adminTextSizes.control, "&:hover": { bgcolor: "secondary.main" } }}
            >
              변경사항 저장
            </Button>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 0, borderColor: "divider" }}>
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>알림 설정</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>
              운영에 필요한 알림만 선택해서 받아보세요.
            </Typography>
            <Stack divider={<Divider flexItem />} sx={{ mt: 3 }}>
              <Stack direction="row" sx={{ py: 1.75, alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ pr: 2 }}>
                  <Typography sx={{ fontSize: adminTextSizes.label }}>새 주문 알림</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>주문이 접수되면 알려드려요.</Typography>
                </Box>
                <FormControlLabel
                  label=""
                  control={<Switch checked={orderNotifications} onChange={(event) => setOrderNotifications(event.target.checked)} color="secondary" />}
                  sx={{ m: 0 }}
                />
              </Stack>
              <Stack direction="row" sx={{ py: 1.75, alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ pr: 2 }}>
                  <Typography sx={{ fontSize: adminTextSizes.label }}>재고 부족 알림</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>재고가 10개 미만이면 알려드려요.</Typography>
                </Box>
                <FormControlLabel
                  label=""
                  control={<Switch checked={lowStockNotifications} onChange={(event) => setLowStockNotifications(event.target.checked)} color="secondary" />}
                  sx={{ m: 0 }}
                />
              </Stack>
              <Stack direction="row" sx={{ py: 1.75, alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ pr: 2 }}>
                  <Typography sx={{ fontSize: adminTextSizes.label }}>뉴스레터 알림</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>콘텐츠 발송 결과를 알려드려요.</Typography>
                </Box>
                <FormControlLabel
                  label=""
                  control={<Switch checked={newsletterNotifications} onChange={(event) => setNewsletterNotifications(event.target.checked)} color="secondary" />}
                  sx={{ m: 0 }}
                />
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Box>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        <Alert onClose={() => setNotice(null)} severity="info" variant="filled" sx={{ fontSize: adminTextSizes.control }}>{notice}</Alert>
      </Snackbar>
    </AdminShell>
  );
}
