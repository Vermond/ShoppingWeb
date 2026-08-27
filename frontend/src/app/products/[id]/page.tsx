"use client";

import {
  AddShoppingCart,
  ArrowBack,
  Favorite,
  FavoriteBorder,
} from "@mui/icons-material";
import { Button, IconButton } from "@mui/material";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useCart } from "../../../components/shop/CartProvider";
import { useCatalog } from "../../../components/shop/CatalogProvider";
import { ProductArt } from "../../../components/shop/ProductCard";
import { SiteHeader } from "../../../components/shop/SiteHeader";
import { formatPrice } from "../../../utils/format";
import { useWishlist } from "../../../components/shop/WishlistProvider";
import styles from "./page.module.css";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [query, setQuery] = useState("");
  const [isAdded, setIsAdded] = useState(false);
  const { totalItems, addItem } = useCart();
  const { products, isLoading } = useCatalog();
  const { isFavorite, toggleFavorite } = useWishlist();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;
  const product = products.find(({ id }) => id === productId);

  if (!product && isLoading) {
    return (
      <div className={styles.detailPage}>
        <SiteHeader
          activeSection={null}
          cartCount={totalItems}
          query={query}
          onQueryChange={setQuery}
        />
        <main className={styles.notFound}>
          상품 정보를 불러오는 중이에요.
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className={styles.detailPage}>
        <SiteHeader
          activeSection={null}
          cartCount={totalItems}
          query={query}
          onQueryChange={setQuery}
        />
        <main className={styles.notFound}>
          <p className={styles.eyebrow}>Object not found</p>
          <h1>찾으시는 물건이 없어요.</h1>
          <Button component="a" href="/shop" startIcon={<ArrowBack />}>
            상품 목록으로 돌아가기
          </Button>
        </main>
      </div>
    );
  }

  const addToCart = () => {
    addItem(product.id);
    setIsAdded(true);
    window.setTimeout(() => setIsAdded(false), 1600);
  };

  return (
    <div className={styles.detailPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />

      <main className={styles.detailMain}>
        <Button
          className={styles.backButton}
          component="a"
          href="/shop"
          startIcon={<ArrowBack />}
          disableRipple
        >
          상품 목록
        </Button>

        <section className={styles.detailLayout} aria-labelledby="product-title">
          <div className={styles.detailVisual}>
            <ProductArt
              product={product}
              className={styles.detailArt}
            />
          </div>

          <div className={styles.detailCopy}>
            <p className={styles.eyebrow}>{product.category}</p>
            <div className={styles.titleRow}>
              <h1 id="product-title">{product.name}</h1>
              <IconButton
                type="button"
                size="small"
                disableRipple
                onClick={() => toggleFavorite(product.id)}
                aria-label={
                  isFavorite(product.id) ? "찜 취소" : "상품 찜하기"
                }
                aria-pressed={isFavorite(product.id)}
              >
                {isFavorite(product.id) ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
            </div>
            <p className={styles.description}>{product.description}</p>
            <strong className={styles.price}>{formatPrice(product.price)}</strong>

            <dl className={styles.detailInfo}>
              <div>
                <dt>배송</dt>
                <dd>3만원 이상 무료 배송</dd>
              </div>
              <div>
                <dt>교환</dt>
                <dd>수령 후 14일 이내</dd>
              </div>
              <div>
                <dt>소재</dt>
                <dd>오래 쓰기 좋은 선택 소재</dd>
              </div>
            </dl>

            <Button
              className={styles.addButton}
              variant="contained"
              fullWidth
              disableRipple
              onClick={addToCart}
              startIcon={isAdded ? undefined : <AddShoppingCart />}
            >
              {isAdded ? "장바구니에 담았어요" : "장바구니 담기"}
            </Button>

            <p className={styles.detailNote}>
              화면의 상품 정보와 재고는 서버 연결 전 목업 데이터입니다.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
