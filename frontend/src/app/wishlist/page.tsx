"use client";

import { ArrowForward } from "@mui/icons-material";
import { Button } from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "../../components/shop/CartProvider";
import { useCatalog } from "../../components/shop/CatalogProvider";
import { ProductCard } from "../../components/shop/ProductCard";
import { SiteHeader } from "../../components/shop/SiteHeader";
import { useWishlist } from "../../components/shop/WishlistProvider";
import styles from "../shop/page.module.css";

export default function WishlistPage() {
  const [query, setQuery] = useState("");
  const { totalItems, addItem } = useCart();
  const { products } = useCatalog();
  const { favoriteIds, isFavorite, toggleFavorite } = useWishlist();
  const favoriteProducts = products.filter((product) =>
    favoriteIds.includes(product.id),
  );

  return (
    <div className={styles.shopPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />

      <main className={styles.shopMain}>
        <section className={styles.shopIntro} aria-labelledby="wishlist-title">
          <div>
            <p className={styles.eyebrow}>Saved for later</p>
            <h1 id="wishlist-title">마음에 둔 것들.</h1>
          </div>
          <p>
            다시 보고 싶은 물건을 모아두었어요.
            <br />
            오래 고민해도 괜찮습니다.
          </p>
        </section>

        {favoriteProducts.length > 0 ? (
          <section className={styles.catalog} aria-label="찜한 상품 목록">
            <p className={styles.resultCount}>{favoriteProducts.length} saved objects</p>
            <div className={styles.shopGrid}>
              {favoriteProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={products.indexOf(product)}
                  isFavorite={isFavorite(product.id)}
                  isAdded={false}
                  onToggleFavorite={toggleFavorite}
                  onAddToCart={addItem}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className={styles.emptyShop} aria-labelledby="empty-wishlist-title">
            <h2 id="empty-wishlist-title">아직 마음에 둔 물건이 없어요.</h2>
            <p>좋아하는 상품의 하트 버튼을 눌러 저장해보세요.</p>
            <Button
              component="a"
              href="/shop"
              variant="contained"
              disableRipple
              endIcon={<ArrowForward />}
              sx={{
                minHeight: 48,
                marginTop: "28px",
                borderRadius: 0,
                backgroundColor: "var(--morrow-palette-text-primary)",
                color: "var(--morrow-palette-background-default)",
              }}
            >
              상품 둘러보기
            </Button>
          </section>
        )}
      </main>

      <footer className={styles.shopFooter}>
        <span>Make room for good things.</span>
        <Link href="/">Back to Morrow</Link>
      </footer>
    </div>
  );
}
