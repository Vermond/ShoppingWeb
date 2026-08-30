"use client";

import {
  AddShoppingCart,
  ArrowBack,
  Favorite,
  FavoriteBorder,
} from "@mui/icons-material";
import { Button, IconButton } from "@mui/material";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "../../../components/shop/CartProvider";
import { useCatalog } from "../../../components/shop/CatalogProvider";
import { ProductArt } from "../../../components/shop/ProductCard";
import { SiteHeader } from "../../../components/shop/SiteHeader";
import { fetchProductById } from "../../../repositories/catalog.repository";
import type { ProductDetail } from "../../../types/catalog";
import { formatPrice } from "../../../utils/format";
import { useWishlist } from "../../../components/shop/WishlistProvider";
import styles from "./page.module.css";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [query, setQuery] = useState("");
  const [isAdded, setIsAdded] = useState(false);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isProductLoading, setIsProductLoading] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const { totalItems, addItem } = useCart();
  const { categories } = useCatalog();
  const { isFavorite, isUpdating, toggleFavorite } = useWishlist();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async () => {
      setIsProductLoading(true);
      setProductError(null);

      try {
        const result = await fetchProductById(productId);

        if (!cancelled) {
          setProduct(result);
        }
      } catch (error) {
        if (!cancelled) {
          setProduct(null);
          setProductError(
            error instanceof Error
              ? error.message
              : "상품 정보를 불러오지 못했어요.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsProductLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!product && isProductLoading) {
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
          <p className={styles.eyebrow}>Object unavailable</p>
          <h1>{productError ?? "찾으시는 물건이 없어요."}</h1>
          <Button component="a" href="/shop" startIcon={<ArrowBack />}>
            상품 목록으로 돌아가기
          </Button>
        </main>
      </div>
    );
  }

  const displayProduct = {
    ...product,
    category:
      categories.find(({ id }) => id === product.categoryId)?.name ??
      product.category,
  };
  const isOutOfStock = product.stock <= 0;

  const addToCart = async () => {
    if (isOutOfStock) {
      return;
    }

    const didAdd = await addItem(product.id);

    if (!didAdd) {
      return;
    }

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
            {product.images[0] ? (
              <div className={styles.detailImageFrame}>
                <Image
                  className={styles.detailImage}
                  src={product.images[0].imageUrl}
                  alt={product.name}
                  fill
                  unoptimized
                  sizes="(max-width: 800px) 100vw, 54vw"
                />
              </div>
            ) : (
              <ProductArt product={displayProduct} className={styles.detailArt} />
            )}
          </div>

          <div className={styles.detailCopy}>
            <p className={styles.eyebrow}>{displayProduct.category}</p>
            <div className={styles.titleRow}>
              <h1 id="product-title">{product.name}</h1>
              <IconButton
                type="button"
                size="small"
                disableRipple
                disabled={isUpdating(product.id)}
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
            {isOutOfStock && (
              <p className={styles.outOfStockMessage}>재고 없음</p>
            )}

            <dl className={styles.detailInfo}>
              <div>
                <dt>배송</dt>
                <dd>주문 금액에 따라 배송비 적용</dd>
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
              className={`${styles.addButton} ${isOutOfStock ? styles.outOfStockButton : ""}`}
              variant="contained"
              fullWidth
              disableRipple
              disabled={isOutOfStock}
              onClick={addToCart}
              startIcon={isAdded ? undefined : <AddShoppingCart />}
            >
              {isOutOfStock
                ? "재고 없음"
                : isAdded
                  ? "장바구니에 담았어요"
                  : "장바구니 담기"}
            </Button>

            <p className={styles.detailNote}>
              상품 정보와 재고는 서버 기준으로 표시됩니다.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
