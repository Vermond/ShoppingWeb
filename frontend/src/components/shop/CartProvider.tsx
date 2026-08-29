"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "../../types/catalog";
import { getMaxPurchasableQuantity } from "../../utils/cart";
import { useCatalog } from "./CatalogProvider";

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (productId: string) => boolean;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const cartStorageKey = "morrow-cart";
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const {
    products,
    isLoading: isCatalogLoading,
    errorMessage: catalogError,
  } = useCatalog();
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const isCatalogReady = !isCatalogLoading && !catalogError;

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

  const availableItems = useMemo(
    () =>
      normalizeCart(
        items,
        isCatalogReady ? productsById : undefined,
      ),
    [isCatalogReady, items, productsById],
  );

  useEffect(() => {
    if (!isHydrated || isCatalogLoading || catalogError) {
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
  }, [availableItems, catalogError, isCatalogLoading, isHydrated]);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = availableItems.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const subtotal = availableItems.reduce((total, item) => {
      const product = products.find(({ id }) => id === item.productId);
      return total + (product?.price ?? 0) * item.quantity;
    }, 0);

    return {
      items: availableItems,
      totalItems,
      subtotal,
      addItem: (productId) => {
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
      updateQuantity: (productId, quantity) => {
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
      },
      removeItem: (productId) => {
        setItems((currentItems) =>
          currentItems.filter((item) => item.productId !== productId),
        );
      },
      clearCart: () => setItems([]),
    };
  }, [availableItems, isCatalogReady, products, productsById]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
