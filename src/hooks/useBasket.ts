"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BasketItem {
  productId: string;
  productName: string;
  productSlug: string;
  brand: string | null;
  imageUrl: string | null;
  weight: number | null;
  weightUnit: string | null;
  quantity: number;
}

interface BasketStore {
  items: BasketItem[];
  preferredStores: Record<string, string>;
  addItem: (item: Omit<BasketItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearBasket: () => void;
  itemCount: () => number;
  setPreferredStore: (productId: string, storeId: string) => void;
  clearPreferredStore: (productId: string) => void;
}

export const useBasket = create<BasketStore>()(
  persist(
    (set, get) => ({
      items: [],
      preferredStores: {} as Record<string, string>,
      setPreferredStore: (productId: string, storeId: string) =>
        set((state) => ({
          preferredStores: { ...state.preferredStores, [productId]: storeId },
        })),
      clearPreferredStore: (productId: string) =>
        set((state) => {
          const { [productId]: _, ...rest } = state.preferredStores;
          return { preferredStores: rest };
        }),
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.productId !== productId) };
          }
          return {
            items: state.items.map((i) =>
              i.productId === productId ? { ...i, quantity } : i
            ),
          };
        }),
      clearBasket: () => set({ items: [] }),
      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "grocerysaver-basket",
    }
  )
);
