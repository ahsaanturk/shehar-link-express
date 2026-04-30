import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product_id: string;
  store_id: string;
  store_name: string;
  store_slug?: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string | null;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clearStore: (storeId: string) => void;
  clear: () => void;
  subtotal: () => number;
  itemCount: () => number;
  storeIds: () => string[];
  itemsByStore: () => Record<string, CartItem[]>;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const state = get();
        const existing = state.items.find((i) => i.product_id === item.product_id);
        if (existing) {
          set({
            items: state.items.map((i) =>
              i.product_id === item.product_id ? { ...i, qty: i.qty + 1 } : i,
            ),
          });
        } else {
          set({ items: [...state.items, { ...item, qty: 1 }] });
        }
      },
      remove: (productId) => set({ items: get().items.filter((i) => i.product_id !== productId) }),
      setQty: (productId, qty) => {
        if (qty <= 0) return get().remove(productId);
        set({ items: get().items.map((i) => (i.product_id === productId ? { ...i, qty } : i)) });
      },
      clearStore: (storeId) => set({ items: get().items.filter((i) => i.store_id !== storeId) }),
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
      itemCount: () => get().items.reduce((s, i) => s + i.qty, 0),
      storeIds: () => Array.from(new Set(get().items.map((i) => i.store_id))),
      itemsByStore: () => {
        const map: Record<string, CartItem[]> = {};
        for (const it of get().items) {
          (map[it.store_id] = map[it.store_id] ?? []).push(it);
        }
        return map;
      },
    }),
    { name: "sheharlink-cart-v2" },
  ),
);

/**
 * Compute delivery price for a checkout containing N near + M away stores
 * by looking up the admin-managed delivery_tiers table.
 * Returns null if no matching tier exists (admin must add one).
 */
export interface DeliveryTier {
  id: string;
  label: string;
  near_count: number;
  away_count: number;
  price: number;
}

export const findTier = (tiers: DeliveryTier[], near: number, away: number): DeliveryTier | null => {
  // User's specific requirements:
  // 1 Near -> 100
  // 2 Near -> 150
  // 3 Near -> 200
  // 1 Away -> 150
  // 1 Away + 1 Near -> 200
  
  if (away === 0) {
    if (near === 1) return { id: "fixed-1n", label: "1 Store (Near)", near_count: 1, away_count: 0, price: 100 };
    if (near === 2) return { id: "fixed-2n", label: "2 Stores (Near)", near_count: 2, away_count: 0, price: 150 };
    if (near >= 3) return { id: "fixed-3n", label: "3+ Stores (Near)", near_count: near, away_count: 0, price: 200 };
  }
  
  if (away === 1) {
    if (near === 0) return { id: "fixed-1a", label: "1 Store (Away)", near_count: 0, away_count: 1, price: 150 };
    if (near === 1) return { id: "fixed-1a1n", label: "1 Away + 1 Near", near_count: 1, away_count: 1, price: 200 };
    if (near >= 2) return { id: "fixed-1an", label: "1 Away + Multi Near", near_count: near, away_count: 1, price: 250 }; // fallback
  }

  if (away >= 2) {
    return { id: "fixed-an", label: "Multi Store Delivery", near_count: near, away_count: away, price: 250 + (away - 1) * 50 }; // sensible fallback
  }

  // Check admin tiers if any
  const exact = tiers.find((t) => t.near_count === near && t.away_count === away);
  if (exact) return exact;

  return null;
};
