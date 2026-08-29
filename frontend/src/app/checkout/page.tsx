"use client";

import {
  ArrowBack,
  ArrowForward,
} from "@mui/icons-material";
import {
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  TextField,
} from "@mui/material";
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
import {
  createOrder,
  type CreateOrderRequest,
} from "../../repositories/orders.repository";
import {
  requestUserAddresses,
  createUserAddress,
  type UserAddress,
} from "../../repositories/user-details.repository";
import { formatPrice } from "../../utils/format";
import { isCartQuantityAvailable } from "../../utils/cart";
import { calculateShipping } from "../../utils/order";
import styles from "./page.module.css";

type CheckoutCustomer = {
  name: string;
  phone: string;
  address: string;
  detailAddress: string;
};

type ManualAddress = {
  postalCode: string;
  addressLine1: string;
};

const initialCustomer: CheckoutCustomer = {
  name: "",
  phone: "",
  address: "",
  detailAddress: "",
};

const NEW_ADDRESS_ID = "new";

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
  const { status: authStatus } = useAuth();
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState(initialCustomer);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] =
    useState(NEW_ADDRESS_ID);
  const [manualAddress, setManualAddress] = useState<ManualAddress | null>(
    null,
  );
  const [isNewAddressDefault, setIsNewAddressDefault] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const {
    items,
    totalItems,
    subtotal,
    markCartAsCleared,
    isLoading: isCartLoading,
    errorMessage: cartError,
  } = useCart();
  const { products } = useCatalog();
  const isNewAddress = selectedAddressId === NEW_ADDRESS_ID;
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

        const preferredAddress =
          result.find((address) => address.isDefault) ?? result[0];

        if (preferredAddress) {
          setSelectedAddressId(preferredAddress.id);
          setManualAddress(null);
          setIsNewAddressDefault(false);
          setCustomer((current) => ({
            ...current,
            ...getCustomerAddress(preferredAddress),
          }));
        } else {
          setSelectedAddressId(NEW_ADDRESS_ID);
          setIsNewAddressDefault(true);
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
  }, [authStatus]);

  const startNewAddress = () => {
    setSelectedAddressId(NEW_ADDRESS_ID);
    setManualAddress(null);
    setIsNewAddressDefault(addresses.length === 0);
    setCustomer((current) => ({
      ...current,
      name: "",
      phone: "",
      address: "",
      detailAddress: "",
    }));
    setErrorMessage("");
  };

  const selectAddress = (addressId: string) => {
    if (addressId === NEW_ADDRESS_ID) {
      startNewAddress();
      return;
    }

    const address = addresses.find((item) => item.id === addressId);

    if (address) {
      setSelectedAddressId(addressId);
      setManualAddress(null);
      setIsNewAddressDefault(false);
      setCustomer((current) => ({
        ...current,
        ...getCustomerAddress(address),
      }));
    }
  };

  const updateCustomer = (key: keyof typeof customer, value: string) => {
    setCustomer((current) => ({ ...current, [key]: value }));
  };

  const handleAddressSearchComplete = (result: AddressSearchResult) => {
    setManualAddress({
      postalCode: result.postalCode,
      addressLine1: result.addressLine1,
    });
    setCustomer((current) => ({
      ...current,
      address: `(${result.postalCode}) ${result.addressLine1}`,
      detailAddress: "",
    }));
    setSelectedAddressId(NEW_ADDRESS_ID);
    setIsNewAddressDefault((current) =>
      addresses.length === 0 ? true : current,
    );
    setIsAddressSearchOpen(false);
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (authStatus !== "authenticated") {
      setErrorMessage("로그인 후 주문할 수 있어요.");
      return;
    }

    if (hasUnavailableItems || cartError) {
      setErrorMessage(
        cartError ?? "재고 또는 최대 구매 가능 수량을 먼저 확인해주세요.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      let addressId = selectedAddressId;

      if (isNewAddress) {
        if (!manualAddress) {
          setErrorMessage("주소 검색으로 배송지를 먼저 입력해주세요.");
          setIsSubmitting(false);
          return;
        }

        const savedAddress = await createUserAddress({
          recipientName: customer.name.trim(),
          phoneNumber: customer.phone.trim(),
          postalCode: manualAddress.postalCode,
          addressLine1: manualAddress.addressLine1,
          addressLine2: customer.detailAddress.trim() || null,
          isDefault: isNewAddressDefault,
        });
        addressId = savedAddress.id;
        setAddresses((current) => {
          const withoutSavedAddress = current.filter(
            (address) => address.id !== savedAddress.id,
          );
          const nextAddresses = savedAddress.isDefault
            ? withoutSavedAddress.map((address) => ({
                ...address,
                isDefault: false,
              }))
            : withoutSavedAddress;

          return [...nextAddresses, savedAddress];
        });
        setSelectedAddressId(savedAddress.id);
        setManualAddress(null);
        setIsNewAddressDefault(false);
      }

      if (!addressId || addressId === NEW_ADDRESS_ID) {
        setErrorMessage("배송지를 선택해주세요.");
        setIsSubmitting(false);
        return;
      }

      const request: CreateOrderRequest = {
        addressId,
        deliveryRequest: null,
      };
      const result = await createOrder(request);
      markCartAsCleared();

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
              <section
                className={styles.formSection}
                aria-labelledby="address-title"
              >
                <div className={styles.addressHeading}>
                  <h2 id="address-title">배송지 선택</h2>
                  <Button
                    component={Link}
                    href="/account/addresses?returnTo=%2Fcheckout"
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
                    <MenuItem value={NEW_ADDRESS_ID}>새 배송지 입력</MenuItem>
                    {addresses.map((address) => (
                      <MenuItem value={address.id} key={address.id}>
                        {address.isDefault && "기본 · "}
                        {getAddressLabel(address)}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <p className={styles.addressNote}>
                    저장된 배송지가 없어요. 아래에서 새 배송지를 입력해주세요.
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
                  className={!isNewAddress ? styles.readOnlyField : undefined}
                  label="받는 분"
                  value={customer.name}
                  onChange={(event) => updateCustomer("name", event.target.value)}
                  disabled={!isNewAddress}
                  required
                  fullWidth
                  variant="standard"
                />
                <TextField
                  className={!isNewAddress ? styles.readOnlyField : undefined}
                  label="연락처"
                  value={customer.phone}
                  onChange={(event) => updateCustomer("phone", event.target.value)}
                  disabled={!isNewAddress}
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
                    disabled={!isNewAddress}
                  >
                    주소 검색
                  </Button>
                </div>
                <TextField
                  className={`${styles.fullField} ${
                    !isNewAddress ? styles.readOnlyField : ""
                  }`}
                  label="상세 주소"
                  value={customer.detailAddress}
                  onChange={(event) => updateCustomer("detailAddress", event.target.value)}
                  disabled={!isNewAddress}
                  fullWidth
                  variant="standard"
                />
              </div>
              {isNewAddress && (
                <FormControlLabel
                  className={styles.defaultAddressOption}
                  control={
                    <Checkbox
                      checked={isNewAddressDefault}
                      onChange={(event) =>
                        setIsNewAddressDefault(event.target.checked)
                      }
                    />
                  }
                  label="기본 배송지로 설정"
                />
              )}
            </section>

            <section className={styles.formSection} aria-labelledby="payment-title">
              <h2 id="payment-title">결제 방법</h2>
              <p className={styles.addressNote}>
                현재 결제 승인은 서버의 목업 결제로 처리됩니다.
              </p>
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
              {isSubmitting ? "주문 처리 중..." : "주문하기"}
            </Button>
            <p className={styles.mockNote}>
              결제 승인은 현재 서버의 목업 결제로 처리됩니다.
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
