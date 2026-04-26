import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string | null;
}

interface CartState {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  add: (storeId: string, storeName: string, item: Omit<CartItem, "qty">) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
  itemCount: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      storeName: null,
      items: [],
      add: (storeId, storeName, item) => {
        const state = get();
        // If switching store, reset cart
        if (state.storeId && state.storeId !== storeId) {
          set({ storeId, storeName, items: [{ ...item, qty: 1 }] });
          return;
        }
        const existing = state.items.find((i) => i.product_id === item.product_id);
        if (existing) {
          set({
            storeId,
            storeName,
            items: state.items.map((i) =>
              i.product_id === item.product_id ? { ...i, qty: i.qty + 1 } : i,
            ),
          });
        } else {
          set({ storeId, storeName, items: [...state.items, { ...item, qty: 1 }] });
        }
      },
      remove: (productId) => {
        const items = get().items.filter((i) => i.product_id !== productId);
        set({ items, ...(items.length === 0 ? { storeId: null, storeName: null } : {}) });
      },
      setQty: (productId, qty) => {
        if (qty <= 0) return get().remove(productId);
        set({
          items: get().items.map((i) => (i.product_id === productId ? { ...i, qty } : i)),
        });
      },
      clear: () => set({ storeId: null, storeName: null, items: [] }),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
      itemCount: () => get().items.reduce((s, i) => s + i.qty, 0),
    }),
    { name: "sheharlink-cart" },
  ),
);

export const DELIVERY_FEE = 50;
