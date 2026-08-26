"use client";

import {
  Close,
  FavoriteBorder,
  Search,
  ShoppingBagOutlined,
} from "@mui/icons-material";
import {
  Badge,
  IconButton,
  InputAdornment,
  InputBase,
} from "@mui/material";
import { useState } from "react";
import styles from "../../app/page.module.css";

type SiteHeaderProps = {
  cartCount: number;
  query: string;
  onQueryChange: (query: string) => void;
};

export function SiteHeader({ cartCount, query, onQueryChange }: SiteHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const closeSearch = () => {
    onQueryChange("");
    setSearchOpen(false);
  };

  return (
    <>
      <header className={styles.header}>
        <a className={styles.logo} href="#top" aria-label="Morrow 홈으로 이동">
          MORROW<span>.</span>
        </a>

        <nav className={styles.nav} aria-label="주요 메뉴">
          <a className={styles.activeNav} href="#new-arrivals">
            New in
          </a>
          <a href="#categories">Shop</a>
          <a href="#story">Our story</a>
        </nav>

        <div className={styles.headerActions}>
          <IconButton
            className={styles.iconButton}
            type="button"
            disableRipple
            aria-label={searchOpen ? "검색 닫기" : "검색 열기"}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <Search />
          </IconButton>
          <IconButton
            className={styles.iconButton}
            type="button"
            disableRipple
            aria-label="마음에 든 상품"
          >
            <FavoriteBorder />
          </IconButton>
          <IconButton
            className={styles.cartButton}
            type="button"
            disableRipple
            aria-label={`장바구니, ${cartCount}개 상품`}
          >
            <Badge
              badgeContent={cartCount.toString().padStart(2, "0")}
              showZero
              sx={{
                "& .MuiBadge-badge": {
                  position: "static",
                  transform: "none",
                  minWidth: "auto",
                  height: "auto",
                  marginLeft: 1.75,
                  padding: 0,
                  borderRadius: 0,
                  backgroundColor: "transparent",
                  color: "inherit",
                  fontFamily: "inherit",
                  fontSize: "10px",
                  lineHeight: 1,
                },
              }}
            >
              <ShoppingBagOutlined />
            </Badge>
          </IconButton>
        </div>
      </header>

      {searchOpen && (
        <div className={styles.searchRow}>
          <InputBase
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="찾고 싶은 물건을 검색해보세요"
            className={styles.searchInput}
            inputProps={{ "aria-label": "상품 검색" }}
            startAdornment={
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            }
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  type="button"
                  size="small"
                  disableRipple
                  onClick={closeSearch}
                  aria-label="검색 닫기"
                  sx={{ padding: 0, color: "var(--morrow-palette-text-secondary)" }}
                >
                  <Close />
                </IconButton>
              </InputAdornment>
            }
          />
        </div>
      )}
    </>
  );
}
