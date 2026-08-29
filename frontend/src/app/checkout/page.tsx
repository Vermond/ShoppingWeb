"use client";

import {
  ArrowBack,
  ArrowForward,
} from "@mui/icons-material";
import { Button, MenuItem, TextField } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useEffect } from "react";
import { AddressSearchDialog } from "../../components/address/AddressSearchDialog";
import type { AddressSearchResult } from "../../components/address/address-search.provider";
import { useAuth } from "../../components/auth/AuthProvider";
import { useCart } from "../../components/shop/CartProvider";
import { useCatalog } from "../../components/shop/CatalogProvider";
import { SiteHeader } from "../../components/shop/SiteHeader";
import { createOrder, type CheckoutRequest } from "../../repositories/orders.repository";
import {
  requestUserAddresses,
  type UserAddress,
} from "../../repositories/user-details.repository";
import { formatPrice } from "../../utils/format";
import { isCartQuantityAvailable } from "../../utils/cart";
import { calculateShipping } from "../../utils/order";
import styles from "./page.module.css";

const initialCustomer: CheckoutRequest["customer"] = {
  name: "",
  email: "",
  phone: "",
  address: "",
  detailAddress: "",
};

function getCustomerAddress(address: UserAddress) {
  return {
    name: address.recipientName,
    phone: address.phoneNumber,
    address: `(${address.postalCode}) ${address.addressLine1}`,
    detailAddress: address.addressLine2 ?? "",
  };
}

function getAddressLabel(address: UserAddress) {
  return `${address.recipientName} · (${address.postalCode}) ${address.addressLine1}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { status: authStatus, user } = useAuth();
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState(initialCustomer);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("manual");
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutRequest["paymentMethod"]>("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const {
    items,
    totalItems,
    subtotal,
    clearCart,
    isLoading: isCartLoading,
    errorMessage: cartError,
  } = useCart();
  const { products } = useCatalog();
  const hasUnavailableItems = items.some((item) => {
    const product =
      item.product ?? products.find(({ id }) => id === item.productId);
    return (
      Boolean(cartError) ||
      item.available === false ||
      !product ||
      !isCartQuantityAvailable(product, item.quantity)
    );
  });
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }

    let active = true;

    const loadAddresses = async () => {
      setIsLoadingAddresses(true);
      setAddressError("");

      try {
        const result = await requestUserAddresses();

        if (!active) {
          return;
        }

        setAddresses(result);
        setCustomer((current) => ({
          ...current,
          email: current.email || user?.email || "",
        }));

        const preferredAddress =
          result.find((address) => address.isDefault) ?? result[0];

        if (preferredAddress) {
          setSelectedAddressId(preferredAddress.id);
          setCustomer((current) => ({
            ...current,
            ...getCustomerAddress(preferredAddress),
          }));
        }
      } catch (error) {
        if (active) {
          setAddressError(
            error instanceof Error
              ? error.message
              : "저장된 배송지를 불러오지 못했어요.",
          );
        }
      } finally {
        if (active) {
          setIsLoadingAddresses(false);
        }
      }
    };

    void loadAddresses();

    return () => {
      active = false;
    };
  }, [authStatus, user?.email]);

  const selectAddress = (addressId: string) => {
    setSelectedAddressId(addressId);

    if (addressId === "manual") {
      return;
    }

    const address = addresses.find((item) => item.id === addressId);

    if (address) {
      setCustomer((current) => ({
        ...current,
        ...getCustomerAddress(address),
      }));
    }
  };

  const updateCustomer = (key: keyof typeof customer, value: string) => {
    setCustomer((current) => ({ ...current, [key]: value }));
    setSelectedAddressId("manual");
  };

  const handleAddressSearchComplete = (result: AddressSearchResult) => {
    setCustomer((current) => ({
      ...current,
      address: `(${result.postalCode}) ${result.addressLine1}`,
      detailAddress: "",
    }));
    setSelectedAddressId("manual");
    setIsAddressSearchOpen(false);
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (hasUnavailableItems || cartError) {
      setErrorMessage(
        cartError ?? "재고 또는 최대 구매 가능 수량을 먼저 확인해주세요.",
      );
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
          price:
            item.product?.price ??
            products.find(({ id }) => id === item.productId)?.price ??
            0,
        })),
      });
      const didClear = await clearCart();

      if (!didClear) {
        setErrorMessage(
          "주문은 생성되었지만 장바구니를 비우지 못했어요. 다시 시도해주세요.",
        );
        setIsSubmitting(false);
        return;
      }

      router.push(`/order/complete?orderId=${encodeURIComponent(result.id)}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "주문 중 문제가 발생했어요.",
      );
      setIsSubmitting(false);
    }
  };

  if (isCartLoading || (cartError && items.length === 0)) {
    return (
      <div className={styles.checkoutPage}>
        <SiteHeader
          activeSection={null}
          cartCount={totalItems}
          query={query}
          onQueryChange={setQuery}
        />
        <main className={styles.emptyCheckout}>
          <p className={styles.eyebrow}>
            {isCartLoading ? "Checkout" : "Something went wrong"}
          </p>
          <h1>
            {isCartLoading
              ? "장바구니를 불러오는 중이에요."
              : "장바구니를 확인하지 못했어요."}
          </h1>
          {cartError && <p>{cartError}</p>}
          <Button component="a" href="/cart" endIcon={<ArrowForward />}>
            장바구니로 돌아가기
          </Button>
        </main>
      </div>
    );
  }

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
            {authStatus === "authenticated" && (
              <section className={styles.formSection} aria-labelledby="address-title">
                <div className={styles.addressHeading}>
                  <h2 id="address-title">배송지 선택</h2>
                  <Button
                    component={Link}
                    href="/account/addresses"
                    size="small"
                    disableRipple
                  >
                    배송지 관리
                  </Button>
                </div>
                {isLoadingAddresses ? (
                  <p className={styles.addressNote}>
                    저장된 배송지를 불러오는 중...
                  </p>
                ) : addresses.length > 0 ? (
                  <TextField
                    select
                    fullWidth
                    label="배송지"
                    value={selectedAddressId}
                    onChange={(event) => selectAddress(event.target.value)}
                    variant="standard"
                  >
                    <MenuItem value="manual">직접 입력</MenuItem>
                    {addresses.map((address) => (
                      <MenuItem value={address.id} key={address.id}>
                        {address.isDefault && "기본 · "}
                        {getAddressLabel(address)}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <p className={styles.addressNote}>
                    저장된 배송지가 없어요. 아래에서 직접 입력해주세요.
                  </p>
                )}
                {addressError && (
                  <p className={styles.errorMessage}>{addressError}</p>
                )}
              </section>
            )}

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
                <div className={`${styles.fullField} ${styles.addressField}`}>
                  <TextField
                    className={`${styles.addressInput} ${styles.addressLockedField}`}
                    label="주소"
                    value={customer.address}
                    disabled
                    required
                    fullWidth
                    variant="standard"
                  />
                  <Button
                    className={styles.addressSearchButton}
                    type="button"
                    variant="outlined"
                    disableRipple
                    onClick={() => setIsAddressSearchOpen(true)}
                  >
                    주소 검색
                  </Button>
                </div>
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

            {(errorMessage || cartError) && (
              <p className={styles.errorMessage}>
                {errorMessage || cartError}
              </p>
            )}
          </div>

          <aside className={styles.orderSummary} aria-labelledby="order-summary-title">
            <p className={styles.eyebrow}>Order summary</p>
            <h2 id="order-summary-title">주문 요약</h2>
            <div className={styles.summaryProducts}>
              {items.map((item) => {
                const product =
                  item.product ?? products.find(({ id }) => id === item.productId);

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

      <AddressSearchDialog
        open={isAddressSearchOpen}
        onClose={() => setIsAddressSearchOpen(false)}
        onComplete={handleAddressSearchComplete}
      />
    </div>
  );
}
