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
  // exact match
  const exact = tiers.find((t) => t.near_count === near && t.away_count === away);
  if (exact) return exact;
  // fallback: highest "near" tier when near>=3
  if (near >= 3 && away === 0) {
    return tiers.find((t) => t.near_count >= 3 && t.away_count === 0) ?? null;
  }
  return null;
};
