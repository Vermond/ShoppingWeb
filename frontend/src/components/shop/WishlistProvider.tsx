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
import {
  requestAddWishlistItem,
  requestRemoveWishlistItem,
  requestWishlistItems,
} from "../../repositories/wishlist.repository";
import type { WishlistItem } from "../../types/wishlist";
import { useCatalog } from "./CatalogProvider";

type WishlistContextValue = {
  favoriteIds: string[];
  wishlistItems: WishlistItem[];
  isLoading: boolean;
  errorMessage: string | null;
  isUpdating: (productId: string) => boolean;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  clearWishlist: () => Promise<boolean>;
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
  const [localFavoriteIds, setLocalFavoriteIds] = useState<string[]>([]);
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
        setLocalFavoriteIds(
          normalizeWishlist(storedWishlist ? JSON.parse(storedWishlist) : []),
        );
      } catch {
        setLocalFavoriteIds([]);
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

  const availableLocalFavoriteIds = useMemo(
    () =>
      normalizeWishlist(
        localFavoriteIds,
        !isCatalogLoading && !catalogError ? productIds : undefined,
      ),
    [catalogError, isCatalogLoading, localFavoriteIds, productIds],
  );

  useEffect(() => {
    if (
      !isHydrated ||
      authStatus !== "unauthenticated" ||
      isCatalogLoading ||
      catalogError
    ) {
      return;
    }

    try {
      window.localStorage.setItem(
        wishlistStorageKey,
        JSON.stringify(availableLocalFavoriteIds),
      );
    } catch {
      // 저장소를 사용할 수 없는 환경에서도 찜 상태는 유지합니다.
    }
  }, [
    authStatus,
    availableLocalFavoriteIds,
    catalogError,
    isCatalogLoading,
    isHydrated,
  ]);

  const favoriteIds = useMemo(() => {
    if (authStatus === "authenticated") {
      return isServerWishlistLoaded ? serverFavoriteIds : [];
    }

    if (authStatus === "unauthenticated") {
      return availableLocalFavoriteIds;
    }

    return [];
  }, [
    authStatus,
    availableLocalFavoriteIds,
    isServerWishlistLoaded,
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
      wishlistItems:
        authStatus === "authenticated" && isServerWishlistLoaded
          ? serverItems
          : [],
      isLoading,
      errorMessage:
        authStatus === "authenticated" ? serverWishlistError : null,
      isUpdating: (productId) => updatingProductIds.includes(productId),
      isFavorite: (productId) => favoriteIds.includes(productId),
      toggleFavorite: async (productId) => {
        if (updatingProductIdsRef.current.has(productId)) {
          return false;
        }

        if (authStatus === "loading") {
          return false;
        }

        if (authStatus === "unauthenticated") {
          if (!productIds.has(productId)) {
            return false;
          }

          setLocalFavoriteIds((currentIds) => {
            const normalizedIds = normalizeWishlist(currentIds, productIds);

            return normalizedIds.includes(productId)
              ? normalizedIds.filter((id) => id !== productId)
              : [...normalizedIds, productId];
          });
          return true;
        }

        if (!isServerWishlistLoaded) {
          return false;
        }

        const wasFavorite = serverFavoriteIds.includes(productId);

        if (!productIds.has(productId) && !wasFavorite) {
          return false;
        }

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
      productIds,
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
