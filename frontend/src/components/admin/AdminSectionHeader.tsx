import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { adminTextSizes } from "./AdminShell";

type AdminSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function AdminSectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: AdminSectionHeaderProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{
        mb: { xs: 3, md: 4 },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
      }}
    >
      <Box>
        <Typography
          color="text.secondary"
          sx={{
            fontSize: adminTextSizes.eyebrow,
            letterSpacing: ".14em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </Typography>
        <Typography component="h1" sx={{ mt: 1, fontSize: { xs: 31, md: 42 }, lineHeight: 1 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: adminTextSizes.body }}>
          {description}
        </Typography>
      </Box>
      {actions}
    </Stack>
  );
}
