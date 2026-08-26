"use client";

import { KeyboardArrowDown } from "@mui/icons-material";
import { Tab, Tabs } from "@mui/material";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "../../components/shop/CartProvider";
import { ProductCard } from "../../components/shop/ProductCard";
import { SiteHeader } from "../../components/shop/SiteHeader";
import { useWishlist } from "../../components/shop/WishlistProvider";
import { products, type ProductFilter } from "../../data/products";
import styles from "./page.module.css";

const filters: ProductFilter[] = ["전체", "리빙", "패션", "액세서리", "뷰티"];
type SortOrder = "recommended" | "priceAsc" | "priceDesc";

const sortLabels: Record<SortOrder, string> = {
  recommended: "추천순",
  priceAsc: "낮은 가격순",
  priceDesc: "높은 가격순",
};

export default function ShopPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProductFilter>("전체");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recommended");
  const { totalItems, addItem } = useCart();
  const { isFavorite, toggleFavorite } = useWishlist();

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredProducts = products.filter((product) => {
      const matchesCategory =
        activeFilter === "전체" || product.category === activeFilter;
      const matchesQuery =
        !normalizedQuery ||
        `${product.name} ${product.description}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });

    if (sortOrder === "priceAsc") {
      return filteredProducts.sort((a, b) => a.price - b.price);
    }

    if (sortOrder === "priceDesc") {
      return filteredProducts.sort((a, b) => b.price - a.price);
    }

    return filteredProducts;
  }, [activeFilter, query, sortOrder]);

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

  return (
    <div className={styles.shopPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={setQuery}
      />

      <main className={styles.shopMain}>
        <section className={styles.shopIntro} aria-labelledby="shop-title">
          <div>
            <p className={styles.eyebrow}>All objects</p>
            <h1 id="shop-title">천천히 고른 것들.</h1>
          </div>
          <p>
            매일 곁에 두고 오래 쓰는 물건을
            <br />
            카테고리별로 만나보세요.
          </p>
        </section>

        <section className={styles.catalog} aria-label="상품 목록">
          <div className={styles.catalogToolbar}>
            <Tabs
              value={activeFilter}
              onChange={(_, value: ProductFilter) => setActiveFilter(value)}
              aria-label="상품 카테고리 필터"
              variant="scrollable"
              scrollButtons={false}
              sx={{
                minHeight: 0,
                "& .MuiTabs-list": {
                  columnGap: { xs: "22px", sm: "32px" },
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
                    padding: { xs: "6px 4px 14px", sm: "7px 6px 15px" },
                    color: "var(--morrow-palette-text-secondary)",
                    fontSize: { xs: "13px", sm: "14px" },
                    fontWeight: 500,
                    "&.Mui-selected": {
                      color: "var(--morrow-palette-text-primary)",
                    },
                  }}
                />
              ))}
            </Tabs>
            <button
              className={styles.sortButton}
              type="button"
              onClick={cycleSortOrder}
              aria-label={`정렬 기준: ${sortLabels[sortOrder]}`}
            >
              {sortLabels[sortOrder]} <KeyboardArrowDown />
            </button>
          </div>

          <p className={styles.resultCount}>{visibleProducts.length} objects</p>

          {visibleProducts.length > 0 ? (
            <div className={styles.shopGrid}>
              {visibleProducts.map((product) => (
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
          ) : (
            <div className={styles.emptyShop}>
              찾으시는 물건이 없어요. 다른 단어로 찾아보세요.
            </div>
          )}
        </section>
      </main>

      <footer className={styles.shopFooter}>
        <span>Make room for good things.</span>
        <Link href="/">Back to Morrow</Link>
      </footer>
    </div>
  );
}
