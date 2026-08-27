"use client";

import { Tab, Tabs } from "@mui/material";
import type { ProductFilter } from "../../types/catalog";

type ProductFilterTabsProps = {
  filters: ProductFilter[];
  value: ProductFilter;
  onChange: (value: ProductFilter) => void;
  className?: string;
  compact?: boolean;
};

export function ProductFilterTabs({
  filters,
  value,
  onChange,
  className,
  compact = false,
}: ProductFilterTabsProps) {
  return (
    <Tabs
      className={className}
      value={value}
      onChange={(_, nextValue: ProductFilter) => onChange(nextValue)}
      aria-label="상품 카테고리 필터"
      variant="scrollable"
      scrollButtons={false}
      sx={{
        minHeight: 0,
        "& .MuiTabs-list": {
          columnGap: compact
            ? { xs: "22px", sm: "32px" }
            : { xs: "28px", sm: "42px" },
        },
        "& .MuiTabs-indicator": {
          height: "2px",
          backgroundColor: "var(--morrow-palette-text-primary)",
        },
      }}
    >
      {filters.map((filter) => (
        <Tab
          key={filter}
          value={filter}
          label={filter}
          disableRipple
          sx={{
            minHeight: { xs: 44, sm: 48 },
            padding: compact
              ? { xs: "6px 4px 14px", sm: "7px 6px 15px" }
              : { xs: "6px 8px 14px", sm: "7px 10px 15px" },
            color: "var(--morrow-palette-text-secondary)",
            fontSize: { xs: "13px", sm: "14px" },
            fontWeight: 500,
            letterSpacing: compact ? undefined : "-.02em",
            lineHeight: 1.4,
            "&.Mui-selected": {
              color: "var(--morrow-palette-text-primary)",
            },
          }}
        />
      ))}
    </Tabs>
  );
}
