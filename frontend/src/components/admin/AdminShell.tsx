"use client";

import Link from "next/link";
import {
  AssessmentOutlined,
  ChevronRight,
  DashboardOutlined,
  Inventory2Outlined,
  Menu,
  NotificationsNoneOutlined,
  PeopleAltOutlined,
  SettingsOutlined,
  ShoppingBagOutlined,
} from "@mui/icons-material";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  AppBar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState, type ReactNode } from "react";

export const adminTextSizes = {
  cardHeading: 16,
  eyebrow: 11,
  label: 12,
  body: 13,
  meta: 11,
  control: 12,
} as const;

export type AdminPath =
  | "/admin"
  | "/admin/orders"
  | "/admin/products"
  | "/admin/customers"
  | "/admin/reports"
  | "/admin/settings";

const drawerWidth = 240;

const navItems: Array<{
  label: string;
  href: AdminPath;
  icon: ReactNode;
  count?: string;
}> = [
  { label: "대시보드", href: "/admin", icon: <DashboardOutlined /> },
  {
    label: "주문 관리",
    href: "/admin/orders",
    icon: <ShoppingBagOutlined />,
    count: "12",
  },
  { label: "상품 관리", href: "/admin/products", icon: <Inventory2Outlined /> },
  { label: "고객 관리", href: "/admin/customers", icon: <PeopleAltOutlined /> },
  { label: "리포트", href: "/admin/reports", icon: <AssessmentOutlined /> },
];

const secondaryNavItems: Array<{
  label: string;
  href: AdminPath;
  icon: ReactNode;
}> = [{ label: "설정", href: "/admin/settings", icon: <SettingsOutlined /> }];

type SidebarProps = {
  activePath: AdminPath;
  onNavigate: () => void;
};

function Sidebar({ activePath, onNavigate }: SidebarProps) {
  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        bgcolor: "primary.main",
        color: "primary.contrastText",
      }}
    >
      <Box sx={{ px: 3, py: 4 }}>
        <Typography
          component={Link}
          href="/admin"
          onClick={onNavigate}
          sx={{
            display: "inline-block",
            color: "inherit",
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: "-.09em",
          }}
        >
          MORROW<span style={{ color: "#df6d45" }}>.</span>
        </Typography>
        <Typography
          sx={{
            mt: 0.75,
            color: "rgba(247, 247, 243, .55)",
            fontSize: adminTextSizes.meta,
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          Studio admin
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(247, 247, 243, .12)" }} />

      <List sx={{ px: 1.5, py: 2 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.href}
            component={Link}
            href={item.href}
            onClick={onNavigate}
            selected={activePath === item.href}
            sx={{
              minHeight: 46,
              borderRadius: 0,
              color: "rgba(247, 247, 243, .68)",
              "& .MuiListItemIcon-root": {
                minWidth: 38,
                color: "inherit",
              },
              "& .MuiSvgIcon-root": { fontSize: 20 },
              "&.Mui-selected": {
                bgcolor: "rgba(247, 247, 243, .12)",
                color: "primary.contrastText",
              },
              "&.Mui-selected:hover": {
                bgcolor: "rgba(247, 247, 243, .16)",
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { sx: { fontSize: adminTextSizes.label } } }}
            />
            {item.count && (
              <Typography
                sx={{
                  minWidth: 22,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 3,
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                  fontSize: adminTextSizes.meta,
                  textAlign: "center",
                }}
              >
                {item.count}
              </Typography>
            )}
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ mx: 2, borderColor: "rgba(247, 247, 243, .12)" }} />

      <List sx={{ px: 1.5, py: 2 }}>
        {secondaryNavItems.map((item) => (
          <ListItemButton
            key={item.href}
            component={Link}
            href={item.href}
            onClick={onNavigate}
            selected={activePath === item.href}
            sx={{
              minHeight: 46,
              borderRadius: 0,
              color: "rgba(247, 247, 243, .68)",
              "& .MuiListItemIcon-root": {
                minWidth: 38,
                color: "inherit",
              },
              "& .MuiSvgIcon-root": { fontSize: 20 },
              "&.Mui-selected": {
                bgcolor: "rgba(247, 247, 243, .12)",
                color: "primary.contrastText",
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { sx: { fontSize: adminTextSizes.label } } }}
            />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ mt: "auto", p: 2.5 }}>
        <Box
          sx={{
            p: 2,
            border: "1px solid rgba(247, 247, 243, .14)",
            bgcolor: "rgba(247, 247, 243, .06)",
          }}
        >
          <Typography sx={{ fontSize: adminTextSizes.label, fontWeight: 500 }}>
            오늘의 운영 노트
          </Typography>
          <Typography
            sx={{
              mt: 1,
              color: "rgba(247, 247, 243, .58)",
              fontSize: adminTextSizes.meta,
              lineHeight: 1.6,
            }}
          >
            재고가 10개 미만인 상품이 1개 있어요.
          </Typography>
          <Button
            component={Link}
            href="/admin/products"
            onClick={onNavigate}
            endIcon={<ChevronRight sx={{ fontSize: 15 }} />}
            sx={{
              mt: 1.5,
              minHeight: 0,
              p: 0,
              color: "secondary.main",
              fontSize: adminTextSizes.meta,
            }}
          >
            재고 확인하기
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

type AdminShellProps = {
  activePath: AdminPath;
  pageLabel: string;
  children: ReactNode;
};

export function AdminShell({ activePath, pageLabel, children }: AdminShellProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f1f2ed" }}>
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            border: 0,
            borderRight: "1px solid rgba(247, 247, 243, .12)",
          },
        }}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} activePath={activePath} />
      </Drawer>

      <Box component="main" sx={{ minWidth: 0, flex: 1 }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}
        >
          <Toolbar sx={{ minHeight: { xs: 64, md: 76 }, px: { xs: 2, md: 4, lg: 6 } }}>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} edge="start" sx={{ mr: 1 }}>
                <Menu />
              </IconButton>
            )}
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography color="text.secondary" sx={{ fontSize: adminTextSizes.meta }}>
                Morrow Studio
              </Typography>
              <ChevronRight sx={{ color: "text.secondary", fontSize: 14 }} />
              <Typography sx={{ fontSize: adminTextSizes.label, fontWeight: 500 }}>
                {pageLabel}
              </Typography>
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Stack
              direction="row"
              spacing={{ xs: 1, md: 1.5 }}
              useFlexGap
              sx={{ alignItems: "center" }}
            >
              <Tooltip title="알림">
                <IconButton aria-label="알림" sx={{ width: 40, height: 40 }}>
                  <Badge badgeContent={3} color="secondary" overlap="circular">
                    <NotificationsNoneOutlined />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "#d8e1d6",
                  color: "#426348",
                  fontSize: 11,
                }}
              >
                MS
              </Avatar>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box sx={{ maxWidth: 1600, mx: "auto", p: { xs: 2, sm: 3, md: 5, lg: 7 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
