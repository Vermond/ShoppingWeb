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

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const cartStorageKey = "morrow-cart";
const CartContext = createContext<CartContextValue | null>(null);

function normalizeCart(
  value: unknown,
  productIds?: ReadonlySet<string>,
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
      (!productIds || productIds.has(item.productId)) &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    ) {
      cart.push({ productId: item.productId, quantity: item.quantity });
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
  const productIds = useMemo(
    () => new Set(products.map((product) => product.id)),
    [products],
  );

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
        !isCatalogLoading && !catalogError ? productIds : undefined,
      ),
    [catalogError, isCatalogLoading, items, productIds],
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
        setItems((currentItems) => {
          const normalizedItems = normalizeCart(currentItems, productIds);

          if (!productIds.has(productId)) {
            return currentItems;
          }

          const existingItem = normalizedItems.find(
            (item) => item.productId === productId,
          );

          if (existingItem) {
            return normalizedItems.map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            );
          }

          return [...normalizedItems, { productId, quantity: 1 }];
        });
      },
      updateQuantity: (productId, quantity) => {
        setItems((currentItems) => {
          if (quantity <= 0) {
            return currentItems.filter((item) => item.productId !== productId);
          }

          return currentItems.map((item) =>
            item.productId === productId ? { ...item, quantity } : item,
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
  }, [availableItems, productIds, products]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
