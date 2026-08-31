"use client";

import { ArrowForward, Check } from "@mui/icons-material";
import { Button } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCart } from "../../../components/shop/CartProvider";
import { SiteHeader } from "../../../components/shop/SiteHeader";
import {
  fetchOrderById,
  type Order,
} from "../../../repositories/orders.repository";
import { AuthRequestError } from "../../../repositories/auth.repository";
import styles from "./page.module.css";

type OrderCompleteState =
  | "loading"
  | "success"
  | "missing"
  | "notFound"
  | "unauthenticated"
  | "error";

type OrderRequestState = Exclude<OrderCompleteState, "missing">;
type UnavailableOrderState = Exclude<OrderCompleteState, "success">;

function OrderCompleteContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId")?.trim() ?? "";
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);
  const [requestState, setRequestState] =
    useState<OrderRequestState>("loading");
  const { totalItems } = useCart();

  useEffect(() => {
    let active = true;

    if (!orderId) {
      return () => {
        active = false;
      };
    }

    const loadOrder = async () => {
      try {
        const result = await fetchOrderById(orderId);

        if (active) {
          setOrder(result);
          setLoadedOrderId(orderId);
          setRequestState("success");
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setOrder(null);
        setLoadedOrderId(orderId);

        if (error instanceof AuthRequestError && error.status === 404) {
          setRequestState("notFound");
        } else if (
          error instanceof AuthRequestError &&
          error.status === 401
        ) {
          setRequestState("unauthenticated");
        } else {
          setRequestState("error");
        }
      }
    };

    void loadOrder();

    return () => {
      active = false;
    };
  }, [orderId]);

  const state: OrderCompleteState = !orderId
    ? "missing"
    : loadedOrderId === orderId
      ? requestState
      : "loading";
  const unavailableState: UnavailableOrderState =
    state === "success" ? "error" : state;

  const unavailableContent = {
    loading: {
      eyebrow: "Checking your order",
      title: "주문 정보를 확인하고 있어요.",
      description: "잠시만 기다려주세요.",
    },
    missing: {
      eyebrow: "Order unavailable",
      title: "주문 정보를 확인할 수 없어요.",
      description: "주문 내역에서 실제 주문을 확인해주세요.",
    },
    notFound: {
      eyebrow: "Order unavailable",
      title: "주문을 찾을 수 없어요.",
      description: "주문 번호가 없거나 더 이상 확인할 수 없는 주문입니다.",
    },
    unauthenticated: {
      eyebrow: "Sign in required",
      title: "로그인 후 주문을 확인해주세요.",
      description: "주문 정보를 확인하려면 먼저 로그인해야 합니다.",
    },
    error: {
      eyebrow: "Something went wrong",
      title: "주문 정보를 불러오지 못했어요.",
      description: "잠시 후 주문 내역에서 다시 확인해주세요.",
    },
  } as const;

  return (
    <div className={styles.completePage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />
      {state === "success" && order ? (
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
            <strong>{order.id}</strong>
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
      ) : (
        <main className={styles.completeMain}>
          <p className={styles.eyebrow}>
            {unavailableContent[unavailableState].eyebrow}
          </p>
          <h1>{unavailableContent[unavailableState].title}</h1>
          <p className={styles.description}>
            {unavailableContent[unavailableState].description}
          </p>
          <div className={styles.actions}>
            {unavailableState === "unauthenticated" && (
              <Button
                component="a"
                href="/login"
                variant="contained"
                disableRipple
              >
                로그인하기
              </Button>
            )}
            <Button
              component="a"
              href="/orders"
              variant={
                unavailableState === "unauthenticated" ? "text" : "contained"
              }
              disableRipple
            >
              주문 내역 보기
            </Button>
            <Button component="a" href="/" disableRipple>
              홈으로 돌아가기
            </Button>
          </div>
        </main>
      )}
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
