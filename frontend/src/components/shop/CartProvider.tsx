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
const productIds = new Set(products.map((product) => product.id));

const CartContext = createContext<CartContextValue | null>(null);

function normalizeCart(value: unknown): CartItem[] {
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
      productIds.has(item.productId) &&
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
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
  }, [isHydrated, items]);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => {
      const product = products.find(({ id }) => id === item.productId);
      return total + (product?.price ?? 0) * item.quantity;
    }, 0);

    return {
      items,
      totalItems,
      subtotal,
      addItem: (productId) => {
        setItems((currentItems) => {
          const existingItem = currentItems.find(
            (item) => item.productId === productId,
          );

          if (existingItem) {
            return currentItems.map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            );
          }

          return [...currentItems, { productId, quantity: 1 }];
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
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
