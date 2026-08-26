"use client";

import { DownloadOutlined } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import type { AdminReportData } from "../../data/admin-pages";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { AdminShell, adminTextSizes } from "./AdminShell";

type AdminReportsPageProps = {
  report: AdminReportData;
};

function ReportMetric({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 0, borderColor: "divider" }}>
      <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.label }}>{label}</Typography>
      <Typography sx={{ mt: 1.5, fontSize: { xs: 24, md: 29 }, letterSpacing: "-.04em" }}>{value}</Typography>
      <Typography sx={{ mt: 1, color: "#527455", fontSize: adminTextSizes.meta }}>{change} 지난달 대비</Typography>
    </Paper>
  );
}

export function AdminReportsPage({ report }: AdminReportsPageProps) {
  const [period, setPeriod] = useState("최근 7일");
  const [notice, setNotice] = useState<string | null>(null);
  const maxSales = Math.max(...report.sales.map((point) => point.value));

  return (
    <AdminShell activePath="/admin/reports" pageLabel="리포트">
      <AdminSectionHeader
        eyebrow="Insights"
        title="리포트"
        description="매출과 고객 흐름을 기준으로 다음 선택을 준비하세요."
        actions={
          <Stack direction="row" spacing={1.25} useFlexGap sx={{ alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ fontSize: adminTextSizes.control }}>기간</InputLabel>
              <Select value={period} label="기간" onChange={(event) => setPeriod(event.target.value)} sx={{ borderRadius: 0, fontSize: adminTextSizes.control }}>
                <MenuItem value="최근 7일" sx={{ fontSize: adminTextSizes.control }}>최근 7일</MenuItem>
                <MenuItem value="최근 30일" sx={{ fontSize: adminTextSizes.control }}>최근 30일</MenuItem>
                <MenuItem value="이번 분기" sx={{ fontSize: adminTextSizes.control }}>이번 분기</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<DownloadOutlined sx={{ fontSize: 17 }} />}
              onClick={() => setNotice("리포트 다운로드는 API 연결 후 활성화됩니다.")}
              sx={{ bgcolor: "primary.main", fontSize: adminTextSizes.control, "&:hover": { bgcolor: "secondary.main" } }}
            >
              다운로드
            </Button>
          </Stack>
        }
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, gap: 3, mb: 3 }}>
        {report.summary.map((metric) => <ReportMetric key={metric.label} {...metric} />)}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.45fr) minmax(320px, .8fr)" }, gap: 3 }}>
        <Paper variant="outlined" sx={{ minWidth: 0, borderRadius: 0, borderColor: "divider" }}>
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>매출 추이</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>{period} 기준 주문 매출</Typography>
              </Box>
              <Chip label="만원 단위" size="small" variant="outlined" sx={{ height: 26, borderColor: "divider", fontSize: adminTextSizes.meta }} />
            </Stack>
            <Box sx={{ display: "flex", height: 290, alignItems: "stretch", gap: { xs: 1, sm: 2 }, pt: 4 }}>
              {report.sales.map((point, index) => (
                <Box key={point.label} sx={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "end", gap: 1 }}>
                  <Tooltip title={`${point.value}만원`} arrow>
                    <Box sx={{ width: "100%", maxWidth: 42, height: `${Math.max((point.value / maxSales) * 100, 8)}%`, minHeight: 18, bgcolor: index === report.sales.length - 1 ? "secondary.main" : "#c6d0c3" }} />
                  </Tooltip>
                  <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>{point.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ borderRadius: 0, borderColor: "divider" }}>
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>카테고리별 비중</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>매출 기여도를 비교해보세요.</Typography>
            <Stack spacing={2.5} sx={{ mt: 3.5 }}>
              {report.categories.map((category) => (
                <Box key={category.label}>
                  <Stack direction="row" sx={{ mb: 0.75, justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: adminTextSizes.label }}>{category.label}</Typography>
                    <Typography sx={{ fontSize: adminTextSizes.meta }}>{category.value}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={category.value} sx={{ height: 6, borderRadius: 0, bgcolor: "#eeeee8", "& .MuiLinearProgress-bar": { bgcolor: category.color } }} />
                </Box>
              ))}
            </Stack>
          </Box>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ mt: 3, borderRadius: 0, borderColor: "divider" }}>
        <Box sx={{ p: { xs: 2.5, md: 3 } }}>
          <Typography sx={{ fontSize: adminTextSizes.cardHeading, fontWeight: 500 }}>유입 채널</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: adminTextSizes.meta }}>고객이 Morrow를 만나는 경로입니다.</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 3, mt: 3.5 }}>
            {report.channels.map((channel) => (
              <Box key={channel.label}>
                <Stack direction="row" sx={{ mb: 0.75, justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: adminTextSizes.label }}>{channel.label}</Typography>
                  <Typography sx={{ fontSize: adminTextSizes.meta }}>{channel.value}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={channel.value * 2} sx={{ height: 6, borderRadius: 0, bgcolor: "#eeeee8", "& .MuiLinearProgress-bar": { bgcolor: channel.color } }} />
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice(null)}>
        <Alert onClose={() => setNotice(null)} severity="info" variant="filled" sx={{ fontSize: adminTextSizes.control }}>{notice}</Alert>
      </Snackbar>
    </AdminShell>
  );
}
