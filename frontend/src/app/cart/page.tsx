"use client";

import {
  Add,
  ArrowForward,
  Delete,
  Remove,
} from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { useState } from "react";
import { useAuth } from "../../components/auth/AuthProvider";
import { useCart } from "../../components/shop/CartProvider";
import { useCatalog } from "../../components/shop/CatalogProvider";
import { ProductArt } from "../../components/shop/ProductCard";
import { SiteHeader } from "../../components/shop/SiteHeader";
import { useOrderPreview } from "../../hooks/use-order-preview";
import { formatPrice } from "../../utils/format";
import {
  getMaxPurchasableQuantity,
  isCartQuantityAvailable,
} from "../../utils/cart";
import styles from "./page.module.css";

export default function CartPage() {
  const { status: authStatus } = useAuth();
  const [query, setQuery] = useState("");
  const [isRemovalDialogOpen, setIsRemovalDialogOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{
    productId: string;
    productName: string;
  } | null>(null);
  const {
    items,
    totalItems,
    subtotal,
    updateQuantity,
    removeItem,
    isLoading: isCartLoading,
    errorMessage: cartError,
  } = useCart();
  const { products } = useCatalog();
  const hasUnavailableItems = items.some((item) => {
    const product =
      item.product ?? products.find(({ id }) => id === item.productId);
    return (
      item.available === false ||
      !product ||
      !isCartQuantityAvailable(product, item.quantity)
    );
  });
  const orderPreview = useOrderPreview(
    authStatus === "authenticated" &&
      !isCartLoading &&
      !cartError &&
      items.length > 0 &&
      !hasUnavailableItems,
    `${authStatus}:${totalItems}:${subtotal}:${hasUnavailableItems}:${Boolean(
      cartError,
    )}`,
  );
  const previewAmounts = orderPreview.amounts;
  const summarySubtotal = previewAmounts?.subtotal ?? subtotal;
  const shipping = previewAmounts?.shippingFee ?? null;
  const total = previewAmounts?.totalAmount ?? null;
  const shippingLabel =
    authStatus !== "authenticated"
      ? "로그인 후 확인"
      : orderPreview.isLoading
        ? "계산 중..."
        : shipping === null
          ? "확인 필요"
          : shipping === 0
            ? "무료"
            : formatPrice(shipping);
  const totalLabel =
    authStatus !== "authenticated"
      ? "로그인 후 확인"
      : orderPreview.isLoading
        ? "계산 중..."
        : total === null
          ? "확인 필요"
          : formatPrice(total);
  const isCheckoutDisabled =
    hasUnavailableItems ||
    (authStatus === "authenticated" &&
      (orderPreview.isLoading ||
        orderPreview.errorMessage !== null ||
        previewAmounts === null));

  const requestRemoval = (productId: string, productName: string) => {
    setPendingRemoval({ productId, productName });
    setIsRemovalDialogOpen(true);
  };

  const decreaseQuantity = (
    productId: string,
    productName: string,
    quantity: number,
  ) => {
    if (quantity === 1) {
      requestRemoval(productId, productName);
      return;
    }

    updateQuantity(productId, quantity - 1);
  };

  const closeRemovalDialog = () => {
    setIsRemovalDialogOpen(false);
  };

  const confirmRemoval = () => {
    if (pendingRemoval) {
      removeItem(pendingRemoval.productId);
    }

    closeRemovalDialog();
  };

  return (
    <div className={styles.cartPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />

      <main className={styles.cartMain} id="top">
        <section className={styles.cartHero} aria-labelledby="cart-title">
          <div>
            <p className={styles.eyebrow}>Your selection</p>
            <h1 id="cart-title">장바구니</h1>
          </div>
          <Button
            className={styles.continueButton}
            component="a"
            href="/"
            disableRipple
            endIcon={<ArrowForward />}
          >
            쇼핑 계속하기
          </Button>
        </section>

        {isCartLoading ? (
          <section className={styles.emptyCart} aria-live="polite">
            <p className={styles.eyebrow}>Your selection</p>
            <h2>장바구니를 불러오는 중이에요.</h2>
          </section>
        ) : cartError && items.length === 0 ? (
          <section className={styles.emptyCart} aria-live="polite">
            <p className={styles.eyebrow}>Something went wrong</p>
            <h2>장바구니를 불러오지 못했어요.</h2>
            <p>{cartError}</p>
          </section>
        ) : items.length === 0 ? (
          <section className={styles.emptyCart} aria-labelledby="empty-cart-title">
            <p className={styles.eyebrow}>A quiet beginning</p>
            <h2 id="empty-cart-title">아직 담은 물건이 없어요.</h2>
            <p>오래 곁에 둘 물건을 천천히 골라보세요.</p>
            <Button
              className={styles.shopButton}
              component="a"
              href="/#new-arrivals"
              variant="contained"
              disableRipple
              endIcon={<ArrowForward />}
            >
              상품 둘러보기
            </Button>
          </section>
        ) : (
          <div className={styles.cartLayout}>
            <section className={styles.cartItems} aria-labelledby="cart-items-title">
              <div className={styles.cartListHeader}>
                <h2 id="cart-items-title">담은 물건</h2>
                <span>{totalItems} items</span>
              </div>

              {items.map((item) => {
                const product =
                  item.product ??
                  products.find(({ id }) => id === item.productId) ?? {
                    id: item.productId,
                    name: "상품 정보를 확인할 수 없는 물건",
                    category: "상품",
                    price: 0,
                    stock: 0,
                    maxOrderQuantity: 0,
                    description: "",
                    imageUrl: null,
                    color: "#ded9d2",
                    art: "ceramic" as const,
                  };

                const isOutOfStock = product.stock <= 0;
                const maximumQuantity = getMaxPurchasableQuantity(product);

                return (
                  <article className={styles.cartItem} key={item.productId}>
                    <div className={styles.cartItemArt}>
                      <ProductArt
                        product={product}
                      />
                    </div>

                    <div className={styles.cartItemDetails}>
                      <div className={styles.cartItemHeader}>
                        <div>
                          <p>{product.category}</p>
                          <h3>{product.name}</h3>
                          <span>{product.description}</span>
                          {(isOutOfStock || item.available === false) && (
                            <strong className={styles.outOfStockMessage}>
                              {isOutOfStock
                                ? "재고 없음"
                                : item.unavailableReason ===
                                    "MAX_ORDER_QUANTITY_EXCEEDED"
                                  ? "최대 구매 수량 초과"
                                  : "구매할 수 없는 상품"}
                            </strong>
                          )}
                        </div>
                        <IconButton
                          type="button"
                          size="small"
                          disableRipple
                          onClick={() =>
                            requestRemoval(item.productId, product.name)
                          }
                          aria-label={`${product.name} 삭제`}
                        >
                          <Delete />
                        </IconButton>
                      </div>

                      <div className={styles.cartItemFooter}>
                        <div className={styles.quantityControl} aria-label={`${product.name} 수량 조절`}>
                          <IconButton
                            type="button"
                            size="small"
                            disableRipple
                            disabled={isOutOfStock || item.available === false}
                            onClick={() =>
                              decreaseQuantity(
                                item.productId,
                                product.name,
                                item.quantity,
                              )
                            }
                            aria-label={`${product.name} 수량 줄이기`}
                          >
                            <Remove />
                          </IconButton>
                          <span aria-live="polite">{item.quantity}</span>
                          <IconButton
                            type="button"
                            size="small"
                            disableRipple
                              disabled={
                                isOutOfStock ||
                                item.available === false ||
                                item.quantity >= maximumQuantity
                              }
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            aria-label={`${product.name} 수량 늘리기`}
                          >
                            <Add />
                          </IconButton>
                        </div>
                        <strong>{formatPrice(product.price * item.quantity)}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className={styles.cartSummary} aria-labelledby="summary-title">
              <p className={styles.eyebrow}>Order summary</p>
              <h2 id="summary-title">주문 요약</h2>
              <dl>
                <div>
                  <dt>상품 금액</dt>
                  <dd>{formatPrice(summarySubtotal)}</dd>
                </div>
                <div>
                  <dt>배송비</dt>
                  <dd>{shippingLabel}</dd>
                </div>
              </dl>
              <div className={styles.summaryTotal}>
                <span>총 결제 금액</span>
                <strong>{totalLabel}</strong>
              </div>
              <Button
                className={styles.checkoutButton}
                component="a"
                href="/checkout"
                variant="contained"
                disableRipple
                fullWidth
                disabled={isCheckoutDisabled}
              >
                {hasUnavailableItems
                  ? "재고를 확인해주세요"
                  : orderPreview.isLoading
                    ? "금액 확인 중..."
                    : orderPreview.errorMessage
                      ? "배송비를 확인해주세요"
                      : "결제하기"}
              </Button>
              {hasUnavailableItems && (
                <p className={styles.outOfStockNote}>
                  구매할 수 없는 상품을 장바구니에서 삭제한 후 결제할 수 있어요.
                </p>
              )}
              {cartError && (
                <p className={styles.outOfStockNote}>{cartError}</p>
              )}
              {orderPreview.errorMessage && (
                <p className={styles.outOfStockNote} role="alert">
                  {orderPreview.errorMessage}
                </p>
              )}
              <p className={styles.shippingNote}>
                {authStatus !== "authenticated"
                  ? "로그인 후 배송비를 확인할 수 있어요."
                  : orderPreview.isLoading
                    ? "배송비를 계산하고 있어요."
                    : orderPreview.errorMessage
                      ? "배송비를 확인할 수 없어요."
                      : shipping === 0
                        ? "무료 배송이 적용되었어요."
                        : "배송비가 적용되었어요."}
              </p>
            </aside>
          </div>
        )}
      </main>

      <Dialog
        open={isRemovalDialogOpen}
        onClose={closeRemovalDialog}
        disableScrollLock
        aria-labelledby="remove-cart-item-title"
        aria-describedby="remove-cart-item-description"
      >
        <DialogTitle id="remove-cart-item-title">
          상품을 삭제하시겠습니까?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="remove-cart-item-description">
            {pendingRemoval?.productName} 상품을 장바구니에서 삭제합니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRemovalDialog}>취소</Button>
          <Button onClick={confirmRemoval} color="error" variant="contained">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      <footer className={styles.cartFooter}>
        <span>Make room for good things.</span>
        <span>© 2025 MORROW STUDIO</span>
      </footer>
    </div>
  );
}
