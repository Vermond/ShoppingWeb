"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  requestAddCartItem,
  requestCart,
  requestRemoveCartItem,
  requestUpdateCartItem,
  type CartItemUnavailableReason,
  type CartProduct,
  type ServerCart,
} from "../../repositories/cart.repository";
import type { Product } from "../../types/catalog";
import { getMaxPurchasableQuantity } from "../../utils/cart";
import { useCatalog } from "./CatalogProvider";

export type CartItem = {
  productId: string;
  quantity: number;
  available?: boolean;
  unavailableReason?: CartItemUnavailableReason | null;
  product?: Product;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  isLoading: boolean;
  errorMessage: string | null;
  addItem: (productId: string) => Promise<boolean>;
  updateQuantity: (productId: string, quantity: number) => Promise<boolean>;
  removeItem: (productId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
};

const cartStorageKey = "morrow-cart";
const fallbackCartColor = "#ded9d2";
const CartContext = createContext<CartContextValue | null>(null);

function normalizeCart(
  value: unknown,
  products?: ReadonlyMap<string, Product>,
): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<CartItem[]>((cart, item) => {
    if (
      typeof item === "object" &&
      item !== null &&
      "productId" in item &&
      "quantity" in item &&
      typeof item.productId === "string" &&
      typeof item.quantity === "number" &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    ) {
      const product = products?.get(item.productId);

      if (products && !product) {
        return cart;
      }

      const quantity =
        product && product.stock > 0
          ? Math.min(item.quantity, getMaxPurchasableQuantity(product))
          : item.quantity;

      if (quantity > 0) {
        cart.push({ productId: item.productId, quantity });
      }
    }

    return cart;
  }, []);
}

function toDisplayProduct(
  product: CartProduct,
  categoryNames: ReadonlyMap<string, string>,
): Product {
  return {
    id: product.id,
    name: product.name,
    category: categoryNames.get(product.categoryId) ?? "기타",
    price: product.price,
    stock: product.stock,
    maxOrderQuantity: product.maxOrderQuantity,
    description: product.description ?? "",
    color: fallbackCartColor,
    art: "ceramic",
  };
}

function toServerCartItems(
  cart: ServerCart | null,
  categoryNames: ReadonlyMap<string, string>,
): CartItem[] {
  if (!cart) {
    return [];
  }

  return cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    available: item.available,
    unavailableReason: item.unavailableReason,
    ...(item.product
      ? { product: toDisplayProduct(item.product, categoryNames) }
      : {}),
  }));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "장바구니 요청을 처리하지 못했어요.";
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [serverCart, setServerCart] = useState<ServerCart | null>(null);
  const [serverCartError, setServerCartError] = useState<string | null>(null);
  const { status: authStatus } = useAuth();
  const {
    products,
    categories,
    isLoading: isCatalogLoading,
    errorMessage: catalogError,
  } = useCatalog();
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const isCatalogReady = !isCatalogLoading && !catalogError;
  const isAuthenticated = authStatus === "authenticated";

  useEffect(() => {
    const loadCart = () => {
      try {
        const storedCart = window.localStorage.getItem(cartStorageKey);
        setItems(normalizeCart(storedCart ? JSON.parse(storedCart) : []));
      } catch {
        setItems([]);
      } finally {
        setIsHydrated(true);
      }
    };

    const loadId = window.setTimeout(loadCart, 0);

    return () => window.clearTimeout(loadId);
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      const resetId = window.setTimeout(() => {
        setServerCart(null);
        setServerCartError(null);
      }, 0);

      return () => window.clearTimeout(resetId);
    }

    let active = true;

    const loadServerCart = async () => {
      try {
        const result = await requestCart();

        if (active) {
          setServerCart(result);
        }
      } catch (error) {
        if (active) {
          setServerCart(null);
          setServerCartError(getErrorMessage(error));
        }
      }
    };

    void loadServerCart();

    return () => {
      active = false;
    };
  }, [authStatus]);

  const availableItems = useMemo(
    () =>
      normalizeCart(
        items,
        isCatalogReady ? productsById : undefined,
      ),
    [isCatalogReady, items, productsById],
  );
  const serverItems = useMemo(
    () => toServerCartItems(serverCart, categoryNames),
    [categoryNames, serverCart],
  );
  const displayedItems = isAuthenticated ? serverItems : availableItems;
  const isServerCartLoading =
    isAuthenticated && serverCart === null && serverCartError === null;

  useEffect(() => {
    if (
      authStatus !== "unauthenticated" ||
      !isHydrated ||
      isCatalogLoading ||
      catalogError
    ) {
      return;
    }

    try {
      window.localStorage.setItem(
        cartStorageKey,
        JSON.stringify(availableItems),
      );
    } catch {
      // 저장소를 사용할 수 없는 환경에서도 장바구니 상태는 유지합니다.
    }
  }, [
    availableItems,
    authStatus,
    catalogError,
    isCatalogLoading,
    isHydrated,
  ]);

  const value = useMemo<CartContextValue>(() => {
    const localTotalItems = availableItems.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const localSubtotal = availableItems.reduce((total, item) => {
      const product = productsById.get(item.productId);
      return total + (product?.price ?? 0) * item.quantity;
    }, 0);
    const isLoading =
      !isHydrated ||
      authStatus === "loading" ||
      (isAuthenticated && isServerCartLoading);
    const totalItems = isAuthenticated
      ? serverCart?.totalQuantity ?? 0
      : localTotalItems;
    const subtotal = isAuthenticated
      ? serverCart?.totalPrice ?? 0
      : localSubtotal;

    const setServerCartResult = (result: ServerCart) => {
      setServerCart(result);
      setServerCartError(null);
    };

    return {
      items: displayedItems,
      totalItems,
      subtotal,
      isLoading,
      errorMessage: isAuthenticated ? serverCartError : null,
      addItem: async (productId) => {
        if (authStatus === "loading") {
          return false;
        }

        if (isAuthenticated) {
          if (isServerCartLoading) {
            return false;
          }

          try {
            const result = await requestAddCartItem(productId);
            setServerCartResult(result);
            return true;
          } catch (error) {
            setServerCartError(getErrorMessage(error));
            return false;
          }
        }

        const product = isCatalogReady
          ? productsById.get(productId)
          : undefined;
        const maximumQuantity = product
          ? getMaxPurchasableQuantity(product)
          : 0;
        const existingItem = availableItems.find(
          (item) => item.productId === productId,
        );

        if (
          !product ||
          maximumQuantity <= 0 ||
          (existingItem && existingItem.quantity >= maximumQuantity)
        ) {
          return false;
        }

        setItems((currentItems) => {
          const normalizedItems = normalizeCart(
            currentItems,
            isCatalogReady ? productsById : undefined,
          );
          const currentProduct = productsById.get(productId);

          if (!currentProduct) {
            return normalizedItems;
          }

          const currentMaximumQuantity =
            getMaxPurchasableQuantity(currentProduct);

          if (currentMaximumQuantity <= 0) {
            return normalizedItems;
          }

          const currentExistingItem = normalizedItems.find(
            (item) => item.productId === productId,
          );

          if (currentExistingItem) {
            if (currentExistingItem.quantity >= currentMaximumQuantity) {
              return normalizedItems;
            }

            return normalizedItems.map((item) =>
              item.productId === productId
                ? {
                    ...item,
                    quantity: Math.min(
                      item.quantity + 1,
                      currentMaximumQuantity,
                    ),
                  }
                : item,
            );
          }

          return [...normalizedItems, { productId, quantity: 1 }];
        });

        return true;
      },
      updateQuantity: async (productId, quantity) => {
        if (authStatus === "loading") {
          return false;
        }

        if (isAuthenticated) {
          if (isServerCartLoading) {
            return false;
          }

          try {
            const result =
              quantity <= 0
                ? await requestRemoveCartItem(productId)
                : await requestUpdateCartItem(productId, quantity);
            setServerCartResult(result);
            return true;
          } catch (error) {
            setServerCartError(getErrorMessage(error));
            return false;
          }
        }

        setItems((currentItems) => {
          const normalizedItems = normalizeCart(
            currentItems,
            isCatalogReady ? productsById : undefined,
          );

          if (quantity <= 0) {
            return normalizedItems.filter(
              (item) => item.productId !== productId,
            );
          }

          const product = productsById.get(productId);

          if (!product || product.stock <= 0) {
            return normalizedItems;
          }

          const maximumQuantity = getMaxPurchasableQuantity(product);

          if (maximumQuantity <= 0) {
            return normalizedItems;
          }

          return normalizedItems.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity: Math.min(quantity, maximumQuantity),
                }
              : item,
          );
        });

        return true;
      },
      removeItem: async (productId) => {
        if (authStatus === "loading") {
          return false;
        }

        if (isAuthenticated) {
          if (isServerCartLoading) {
            return false;
          }

          try {
            const result = await requestRemoveCartItem(productId);
            setServerCartResult(result);
            return true;
          } catch (error) {
            setServerCartError(getErrorMessage(error));
            return false;
          }
        }

        setItems((currentItems) =>
          currentItems.filter((item) => item.productId !== productId),
        );
        return true;
      },
      clearCart: async () => {
        if (authStatus === "loading") {
          return false;
        }

        if (isAuthenticated) {
          if (isServerCartLoading || !serverCart) {
            return false;
          }

          try {
            let result = serverCart;

            for (const item of serverCart.items) {
              result = await requestRemoveCartItem(item.productId);
            }

            setServerCartResult(result);
            return true;
          } catch (error) {
            setServerCartError(getErrorMessage(error));
            return false;
          }
        }

        setItems([]);
        return true;
      },
    };
  }, [
    authStatus,
    availableItems,
    displayedItems,
    isAuthenticated,
    isCatalogReady,
    isHydrated,
    isServerCartLoading,
    productsById,
    serverCart,
    serverCartError,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
