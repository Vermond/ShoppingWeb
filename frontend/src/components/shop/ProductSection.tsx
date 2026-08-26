"use client";

import { KeyboardArrowDown } from "@mui/icons-material";
import { Tab, Tabs } from "@mui/material";
import { useMemo, useState } from "react";
import {
  products,
  type ProductFilter,
} from "../../data/products";
import styles from "../../app/page.module.css";
import { ProductCard } from "./ProductCard";

const filters: ProductFilter[] = ["전체", "리빙", "패션", "액세서리", "뷰티"];

type ProductSectionProps = {
  activeFilter: ProductFilter;
  query: string;
  onFilterChange: (filter: ProductFilter) => void;
  onAddToCart: (productId: string) => void;
};

export function ProductSection({
  activeFilter,
  query,
  onFilterChange,
  onAddToCart,
}: ProductSectionProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [addedProduct, setAddedProduct] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = activeFilter === "전체" || product.category === activeFilter;
      const matchesQuery =
        !normalizedQuery ||
        `${product.name} ${product.description}`.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeFilter, query]);

  const toggleFavorite = (productId: string) => {
    setFavorites((current) => {
      const next = new Set(current);

      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }

      return next;
    });
  };

  const addToCart = (productId: string) => {
    onAddToCart(productId);
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

        <button className={styles.sortButton} type="button">
          추천순 <KeyboardArrowDown />
        </button>
      </div>

      <Tabs
        className={styles.filterRow}
        value={activeFilter}
        onChange={(_, value: ProductFilter) => onFilterChange(value)}
        aria-label="상품 카테고리 필터"
        variant="scrollable"
        scrollButtons={false}
        sx={{
          minHeight: 0,
          "& .MuiTabs-list": {
            columnGap: { xs: "28px", sm: "42px" },
          },
          "& .MuiTabs-indicator": {
            height: "2px",
            backgroundColor: "var(--morrow-palette-text-primary)",
          },
        }}
      >
        {filters.map((filter) => (
          <Tab
            key={filter}
            value={filter}
            label={filter}
            disableRipple
            sx={{
              minHeight: { xs: 44, sm: 48 },
              padding: { xs: "6px 8px 14px", sm: "7px 10px 15px" },
              color: "var(--morrow-palette-text-secondary)",
              fontSize: { xs: "13px", sm: "14px" },
              fontWeight: 500,
              letterSpacing: "-.02em",
              lineHeight: 1.4,
              "&.Mui-selected": {
                color: "var(--morrow-palette-text-primary)",
              },
            }}
          />
        ))}
      </Tabs>

      {visibleProducts.length > 0 ? (
        <div className={styles.productGrid}>
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              index={products.indexOf(product)}
              isFavorite={favorites.has(product.id)}
              isAdded={addedProduct === product.id}
              onToggleFavorite={toggleFavorite}
              onAddToCart={addToCart}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>검색 결과가 없어요. 다른 단어로 찾아보세요.</div>
      )}
    </section>
  );
}
