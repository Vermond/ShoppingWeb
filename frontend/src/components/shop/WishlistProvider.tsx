"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/AuthProvider";
import { fetchProductById } from "../../repositories/catalog.repository";
import {
  requestAddWishlistItem,
  requestRemoveWishlistItem,
  requestWishlistItems,
} from "../../repositories/wishlist.repository";
import type { Product } from "../../types/catalog";
import type { WishlistItem } from "../../types/wishlist";
import { isProduct } from "../../utils/catalog";
import { useCatalog } from "./CatalogProvider";

type WishlistContextValue = {
  favoriteIds: string[];
  wishlistItems: WishlistItem[];
  isLoading: boolean;
  errorMessage: string | null;
  isUpdating: (productId: string) => boolean;
  isFavorite: (productId: string) => boolean;
  localProducts: Product[];
  toggleFavorite: (productId: string, product?: Product) => void;
  clearWishlist: () => Promise<boolean>;
};

const wishlistStorageKey = "morrow-wishlist";
const WishlistContext = createContext<WishlistContextValue | null>(null);

function normalizeWishlist(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<string[]>((productIds, item) => {
    const productId =
      typeof item === "string"
        ? item
        : typeof item === "object" &&
            item !== null &&
            "productId" in item &&
            typeof item.productId === "string"
          ? item.productId
          : null;

    if (productId && !productIds.includes(productId)) {
      productIds.push(productId);
    }

    return productIds;
  }, []);
}

function readStoredWishlist(value: unknown) {
  const productIds = normalizeWishlist(value);
  const products: Record<string, Product> = {};

  if (!Array.isArray(value)) {
    return { productIds, products };
  }

  value.forEach((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !("productId" in item) ||
      typeof item.productId !== "string" ||
      !("product" in item) ||
      !isProduct(item.product) ||
      item.product.id !== item.productId
    ) {
      return;
    }

    products[item.productId] = item.product;
  });

  return { productIds, products };
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [localFavoriteIds, setLocalFavoriteIds] = useState<string[]>([]);
  const [localFavoriteProducts, setLocalFavoriteProducts] = useState<
    Record<string, Product>
  >({});
  const [serverFavoriteIds, setServerFavoriteIds] = useState<string[]>([]);
  const [serverItems, setServerItems] = useState<WishlistItem[]>([]);
  const [isServerWishlistLoading, setIsServerWishlistLoading] = useState(false);
  const [isServerWishlistLoaded, setIsServerWishlistLoaded] = useState(false);
  const [serverWishlistError, setServerWishlistError] = useState<string | null>(
    null,
  );
  const [updatingProductIds, setUpdatingProductIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const serverLoadStarted = useRef(false);
  const updatingProductIdsRef = useRef(new Set<string>());
  const { status: authStatus } = useAuth();
  const { products } = useCatalog();
  const catalogProductsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  useEffect(() => {
    const loadWishlist = () => {
      try {
        const storedWishlist = window.localStorage.getItem(wishlistStorageKey);
        const stored = readStoredWishlist(
          storedWishlist ? JSON.parse(storedWishlist) : [],
        );
        setLocalFavoriteIds(stored.productIds);
        setLocalFavoriteProducts(stored.products);
      } catch {
        setLocalFavoriteIds([]);
        setLocalFavoriteProducts({});
      } finally {
        setIsHydrated(true);
      }
    };

    const loadId = window.setTimeout(loadWishlist, 0);

    return () => window.clearTimeout(loadId);
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      serverLoadStarted.current = false;
    }
  }, [authStatus]);

  useEffect(() => {
    if (
      !isHydrated ||
      authStatus !== "authenticated" ||
      serverLoadStarted.current
    ) {
      return;
    }

    serverLoadStarted.current = true;
    let active = true;

    const loadServerWishlist = async () => {
      setIsServerWishlistLoading(true);
      setIsServerWishlistLoaded(false);
      setServerWishlistError(null);
      setServerFavoriteIds([]);
      setServerItems([]);

      try {
        const items = await requestWishlistItems();

        if (active) {
          setServerItems(items);
          setServerFavoriteIds(items.map((item) => item.productId));
          setServerWishlistError(null);
        }
      } catch (error) {
        if (active) {
          setServerItems([]);
          setServerFavoriteIds([]);
          setServerWishlistError(
            error instanceof Error
              ? error.message
              : "찜 목록을 불러오지 못했어요.",
          );
        }
      } finally {
        if (active) {
          setIsServerWishlistLoading(false);
          setIsServerWishlistLoaded(true);
        }
      }
    };

    void loadServerWishlist();

    return () => {
      active = false;
    };
  }, [authStatus, isHydrated]);

  useEffect(() => {
    if (!isHydrated || authStatus !== "unauthenticated") {
      return;
    }

    const unresolvedProductIds = localFavoriteIds.filter(
      (productId) =>
        !catalogProductsById.has(productId) &&
        !localFavoriteProducts[productId],
    );

    if (unresolvedProductIds.length === 0) {
      return;
    }

    let active = true;

    const loadProducts = async () => {
      const results = await Promise.all(
        unresolvedProductIds.map(async (productId) => {
          try {
            return await fetchProductById(productId);
          } catch {
            return null;
          }
        }),
      );

      if (!active) {
        return;
      }

      const resolvedProducts = results.filter(
        (product): product is NonNullable<typeof product> => product !== null,
      );

      if (resolvedProducts.length === 0) {
        return;
      }

      setLocalFavoriteProducts((currentProducts) => {
        const nextProducts = { ...currentProducts };

        resolvedProducts.forEach((product) => {
          nextProducts[product.id] = product;
        });

        return nextProducts;
      });
    };

    void loadProducts();

    return () => {
      active = false;
    };
  }, [
    authStatus,
    catalogProductsById,
    isHydrated,
    localFavoriteIds,
    localFavoriteProducts,
  ]);

  const localProducts = useMemo(
    () => Object.values(localFavoriteProducts),
    [localFavoriteProducts],
  );

  useEffect(() => {
    if (!isHydrated || authStatus !== "unauthenticated") {
      return;
    }

    try {
      const storedWishlist = localFavoriteIds.map((productId) => ({
        productId,
        ...(localFavoriteProducts[productId]
          ? { product: localFavoriteProducts[productId] }
          : {}),
      }));

      window.localStorage.setItem(
        wishlistStorageKey,
        JSON.stringify(storedWishlist),
      );
    } catch {
      // 저장소를 사용할 수 없는 환경에서도 찜 상태는 유지합니다.
    }
  }, [
    authStatus,
    isHydrated,
    localFavoriteIds,
    localFavoriteProducts,
  ]);

  const favoriteIds = useMemo(() => {
    if (authStatus === "authenticated") {
      return isServerWishlistLoaded ? serverFavoriteIds : [];
    }

    if (authStatus === "unauthenticated") {
      return localFavoriteIds;
    }

    return [];
  }, [
    authStatus,
    isServerWishlistLoaded,
    localFavoriteIds,
    serverFavoriteIds,
  ]);

  const isLoading =
    !isHydrated ||
    authStatus === "loading" ||
    (authStatus === "authenticated" &&
      (isServerWishlistLoading || !isServerWishlistLoaded));

  const setUpdating = (productId: string, updating: boolean) => {
    const nextIds = new Set(updatingProductIdsRef.current);

    if (updating) {
      nextIds.add(productId);
    } else {
      nextIds.delete(productId);
    }

    updatingProductIdsRef.current = nextIds;
    setUpdatingProductIds([...nextIds]);
  };

  const value = useMemo<WishlistContextValue>(
    () => ({
      favoriteIds,
      localProducts,
      wishlistItems:
        authStatus === "authenticated" && isServerWishlistLoaded
          ? serverItems
          : [],
      isLoading,
      errorMessage:
        authStatus === "authenticated" ? serverWishlistError : null,
      isUpdating: (productId) => updatingProductIds.includes(productId),
      isFavorite: (productId) => favoriteIds.includes(productId),
      toggleFavorite: async (productId, productSnapshot) => {
        if (updatingProductIdsRef.current.has(productId)) {
          return false;
        }

        if (authStatus === "loading") {
          return false;
        }

        if (authStatus === "unauthenticated") {
          const wasFavorite = localFavoriteIds.includes(productId);

          setLocalFavoriteIds((currentIds) => {
            return currentIds.includes(productId)
              ? currentIds.filter((id) => id !== productId)
              : [...currentIds, productId];
          });

          setLocalFavoriteProducts((currentProducts) => {
            if (wasFavorite) {
              const nextProducts = { ...currentProducts };
              delete nextProducts[productId];
              return nextProducts;
            }

            if (productSnapshot?.id !== productId) {
              return currentProducts;
            }

            return {
              ...currentProducts,
              [productId]: productSnapshot,
            };
          });

          return true;
        }

        if (!isServerWishlistLoaded) {
          return false;
        }

        const wasFavorite = serverFavoriteIds.includes(productId);

        const previousFavoriteIds = serverFavoriteIds;
        const previousItems = serverItems;

        setUpdating(productId, true);
        setServerWishlistError(null);
        setServerFavoriteIds((currentIds) =>
          wasFavorite
            ? currentIds.filter((id) => id !== productId)
            : currentIds.includes(productId)
              ? currentIds
              : [...currentIds, productId],
        );

        if (wasFavorite) {
          setServerItems((currentItems) =>
            currentItems.filter((item) => item.productId !== productId),
          );
        }

        try {
          if (wasFavorite) {
            await requestRemoveWishlistItem(productId);
          } else {
            const item = await requestAddWishlistItem(productId);

            setServerItems((currentItems) => [
              ...currentItems.filter(
                (currentItem) => currentItem.productId !== productId,
              ),
              item,
            ]);
          }

          return true;
        } catch (error) {
          setServerFavoriteIds(previousFavoriteIds);
          setServerItems(previousItems);
          setServerWishlistError(
            error instanceof Error
              ? error.message
              : "찜 상태를 변경하지 못했어요.",
          );
          return false;
        } finally {
          setUpdating(productId, false);
        }
      },
      clearWishlist: async () => {
        if (authStatus === "unauthenticated") {
          setLocalFavoriteIds([]);
          setLocalFavoriteProducts({});
          return true;
        }

        if (
          authStatus !== "authenticated" ||
          !isServerWishlistLoaded ||
          updatingProductIdsRef.current.size > 0
        ) {
          return false;
        }

        const previousFavoriteIds = serverFavoriteIds;
        const previousItems = serverItems;

        previousFavoriteIds.forEach((productId) =>
          setUpdating(productId, true),
        );
        setServerFavoriteIds([]);
        setServerItems([]);

        try {
          await Promise.all(
            previousFavoriteIds.map((productId) =>
              requestRemoveWishlistItem(productId),
            ),
          );
          return true;
        } catch (error) {
          setServerFavoriteIds(previousFavoriteIds);
          setServerItems(previousItems);
          setServerWishlistError(
            error instanceof Error
              ? error.message
              : "찜 목록을 비우지 못했어요.",
          );
          return false;
        } finally {
          previousFavoriteIds.forEach((productId) =>
            setUpdating(productId, false),
          );
        }
      },
    }),
    [
      authStatus,
      favoriteIds,
      isLoading,
      isServerWishlistLoaded,
      localFavoriteIds,
      localProducts,
      serverFavoriteIds,
      serverItems,
      serverWishlistError,
      updatingProductIds,
    ],
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
