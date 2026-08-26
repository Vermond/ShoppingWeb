"use client";

import { ArrowForward, EditOutlined } from "@mui/icons-material";
import { Button, IconButton } from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "../../components/shop/CartProvider";
import { SiteHeader } from "../../components/shop/SiteHeader";
import styles from "./page.module.css";

export default function AccountPage() {
  const [query, setQuery] = useState("");
  const { totalItems } = useCart();

  return (
    <div className={styles.accountPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />

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
                <h2 id="profile-title">Morrow member</h2>
              </div>
              <IconButton type="button" size="small" disableRipple aria-label="프로필 수정">
                <EditOutlined />
              </IconButton>
            </div>
            <p className={styles.profileEmail}>hello@morrow.mock</p>
            <p className={styles.mockNote}>회원 정보는 서버 연결 전 목업으로 표시됩니다.</p>
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
