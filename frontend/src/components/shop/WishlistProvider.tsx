"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { products } from "../../data/products";

type WishlistContextValue = {
  favoriteIds: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  clearWishlist: () => void;
};

const wishlistStorageKey = "morrow-wishlist";
const productIds = new Set(products.map((product) => product.id));
const WishlistContext = createContext<WishlistContextValue | null>(null);

function normalizeWishlist(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (productId): productId is string =>
      typeof productId === "string" && productIds.has(productId),
  );
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

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

  useEffect(() => {
    if (isHydrated) {
      window.localStorage.setItem(
        wishlistStorageKey,
        JSON.stringify(favoriteIds),
      );
    }
  }, [favoriteIds, isHydrated]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      favoriteIds,
      isFavorite: (productId) => favoriteIds.includes(productId),
      toggleFavorite: (productId) => {
        setFavoriteIds((currentIds) =>
          currentIds.includes(productId)
            ? currentIds.filter((id) => id !== productId)
            : [...currentIds, productId],
        );
      },
      clearWishlist: () => setFavoriteIds([]),
    }),
    [favoriteIds],
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
