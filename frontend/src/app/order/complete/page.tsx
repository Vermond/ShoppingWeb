"use client";

import { ArrowForward, Check } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useCart } from "../../../components/shop/CartProvider";
import { SiteHeader } from "../../../components/shop/SiteHeader";
import styles from "./page.module.css";

function OrderCompleteContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const { totalItems } = useCart();
  const orderId = searchParams.get("orderId") ?? "MORROW-MOCK";

  return (
    <div className={styles.completePage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />
      <main className={styles.completeMain}>
        <div className={styles.completeMark}>
          <Check />
        </div>
        <p className={styles.eyebrow}>A good choice</p>
        <h1>주문이 완료되었어요.</h1>
        <p className={styles.description}>
          선택한 물건이 곧 새로운 자리를 찾아갑니다.
          <br />
          주문 번호를 확인해주세요.
        </p>
        <div className={styles.orderNumber}>
          <span>주문 번호</span>
          <strong>{orderId}</strong>
        </div>
        <div className={styles.actions}>
          <Button
            component="a"
            href="/"
            variant="contained"
            disableRipple
            endIcon={<ArrowForward />}
          >
            홈으로 돌아가기
          </Button>
          <Button component="a" href="/orders" disableRipple>
            주문 내역 보기
          </Button>
        </div>
        <p className={styles.mockNote}>
          결제 승인은 현재 서버의 목업 결제로 처리됩니다.
        </p>
      </main>
    </div>
  );
}

export default function OrderCompletePage() {
  return (
    <Suspense fallback={null}>
      <OrderCompleteContent />
    </Suspense>
  );
}
