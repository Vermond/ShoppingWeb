"use client";

import {
  Add,
  Check,
  Favorite,
  FavoriteBorder,
} from "@mui/icons-material";
import {
  Button,
  Chip,
  IconButton,
} from "@mui/material";
import type { Product } from "../../data/products";
import styles from "../../app/page.module.css";

type ProductCardProps = {
  product: Product;
  index: number;
  isFavorite: boolean;
  isAdded: boolean;
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (productId: string) => void;
};

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function ProductArt({ product, index }: { product: Product; index: number }) {
  return (
    <div
      className={`${styles.productArt} ${styles[product.art]}`}
      style={{ backgroundColor: product.color }}
    >
      <span className={styles.artLabel}>{product.category}</span>
      <div className={styles.artObject} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span className={styles.artIndex}>0{index + 1}</span>
    </div>
  );
}

export function ProductCard({
  product,
  index,
  isFavorite,
  isAdded,
  onToggleFavorite,
  onAddToCart,
}: ProductCardProps) {
  return (
    <article className={styles.productCard}>
      <div className={styles.productImageWrap}>
        <ProductArt product={product} index={index} />

        {product.tag && (
          <Chip
            className={styles.productTag}
            label={product.tag}
            size="small"
            sx={{
              height: "auto",
              borderRadius: 0,
              backgroundColor: "#f6f4ed",
              color: "var(--morrow-palette-text-primary)",
              "& .MuiChip-label": {
                padding: "5px 7px",
                fontSize: "8px",
                letterSpacing: ".12em",
                lineHeight: 1,
              },
            }}
          />
        )}

        <IconButton
          className={styles.favoriteButton}
          type="button"
          size="small"
          disableRipple
          onClick={() => onToggleFavorite(product.id)}
          aria-label={`${product.name} ${isFavorite ? "찜 취소" : "찜하기"}`}
          aria-pressed={isFavorite}
        >
          {isFavorite ? <Favorite /> : <FavoriteBorder />}
        </IconButton>
      </div>

      <div className={styles.productInfo}>
        <div>
          <p>{product.category}</p>
          <h3>{product.name}</h3>
          <span>{product.description}</span>
        </div>
        <strong>{formatPrice(product.price)}</strong>
      </div>

      <Button
        className={`${styles.addButton} ${isAdded ? styles.addedButton : ""}`}
        type="button"
        variant="outlined"
        disableRipple
        onClick={() => onAddToCart(product.id)}
        sx={{
          fontSize: "10px",
        }}
      >
        {isAdded ? (
          <>
            <Check />
            담았어요
          </>
        ) : (
          <>
            <Add />
            장바구니 담기
          </>
        )}
      </Button>
    </article>
  );
}
