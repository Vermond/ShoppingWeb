"use client";

import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button } from "@mui/material";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "../../../components/shop/CartProvider";
import { SiteHeader } from "../../../components/shop/SiteHeader";
import {
  cancelOrder as requestCancelOrder,
  fetchOrderById,
  type Order,
  type OrderStatus,
} from "../../../repositories/orders.repository";
import { formatPrice } from "../../../utils/format";
import styles from "./page.module.css";

const statusLabels: Record<OrderStatus, string> = {
  pending: "주문 대기",
  paid: "결제 완료",
  shipped: "배송중",
  completed: "배송 완료",
  cancelled: "주문 취소",
};

function formatOrderDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = typeof params.id === "string" ? params.id : "";
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const { totalItems } = useCart();

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let cancelled = false;

    const loadOrder = async () => {
      try {
        const result = await fetchOrderById(orderId);

        if (!cancelled) {
          setOrder(result);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "주문 상세를 불러오지 못했어요.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const handleCancel = async () => {
    if (!order || order.status !== "paid" || isCancelling) {
      return;
    }

    if (!window.confirm("이 주문을 취소할까요?")) {
      return;
    }

    setIsCancelling(true);
    setErrorMessage("");
    setFeedbackMessage("");

    try {
      const result = await requestCancelOrder(order.id);
      setOrder(result);
      setFeedbackMessage("주문이 취소되었어요.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "주문을 취소하지 못했어요.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className={styles.orderPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />

      <main className={styles.orderMain}>
        <Button
          className={styles.backButton}
          component={Link}
          href="/orders"
          startIcon={<ArrowBack />}
          disableRipple
        >
          주문 내역으로 돌아가기
        </Button>

        {!orderId && (
          <p className={styles.message} role="alert">
            주문 번호를 확인할 수 없어요.
          </p>
        )}
        {orderId && isLoading && (
          <p className={styles.message}>주문 상세를 불러오는 중...</p>
        )}
        {orderId && !isLoading && errorMessage && (
          <p className={styles.message} role="alert">
            {errorMessage}
          </p>
        )}

        {orderId && !isLoading && !errorMessage && order && (
          <>
            <section className={styles.orderHero} aria-labelledby="order-title">
              <p className={styles.eyebrow}>Order detail</p>
              <h1 id="order-title">주문 상세.</h1>
              <div className={styles.orderMeta}>
                <span>{order.id}</span>
                <span>{formatOrderDate(order.createdAt)}</span>
                <strong className={styles[order.status]}>
                  {statusLabels[order.status]}
                </strong>
              </div>
            </section>

            <div className={styles.orderLayout}>
              <section className={styles.detailSection} aria-labelledby="items-title">
                <div className={styles.sectionHeading}>
                  <h2 id="items-title">주문 상품</h2>
                  <span>{order.items.length}개 상품</span>
                </div>
                <div className={styles.itemList}>
                  {order.items.map((item) => (
                    <div className={styles.itemRow} key={item.id}>
                      <div>
                        <p>{item.productName}</p>
                        <span>
                          {formatPrice(item.unitPrice)} × {item.quantity}
                        </span>
                      </div>
                      <strong>{formatPrice(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.detailSection} aria-labelledby="address-title">
                <div className={styles.sectionHeading}>
                  <h2 id="address-title">배송지</h2>
                </div>
                <div className={styles.addressInfo}>
                  <p>
                    {order.address.recipientName} · {order.address.phoneNumber}
                  </p>
                  <p>
                    ({order.address.postalCode}) {order.address.addressLine1}
                  </p>
                  {order.address.addressLine2 && (
                    <p>{order.address.addressLine2}</p>
                  )}
                  {order.address.deliveryRequest && (
                    <p className={styles.deliveryRequest}>
                      요청사항: {order.address.deliveryRequest}
                    </p>
                  )}
                </div>
              </section>

              <aside className={styles.summary} aria-labelledby="summary-title">
                <p className={styles.eyebrow}>Payment summary</p>
                <h2 id="summary-title">결제 금액</h2>
                <div className={styles.totalRow}>
                  <span>총 결제 금액</span>
                  <strong>{formatPrice(order.totalAmount)}</strong>
                </div>
                {feedbackMessage && (
                  <p className={styles.successMessage} role="status">
                    {feedbackMessage}
                  </p>
                )}
                {order.status === "paid" && (
                  <Button
                    className={styles.cancelButton}
                    type="button"
                    disableRipple
                    disabled={isCancelling}
                    onClick={handleCancel}
                  >
                    {isCancelling ? "취소 처리 중..." : "주문 취소"}
                  </Button>
                )}
              </aside>
            </div>

            <Button
              component={Link}
              href="/shop"
              disableRipple
              endIcon={<ArrowForward />}
            >
              쇼핑 계속하기
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
