"use client";

import { KeyboardArrowDown } from "@mui/icons-material";
import { Pagination } from "@mui/material";
import { ProductFilterTabs } from "../../components/shop/ProductFilterTabs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useCart } from "../../components/shop/CartProvider";
import { useCatalog } from "../../components/shop/CatalogProvider";
import { ProductCard } from "../../components/shop/ProductCard";
import { SiteHeader } from "../../components/shop/SiteHeader";
import {
  fetchProductPage,
  type CatalogPagination,
} from "../../repositories/catalog.repository";
import type { Product, ProductFilter } from "../../types/catalog";
import { useWishlist } from "../../components/shop/WishlistProvider";
import { sortLabels, type SortOrder } from "../../utils/catalog";
import styles from "./page.module.css";

function ShopContent() {
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ProductFilter | null>(
    null,
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>("recommended");
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<CatalogPagination | null>(null);
  const [isProductLoading, setIsProductLoading] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { totalItems, addItem } = useCart();
  const {
    categories,
    isLoading: isCatalogLoading,
    errorMessage: catalogError,
  } = useCatalog();
  const { isFavorite, isUpdating, toggleFavorite } = useWishlist();
  const requestedPage = Number(searchParams.get("page"));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
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

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const selectedCategoryId =
    activeFilter === "전체"
      ? null
      : categories.find(({ name }) => name === activeFilter)?.id ?? null;
  const serverSort =
    sortOrder === "priceAsc"
      ? "price_asc"
      : sortOrder === "priceDesc"
        ? "price_desc"
        : "created_at_desc";

  useEffect(() => {
    if (isCatalogLoading) {
      return;
    }

    let cancelled = false;

    const loadProducts = async () => {
      setIsProductLoading(true);
      setProductError(null);

      try {
        const result = await fetchProductPage({
          page,
          limit: 20,
          categoryId: selectedCategoryId,
          search: query,
          sort: serverSort,
          categoryNames,
        });

        if (!cancelled) {
          setProducts(result.products);
          setPagination(result.pagination);
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          setPagination(null);
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

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [
    categoryNames,
    isCatalogLoading,
    page,
    query,
    selectedCategoryId,
    serverSort,
  ]);

  const updatePageInUrl = (nextPage: number) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextPage === 1) {
      nextSearchParams.delete("page");
    } else {
      nextSearchParams.set("page", String(nextPage));
    }

    const nextQuery = nextSearchParams.toString();
    router.replace(nextQuery ? `/shop?${nextQuery}` : "/shop", {
      scroll: false,
    });
  };

  const changePage = (_: ChangeEvent<unknown>, nextPage: number) => {
    updatePageInUrl(nextPage);
  };

  const changeFilter = (nextFilter: ProductFilter) => {
    setSelectedFilter(nextFilter);
    updatePageInUrl(1);
  };

  const changeQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    updatePageInUrl(1);
  };

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
    updatePageInUrl(1);
  };

  const emptyMessage = isProductLoading || isCatalogLoading
    ? "상품 정보를 불러오는 중이에요."
    : catalogError || productError
      ? "상품 정보를 불러오지 못했어요."
      : pagination?.totalItems === 0
        ? "등록된 상품이 없어요."
        : "찾으시는 물건이 없어요. 다른 단어로 찾아보세요.";

  return (
    <div className={styles.shopPage}>
      <SiteHeader
        activeSection={null}
        cartCount={totalItems}
        query={query}
        onQueryChange={changeQuery}
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
            <ProductFilterTabs
              filters={filters}
              value={activeFilter}
              compact
              onChange={changeFilter}
            />
            <button
              className={styles.sortButton}
              type="button"
              onClick={cycleSortOrder}
              aria-label={`정렬 기준: ${sortLabels[sortOrder]}`}
            >
              {sortLabels[sortOrder]} <KeyboardArrowDown />
            </button>
          </div>

          <p className={styles.resultCount}>
            {pagination?.totalItems ?? products.length} objects
          </p>

          {products.length > 0 ? (
            <div className={styles.shopGrid}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={isFavorite(product.id)}
                  isAdded={false}
                  isFavoriteUpdating={isUpdating(product.id)}
                  onToggleFavorite={toggleFavorite}
                  onAddToCart={addItem}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyShop}>{emptyMessage}</div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={changePage}
                shape="rounded"
                sx={{
                  "& .MuiPaginationItem-root": {
                    color: "var(--morrow-palette-text-secondary)",
                    fontSize: "11px",
                  },
                  "& .MuiPaginationItem-root.Mui-selected": {
                    backgroundColor: "var(--morrow-palette-text-primary)",
                    color: "var(--morrow-palette-background-default)",
                  },
                }}
              />
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

export default function ShopPage() {
  return (
    <Suspense fallback={<div className={styles.shopPage} />}>
      <ShopContent />
    </Suspense>
  );
}
