"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useCatalog } from "./CatalogProvider";

type WishlistContextValue = {
  favoriteIds: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  clearWishlist: () => void;
};

const wishlistStorageKey = "morrow-wishlist";
const WishlistContext = createContext<WishlistContextValue | null>(null);

function normalizeWishlist(value: unknown, productIds?: ReadonlySet<string>) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (productId): productId is string =>
      typeof productId === "string" &&
      (!productIds || productIds.has(productId)),
  );
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const {
    products,
    isLoading: isCatalogLoading,
    errorMessage: catalogError,
  } = useCatalog();
  const productIds = useMemo(
    () => new Set(products.map((product) => product.id)),
    [products],
  );

  useEffect(() => {
    const loadWishlist = () => {
      try {
        const storedWishlist = window.localStorage.getItem(wishlistStorageKey);
        setFavoriteIds(
          normalizeWishlist(storedWishlist ? JSON.parse(storedWishlist) : []),
        );
      } catch {
        setFavoriteIds([]);
      } finally {
        setIsHydrated(true);
      }
    };

    const loadId = window.setTimeout(loadWishlist, 0);

    return () => window.clearTimeout(loadId);
  }, []);

  const availableFavoriteIds = useMemo(
    () =>
      normalizeWishlist(
        favoriteIds,
        !isCatalogLoading && !catalogError ? productIds : undefined,
      ),
    [catalogError, favoriteIds, isCatalogLoading, productIds],
  );

  useEffect(() => {
    if (!isHydrated || isCatalogLoading || catalogError) {
      return;
    }

    try {
      window.localStorage.setItem(
        wishlistStorageKey,
        JSON.stringify(availableFavoriteIds),
      );
    } catch {
      // 저장소를 사용할 수 없는 환경에서도 찜 상태는 유지합니다.
    }
  }, [availableFavoriteIds, catalogError, isCatalogLoading, isHydrated]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      favoriteIds: availableFavoriteIds,
      isFavorite: (productId) => availableFavoriteIds.includes(productId),
      toggleFavorite: (productId) => {
        if (!productIds.has(productId)) {
          return;
        }

        setFavoriteIds((currentIds) => {
          const normalizedIds = normalizeWishlist(currentIds, productIds);

          return normalizedIds.includes(productId)
            ? normalizedIds.filter((id) => id !== productId)
            : [...normalizedIds, productId];
        });
      },
      clearWishlist: () => setFavoriteIds([]),
    }),
    [availableFavoriteIds, productIds],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }

  return context;
}
