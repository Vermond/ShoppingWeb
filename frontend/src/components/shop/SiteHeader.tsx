"use client";

import {
  AccountCircle,
  Close,
  FavoriteBorder,
  LoginOutlined,
  Search,
  ShoppingBagOutlined,
} from "@mui/icons-material";
import {
  Badge,
  IconButton,
  InputAdornment,
  InputBase,
  Tooltip,
} from "@mui/material";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { getCurrentReturnTo, getLoginPath } from "../../utils/auth-redirect";
import styles from "../../app/page.module.css";

const navSections = [
  { id: "new-arrivals", label: "New in" },
  { id: "categories", label: "Shop" },
  { id: "story", label: "Our story" },
] as const;

type SectionId = (typeof navSections)[number]["id"];

type SiteHeaderProps = {
  cartCount: number;
  query: string;
  onQueryChange: (query: string) => void;
  activeSection?: SectionId | null;
};

export function SiteHeader({
  cartCount,
  query,
  onQueryChange,
  activeSection,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const { status } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrollSection, setScrollSection] =
    useState<SectionId>("new-arrivals");
  const headerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateActiveSection = () => {
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 68;
      const threshold = headerHeight + 24;
      let nextSection: SectionId = "new-arrivals";

      for (const { id } of navSections) {
        const section = document.getElementById(id);

        if (section && section.getBoundingClientRect().top <= threshold) {
          nextSection = id;
        }
      }

      setScrollSection((currentSection) =>
        currentSection === nextSection ? currentSection : nextSection,
      );
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus({ preventScroll: true });
    }
  }, [searchOpen]);

  const selectedSection = activeSection === undefined ? scrollSection : activeSection;
  const isHome = pathname === "/";
  const accountHref =
    status === "authenticated" ? "/account" : getLoginPath(pathname);
  const accountLabel = status === "authenticated" ? "내 계정" : "로그인";

  const handleAccountClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      status === "authenticated" ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    window.location.assign(getLoginPath(getCurrentReturnTo(pathname)));
  };

  const closeSearch = () => {
    onQueryChange("");
    setSearchOpen(false);
  };

  return (
    <>
      <header ref={headerRef} className={styles.header}>
        <a
          className={styles.logo}
          href={isHome ? "#top" : "/"}
          aria-label="Morrow 홈으로 이동"
        >
          MORROW<span>.</span>
        </a>

        <nav className={styles.nav} aria-label="주요 메뉴">
          {navSections.map(({ id, label }) => (
            <a
              className={selectedSection === id ? styles.activeNav : undefined}
              href={isHome ? `#${id}` : `/#${id}`}
              aria-current={selectedSection === id ? "location" : undefined}
              key={id}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <Tooltip title={accountLabel} placement="bottom">
            <IconButton
              className={styles.iconButton}
              component="a"
              href={accountHref}
              type="button"
              disableRipple
              aria-label={accountLabel}
              onClick={handleAccountClick}
            >
              {status === "authenticated" ? (
                <AccountCircle />
              ) : (
                <LoginOutlined />
              )}
            </IconButton>
          </Tooltip>
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
            component="a"
            href="/wishlist"
            type="button"
            disableRipple
            aria-label="마음에 든 상품"
          >
            <FavoriteBorder />
          </IconButton>
          <IconButton
            className={styles.cartButton}
            component="a"
            href="/cart"
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
        {searchOpen && (
          <div className={styles.searchRow}>
            <InputBase
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="찾고 싶은 물건을 검색해보세요"
              className={styles.searchInput}
              inputRef={searchInputRef}
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
                    sx={{
                      padding: 0,
                      color: "var(--morrow-palette-text-secondary)",
                    }}
                  >
                    <Close />
                  </IconButton>
                </InputAdornment>
              }
            />
          </div>
        )}
      </header>
    </>
  );
}
