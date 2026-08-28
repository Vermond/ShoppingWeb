"use client";

import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { Button, TextField } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useCart } from "../../components/shop/CartProvider";
import { useCatalog } from "../../components/shop/CatalogProvider";
import { SiteHeader } from "../../components/shop/SiteHeader";
import { createOrder, type CheckoutRequest } from "../../repositories/orders.repository";
import { formatPrice } from "../../utils/format";
import { calculateShipping } from "../../utils/order";
import styles from "./page.module.css";

const initialCustomer: CheckoutRequest["customer"] = {
  name: "",
  email: "",
  phone: "",
  address: "",
  detailAddress: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState(initialCustomer);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutRequest["paymentMethod"]>("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { items, totalItems, subtotal, clearCart } = useCart();
  const { products } = useCatalog();
  const hasUnavailableItems = items.some((item) => {
    const product = products.find(({ id }) => id === item.productId);
    return !product || product.stock <= 0;
  });
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  const updateCustomer = (key: keyof typeof customer, value: string) => {
    setCustomer((current) => ({ ...current, [key]: value }));
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (hasUnavailableItems) {
      setErrorMessage("재고가 없는 상품을 먼저 장바구니에서 삭제해주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await createOrder({
        customer,
        paymentMethod,
        items: items.map((item) => ({
          ...item,
          price: products.find(({ id }) => id === item.productId)?.price ?? 0,
        })),
      });
      clearCart();
      router.push(`/order/complete?orderId=${encodeURIComponent(result.id)}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "주문 중 문제가 발생했어요.",
      );
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className={styles.checkoutPage}>
        <SiteHeader
          activeSection={null}
          cartCount={totalItems}
          query={query}
          onQueryChange={setQuery}
        />
        <main className={styles.emptyCheckout}>
          <p className={styles.eyebrow}>Checkout</p>
          <h1>먼저 물건을 담아주세요.</h1>
          <Button component="a" href="/shop" endIcon={<ArrowForward />}>
            상품 둘러보기
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.checkoutPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />

      <main className={styles.checkoutMain}>
        <Button
          className={styles.backButton}
          component="a"
          href="/cart"
          startIcon={<ArrowBack />}
          disableRipple
        >
          장바구니로 돌아가기
        </Button>

        <div className={styles.checkoutHeading}>
          <p className={styles.eyebrow}>A considered purchase</p>
          <h1>주문하기</h1>
        </div>

        <form className={styles.checkoutLayout} onSubmit={submitOrder}>
          <div className={styles.formColumn}>
            <section className={styles.formSection} aria-labelledby="customer-title">
              <h2 id="customer-title">배송 정보</h2>
              <div className={styles.formGrid}>
                <TextField
                  label="받는 분"
                  value={customer.name}
                  onChange={(event) => updateCustomer("name", event.target.value)}
                  required
                  fullWidth
                  variant="standard"
                />
                <TextField
                  label="이메일"
                  type="email"
                  value={customer.email}
                  onChange={(event) => updateCustomer("email", event.target.value)}
                  required
                  fullWidth
                  variant="standard"
                />
                <TextField
                  label="연락처"
                  value={customer.phone}
                  onChange={(event) => updateCustomer("phone", event.target.value)}
                  required
                  fullWidth
                  variant="standard"
                />
                <TextField
                  className={styles.fullField}
                  label="주소"
                  value={customer.address}
                  onChange={(event) => updateCustomer("address", event.target.value)}
                  required
                  fullWidth
                  variant="standard"
                />
                <TextField
                  className={styles.fullField}
                  label="상세 주소"
                  value={customer.detailAddress}
                  onChange={(event) => updateCustomer("detailAddress", event.target.value)}
                  fullWidth
                  variant="standard"
                />
              </div>
            </section>

            <section className={styles.formSection} aria-labelledby="payment-title">
              <h2 id="payment-title">결제 방법</h2>
              <div className={styles.paymentOptions}>
                <label className={paymentMethod === "card" ? styles.paymentSelected : ""}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                  />
                  <span>신용카드</span>
                  <small>목업 결제</small>
                </label>
                <label className={paymentMethod === "bank" ? styles.paymentSelected : ""}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "bank"}
                    onChange={() => setPaymentMethod("bank")}
                  />
                  <span>무통장 입금</span>
                  <small>목업 결제</small>
                </label>
              </div>
            </section>

            {errorMessage && <p className={styles.errorMessage}>{errorMessage}</p>}
          </div>

          <aside className={styles.orderSummary} aria-labelledby="order-summary-title">
            <p className={styles.eyebrow}>Order summary</p>
            <h2 id="order-summary-title">주문 요약</h2>
            <div className={styles.summaryProducts}>
              {items.map((item) => {
                const product = products.find(({ id }) => id === item.productId);

                return product ? (
                  <div key={item.productId}>
                    <span>{product.name} × {item.quantity}</span>
                    <strong>{formatPrice(product.price * item.quantity)}</strong>
                  </div>
                ) : null;
              })}
            </div>
            <dl>
              <div>
                <dt>상품 금액</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div>
                <dt>배송비</dt>
                <dd>{shipping === 0 ? "무료" : formatPrice(shipping)}</dd>
              </div>
            </dl>
            <div className={styles.totalRow}>
              <span>총 결제 금액</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <Button
              className={styles.submitButton}
              type="submit"
              variant="contained"
              fullWidth
              disableRipple
              disabled={isSubmitting || hasUnavailableItems}
              endIcon={!isSubmitting && <ArrowForward />}
            >
              {isSubmitting ? "주문 처리 중..." : "목업 결제하기"}
            </Button>
            <p className={styles.mockNote}>
              실제 결제·배송 처리는 서버 연결 후 활성화됩니다.
            </p>
          </aside>
        </form>
      </main>
    </div>
  );
}
