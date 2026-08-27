"use client";

import { ArrowForward, EditOutlined } from "@mui/icons-material";
import { Button, IconButton } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../components/auth/AuthProvider";
import { useCart } from "../../components/shop/CartProvider";
import { SiteHeader } from "../../components/shop/SiteHeader";
import styles from "./page.module.css";

export default function AccountPage() {
  const router = useRouter();
  const { user, status, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { totalItems } = useCart();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "로그아웃하지 못했어요.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const siteHeader = (
    <SiteHeader
      activeSection={null}
      cartCount={totalItems}
      query={query}
      onQueryChange={setQuery}
    />
  );

  if (status !== "authenticated" || !user) {
    return (
      <div className={styles.accountPage}>
        {siteHeader}
        {status === "loading" && (
          <main className={styles.accountMain}>
            <p className={styles.loadingMessage}>
              로그인 정보를 확인하는 중...
            </p>
          </main>
        )}
      </div>
    );
  }

  return (
    <div className={styles.accountPage}>
      {siteHeader}

      <main className={styles.accountMain}>
        <section className={styles.accountHero} aria-labelledby="account-title">
          <p className={styles.eyebrow}>My Morrow</p>
          <h1 id="account-title">나의 공간.</h1>
          <p>좋아하는 물건과 주문을 한 곳에서 천천히 관리하세요.</p>
        </section>

        <div className={styles.accountLayout}>
          <section className={styles.profileCard} aria-labelledby="profile-title">
            <div className={styles.profileHeader}>
              <div>
                <p className={styles.eyebrow}>Profile</p>
                <h2 id="profile-title">{user.name}</h2>
              </div>
              <IconButton type="button" size="small" disableRipple aria-label="프로필 수정">
                <EditOutlined />
              </IconButton>
            </div>
            <p className={styles.profileEmail}>{user.email}</p>
            <Button
              className={styles.continueButton}
              type="button"
              disableRipple
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
            </Button>
            {logoutError && (
              <p className={styles.errorMessage} role="alert">
                {logoutError}
              </p>
            )}
          </section>

          <section className={styles.accountLinks} aria-label="계정 메뉴">
            <Link href="/orders">
              <span>
                <small>01</small>
                주문 내역
              </span>
              <ArrowForward />
            </Link>
            <Link href="/wishlist">
              <span>
                <small>02</small>
                마음에 둔 상품
              </span>
              <ArrowForward />
            </Link>
            <Link href="/shipping-returns">
              <span>
                <small>03</small>
                배송지·교환 안내
              </span>
              <ArrowForward />
            </Link>
          </section>
        </div>

        <Button
          className={styles.continueButton}
          component={Link}
          href="/shop"
          disableRipple
          endIcon={<ArrowForward />}
        >
          쇼핑 계속하기
        </Button>
      </main>
    </div>
  );
}
