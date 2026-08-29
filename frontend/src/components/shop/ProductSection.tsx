"use client";

import { ArrowForward, KeyboardArrowDown } from "@mui/icons-material";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProductFilter } from "../../types/catalog";
import { useWishlist } from "./WishlistProvider";
import styles from "../../app/page.module.css";
import { useCatalog } from "./CatalogProvider";
import { ProductCard } from "./ProductCard";
import { ProductFilterTabs } from "./ProductFilterTabs";
import {
  filterAndSortProducts,
  sortLabels,
  type SortOrder,
} from "../../utils/catalog";

type ProductSectionProps = {
  activeFilter: ProductFilter;
  query: string;
  onFilterChange: (filter: ProductFilter) => void;
  onAddToCart: (productId: string) => boolean | Promise<boolean>;
};

export function ProductSection({
  activeFilter,
  query,
  onFilterChange,
  onAddToCart,
}: ProductSectionProps) {
  const [addedProduct, setAddedProduct] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recommended");
  const { products, categories, isLoading, errorMessage } = useCatalog();
  const { isFavorite, toggleFavorite } = useWishlist();
  const filters = useMemo<ProductFilter[]>(
    () => ["전체", ...categories.map((category) => category.name)],
    [categories],
  );

  const visibleProducts = useMemo(() => {
    return filterAndSortProducts(products, activeFilter, query, sortOrder);
  }, [activeFilter, products, query, sortOrder]);

  const cycleSortOrder = () => {
    setSortOrder((current) => {
      if (current === "recommended") {
        return "priceAsc";
      }

      if (current === "priceAsc") {
        return "priceDesc";
      }

      return "recommended";
    });
  };

  const emptyMessage = isLoading
    ? "상품 정보를 불러오는 중이에요."
    : errorMessage
      ? "상품 정보를 불러오지 못했어요."
      : products.length === 0
        ? "등록된 상품이 없어요."
        : "검색 결과가 없어요. 다른 단어로 찾아보세요.";
  const hasMoreProducts = visibleProducts.length >= 9;
  const displayedProducts = hasMoreProducts
    ? visibleProducts.slice(0, 7)
    : visibleProducts;

  const addToCart = async (productId: string) => {
    const didAdd = await onAddToCart(productId);

    if (!didAdd) {
      return;
    }

    setAddedProduct(productId);
    window.setTimeout(() => setAddedProduct(null), 1600);
  };

  return (
    <section className={styles.productSection} id="new-arrivals">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Selected objects</p>
          <h2>새로 들어온 것들</h2>
        </div>

        <button
          className={styles.sortButton}
          type="button"
          onClick={cycleSortOrder}
          aria-label={`정렬 기준: ${sortLabels[sortOrder]}`}
        >
          {sortLabels[sortOrder]} <KeyboardArrowDown />
        </button>
      </div>

      <ProductFilterTabs
        className={styles.filterRow}
        filters={filters}
        value={activeFilter}
        onChange={onFilterChange}
      />

      {visibleProducts.length > 0 ? (
        <div className={styles.productGrid}>
          {displayedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite={isFavorite(product.id)}
              isAdded={addedProduct === product.id}
              onToggleFavorite={toggleFavorite}
              onAddToCart={addToCart}
            />
          ))}
          {hasMoreProducts && (
            <Link
              className={styles.moreCard}
              href="/shop"
              aria-label="상품 전체 보기"
            >
              <span>더보기</span>
              <ArrowForward />
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.emptyState}>{emptyMessage}</div>
      )}
    </section>
  );
}
