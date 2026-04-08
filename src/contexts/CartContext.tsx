import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import type { CartItem, Product } from "@/types/product";

interface CartContextType {
  items: CartItem[];

  addItem: (product: Product, quantity?: number) => void;

  removeItem: (productId: string) => void;

  updateQuantity: (
    productId: string,
    quantity: number
  ) => void;

  clearCart: () => void;

  totalItems: number;

  totalPrice: number;
}

const CartContext =
  createContext<CartContextType | undefined>(
    undefined
  );

const MAX_QTY = 99;
const STORAGE_KEY = "cart_items";

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {

  // 🔧 Carrega do localStorage
  const [items, setItems] =
    useState<CartItem[]>(() => {

      try {
        const stored =
          localStorage.getItem(STORAGE_KEY);

        return stored
          ? JSON.parse(stored)
          : [];

      } catch {
        return [];
      }

    });

  // 💾 Salva no localStorage
  useEffect(() => {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items)
    );

  }, [items]);

  // 🛒 Adicionar item
  const addItem = useCallback(
    (
      product: Product,
      quantity: number = 1
    ) => {

      if (!product || quantity <= 0)
        return;

      setItems(prev => {

        const existing =
          prev.find(
            i =>
              i.product.id === product.id
          );

        if (existing) {

          return prev.map(i => {

            if (
              i.product.id === product.id
            ) {

              const newQty =
                Math.min(
                  i.quantity + quantity,
                  MAX_QTY
                );

              return {
                ...i,
                quantity: newQty,
              };

            }

            return i;

          });

        }

        return [
          ...prev,
          {
            product,
            quantity: Math.min(
              quantity,
              MAX_QTY
            ),
          },
        ];

      });

    },
    []
  );

  // ❌ Remover item
  const removeItem = useCallback(
    (productId: string) => {

      setItems(prev =>
        prev.filter(
          i =>
            i.product.id !== productId
        )
      );

    },
    []
  );

  // 🔢 Atualizar quantidade
  const updateQuantity =
    useCallback(
      (
        productId: string,
        quantity: number
      ) => {

        if (quantity <= 0) {

          setItems(prev =>
            prev.filter(
              i =>
                i.product.id !==
                productId
            )
          );

          return;

        }

        const safeQty =
          Math.min(
            quantity,
            MAX_QTY
          );

        setItems(prev =>
          prev.map(i =>

            i.product.id === productId
              ? {
                  ...i,
                  quantity: safeQty,
                }
              : i

          )
        );

      },
      []
    );

  // 🧹 Limpar carrinho
  const clearCart = useCallback(() => {

    setItems([]);

  }, []);

  // 📊 Total de itens
  const totalItems = useMemo(() => {

    return items.reduce(
      (sum, i) =>
        sum + i.quantity,
      0
    );

  }, [items]);

  // 💰 Total do carrinho
  const totalPrice = useMemo(() => {

    return items.reduce(
      (sum, i) =>
        sum +
        i.product.price *
          i.quantity,
      0
    );

  }, [items]);

  return (

    <CartContext.Provider
      value={{

        items,

        addItem,

        removeItem,

        updateQuantity,

        clearCart,

        totalItems,

        totalPrice,

      }}
    >

      {children}

    </CartContext.Provider>

  );

}

export function useCart() {

  const ctx =
    useContext(CartContext);

  if (!ctx)
    throw new Error(
      "useCart must be used within CartProvider"
    );

  return ctx;

}
