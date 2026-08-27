"use client";

import { KeyboardArrowDown } from "@mui/icons-material";
import { Tab, Tabs } from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useCart } from "../../components/shop/CartProvider";
import { useCatalog } from "../../components/shop/CatalogProvider";
import { ProductCard } from "../../components/shop/ProductCard";
import { SiteHeader } from "../../components/shop/SiteHeader";
import { useWishlist } from "../../components/shop/WishlistProvider";
import type { ProductFilter } from "../../types/catalog";
import {
  filterAndSortProducts,
  sortLabels,
  type SortOrder,
} from "../../utils/catalog";
import styles from "./page.module.css";

function ShopContent() {
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ProductFilter | null>(
    null,
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>("recommended");
  const searchParams = useSearchParams();
  const { totalItems, addItem } = useCart();
  const { products, categories, isLoading, errorMessage } = useCatalog();
  const { isFavorite, toggleFavorite } = useWishlist();
  const requestedCategoryId = searchParams.get("categoryId");
  const requestedCategory = categories.find(
    ({ id }) => id === requestedCategoryId,
  )?.name;
  const filters = useMemo<ProductFilter[]>(
    () => ["전체", ...categories.map((category) => category.name)],
    [categories],
  );

  const activeFilter =
    selectedFilter ??
    (requestedCategory &&
    categories.some(({ name }) => name === requestedCategory)
      ? requestedCategory
      : "전체");

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
        : "찾으시는 물건이 없어요. 다른 단어로 찾아보세요.";

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
              onChange={(_, value: ProductFilter) => setSelectedFilter(value)}
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
                  isFavorite={isFavorite(product.id)}
                  isAdded={false}
                  onToggleFavorite={toggleFavorite}
                  onAddToCart={addItem}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyShop}>{emptyMessage}</div>
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

export default function ShopPage() {
  return (
    <Suspense fallback={<div className={styles.shopPage} />}>
      <ShopContent />
    </Suspense>
  );
}
