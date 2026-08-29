"use client";

import { ArrowForward } from "@mui/icons-material";
import { Button } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../../components/shop/CartProvider";
import { SiteHeader } from "../../components/shop/SiteHeader";
import {
  fetchOrders,
  type OrderListItem,
  type OrderStatus,
} from "../../repositories/orders.repository";
import { formatPrice } from "../../utils/format";
import styles from "../account/page.module.css";

const statusLabels: Record<OrderStatus, string> = {
  pending: "주문 대기",
  paid: "결제 완료",
  shipped: "배송중",
  completed: "배송 완료",
  cancelled: "주문 취소",
};

const statusClass: Record<OrderStatus, string> = {
  pending: styles.pending,
  paid: styles.paid,
  shipped: styles.shipped,
  completed: styles.completed,
  cancelled: styles.cancelled,
};

function formatOrderDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(date);
}

export default function OrdersPage() {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
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

    void loadOrders();

    return () => {
      cancelled = true;
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
          {isLoading && (
            <p className={styles.loadingMessage}>
              주문 내역을 불러오는 중...
            </p>
          )}
          {errorMessage && (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          )}
          {!isLoading && !errorMessage && orders.length === 0 && (
            <div className={styles.emptyOrders}>
              <p>아직 주문 내역이 없어요.</p>
              <Button
                component={Link}
                href="/shop"
                endIcon={<ArrowForward />}
              >
                상품 둘러보기
              </Button>
            </div>
          )}
          {!isLoading && !errorMessage && orders.length > 0 && (
            <div className={styles.orderList}>
              {orders.map((order) => (
                <Link
                  className={styles.orderCard}
                  href={`/orders/${encodeURIComponent(order.id)}`}
                  key={order.id}
                >
                  <div>
                    <p>{formatOrderDate(order.createdAt)}</p>
                    <h2>{order.id}</h2>
                  </div>
                  <div className={styles.orderCardMeta}>
                    <span className={statusClass[order.status]}>
                      {statusLabels[order.status]}
                    </span>
                    <strong>{formatPrice(order.totalAmount)}</strong>
                    <small>상세 보기</small>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
