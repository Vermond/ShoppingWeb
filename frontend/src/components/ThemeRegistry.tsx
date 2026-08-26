"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { CssVarsProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { theme } from "../theme";

type ThemeRegistryProps = {
  children: ReactNode;
};

export function ThemeRegistry({ children }: ThemeRegistryProps) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <CssVarsProvider theme={theme} defaultMode="light">
        {children}
      </CssVarsProvider>
    </AppRouterCacheProvider>
  );
}
