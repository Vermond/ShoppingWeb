"use client";

import {
  Add,
  ArrowForward,
  Delete,
  Remove,
} from "@mui/icons-material";
import { Button, IconButton } from "@mui/material";
import { useState } from "react";
import { useCart } from "../../components/shop/CartProvider";
import { useCatalog } from "../../components/shop/CatalogProvider";
import { ProductArt } from "../../components/shop/ProductCard";
import { SiteHeader } from "../../components/shop/SiteHeader";
import { formatPrice } from "../../utils/format";
import {
  calculateShipping,
  FREE_SHIPPING_THRESHOLD,
} from "../../utils/order";
import styles from "./page.module.css";

export default function CartPage() {
  const [query, setQuery] = useState("");
  const { items, totalItems, subtotal, updateQuantity, removeItem } = useCart();
  const { products } = useCatalog();
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;

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

        {items.length === 0 ? (
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
                const product = products.find(({ id }) => id === item.productId);

                if (!product) {
                  return null;
                }

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
                        </div>
                        <IconButton
                          type="button"
                          size="small"
                          disableRipple
                          onClick={() => removeItem(item.productId)}
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
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
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
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                <div>
                  <dt>배송비</dt>
                  <dd>{shipping === 0 ? "무료" : formatPrice(shipping)}</dd>
                </div>
              </dl>
              <div className={styles.summaryTotal}>
                <span>총 결제 금액</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <Button
                className={styles.checkoutButton}
                component="a"
                href="/checkout"
                variant="contained"
                disableRipple
                fullWidth
              >
                결제하기
              </Button>
              <p className={styles.shippingNote}>
                {subtotal >= FREE_SHIPPING_THRESHOLD
                  ? "무료 배송이 적용되었어요."
                  : `${formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} 더 담으면 무료 배송`}
              </p>
            </aside>
          </div>
        )}
      </main>

      <footer className={styles.cartFooter}>
        <span>Make room for good things.</span>
        <span>© 2025 MORROW STUDIO</span>
      </footer>
    </div>
  );
}
