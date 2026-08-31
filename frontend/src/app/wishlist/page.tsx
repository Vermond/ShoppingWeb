"use client";

import { ArrowForward } from "@mui/icons-material";
import { Button } from "@mui/material";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "../../components/auth/AuthProvider";
import { useCart } from "../../components/shop/CartProvider";
import { useCatalog } from "../../components/shop/CatalogProvider";
import { ProductCard } from "../../components/shop/ProductCard";
import { SiteHeader } from "../../components/shop/SiteHeader";
import { useWishlist } from "../../components/shop/WishlistProvider";
import type { Product } from "../../types/catalog";
import type { WishlistItem } from "../../types/wishlist";
import styles from "../shop/page.module.css";

const fallbackArts: Product["art"][] = [
  "ceramic",
  "linen",
  "bag",
  "glow",
  "wood",
  "glass",
];
const fallbackColors = [
  "#d9cbb7",
  "#aebcae",
  "#d58f70",
  "#ded9d2",
  "#be8d61",
  "#b8ced0",
];

type DisplayFavoriteProduct = {
  product: Product;
  isUnavailable: boolean;
};

function toDisplayProduct(
  item: WishlistItem,
  index: number,
  categories: ReadonlyArray<{ id: string; name: string }>,
  catalogProducts: Product[],
): DisplayFavoriteProduct {
  const wishlistProduct = item.product;
  const catalogProduct = catalogProducts.find(
    (product) => product.id === wishlistProduct.id,
  );
  const category =
    categories.find(({ id }) => id === wishlistProduct.categoryId)?.name ??
    catalogProduct?.category ??
    wishlistProduct.categoryId;

  return {
    product: {
      id: wishlistProduct.id,
      name: wishlistProduct.name,
      category,
      price: wishlistProduct.price,
      stock: wishlistProduct.stock,
      maxOrderQuantity: wishlistProduct.maxOrderQuantity,
      tag: catalogProduct?.tag,
      description: wishlistProduct.description ?? "",
      imageUrl: wishlistProduct.imageUrl ?? catalogProduct?.imageUrl ?? null,
      color:
        catalogProduct?.color ?? fallbackColors[index % fallbackColors.length],
      art: catalogProduct?.art ?? fallbackArts[index % fallbackArts.length],
    },
    isUnavailable: wishlistProduct.status !== "active",
  };
}

export default function WishlistPage() {
  const [query, setQuery] = useState("");
  const { status: authStatus } = useAuth();
  const { totalItems, addItem } = useCart();
  const {
    products,
    categories,
    isLoading: isCatalogLoading,
    errorMessage: catalogError,
  } = useCatalog();
  const {
    favoriteIds,
    localProducts,
    wishlistItems,
    isFavorite,
    isLoading: isWishlistLoading,
    errorMessage: wishlistError,
    isUpdating,
    toggleFavorite,
  } = useWishlist();
  const isAuthenticated = authStatus === "authenticated";
  const localProductsById = useMemo(
    () => new Map(localProducts.map((product) => [product.id, product])),
    [localProducts],
  );
  const favoriteProducts = useMemo<DisplayFavoriteProduct[]>(
    () =>
      isAuthenticated
        ? wishlistItems.map((item, index) =>
            toDisplayProduct(item, index, categories, products),
          )
        : favoriteIds.map((productId, index) => {
            const product =
              products.find(({ id }) => id === productId) ??
              localProductsById.get(productId) ?? {
                id: productId,
                name: "상품 정보를 확인할 수 없는 물건",
                category: "상품",
                price: 0,
                stock: 0,
                maxOrderQuantity: 0,
                description: "상품 정보를 다시 확인해주세요.",
                imageUrl: null,
                color: fallbackColors[index % fallbackColors.length],
                art: fallbackArts[index % fallbackArts.length],
              };

            return {
              product,
              isUnavailable: product.stock <= 0,
            };
          }),
    [
      categories,
      favoriteIds,
      isAuthenticated,
      localProductsById,
      products,
      wishlistItems,
    ],
  );
  const isLoading =
    isWishlistLoading || (!isAuthenticated && isCatalogLoading);
  const errorMessage = isAuthenticated ? wishlistError : catalogError;

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

        {isLoading ? (
          <section className={styles.emptyShop} aria-live="polite">
            찜 목록을 불러오는 중이에요.
          </section>
        ) : errorMessage ? (
          <section className={styles.emptyShop} role="alert">
            {errorMessage}
          </section>
        ) : favoriteProducts.length > 0 ? (
          <section className={styles.catalog} aria-label="찜한 상품 목록">
            <p className={styles.resultCount}>
              {favoriteProducts.length} saved objects
            </p>
            <div className={styles.shopGrid}>
              {favoriteProducts.map(({ product, isUnavailable }) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={isFavorite(product.id)}
                  isAdded={false}
                  isFavoriteUpdating={isUpdating(product.id)}
                  isUnavailable={isUnavailable}
                  onToggleFavorite={toggleFavorite}
                  onAddToCart={addItem}
                />
              ))}
            </div>
          </section>
        ) : (
          <section
            className={styles.emptyShop}
            aria-labelledby="empty-wishlist-title"
          >
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
