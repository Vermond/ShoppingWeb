"use client";

import { ArrowForward } from "@mui/icons-material";
import { Button } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../../components/shop/CartProvider";
import { SiteHeader } from "../../components/shop/SiteHeader";
import {
  fetchOrders,
  type OrderSummary,
} from "../../repositories/orders.repository";
import styles from "../account/page.module.css";

const statusClass: Record<OrderSummary["status"], string> = {
  "결제 완료": styles.paymentComplete,
  "상품 준비중": styles.preparing,
  배송중: styles.shipping,
  "배송 완료": styles.delivered,
};

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

export default function OrdersPage() {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { totalItems } = useCart();

  useEffect(() => {
    let cancelled = false;
    const loadOrders = async () => {
      try {
        const result = await fetchOrders();
        if (!cancelled) {
          setOrders(result);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "주문 내역을 불러오지 못했어요.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const loadId = window.setTimeout(loadOrders, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(loadId);
    };
  }, []);

  return (
    <div className={styles.accountPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />

      <main className={styles.accountMain}>
        <section className={styles.accountHero} aria-labelledby="orders-title">
          <p className={styles.eyebrow}>Your history</p>
          <h1 id="orders-title">주문 내역.</h1>
          <p>지나온 선택도 오래 기억할 수 있도록 모아두었어요.</p>
        </section>

        <section className={styles.ordersSection} aria-label="주문 목록">
          {isLoading && <p className={styles.loadingMessage}>주문 내역을 불러오는 중...</p>}
          {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
          {!isLoading && !errorMessage && orders.length === 0 && (
            <div className={styles.emptyOrders}>
              아직 주문 내역이 없어요.
              <Button component={Link} href="/shop" endIcon={<ArrowForward />}>
                상품 둘러보기
              </Button>
            </div>
          )}
          {!isLoading && !errorMessage && orders.length > 0 && (
            <div className={styles.orderList}>
              {orders.map((order) => (
                <article className={styles.orderCard} key={order.id}>
                  <div>
                    <p>{order.createdAt}</p>
                    <h2>{order.id}</h2>
                  </div>
                  <div className={styles.orderCardMeta}>
                    <span className={statusClass[order.status]}>{order.status}</span>
                    <strong>{formatPrice(order.total)}</strong>
                    <small>{order.itemCount}개 상품</small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <p className={styles.mockNote}>주문 내역은 API 연결 전 목업 데이터입니다.</p>
      </main>
    </div>
  );
}
