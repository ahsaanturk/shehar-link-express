import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  productIds: string[];
  storeIds: string[];
  toggleProduct: (id: string) => void;
  toggleStore: (id: string) => void;
  isProductFav: (id: string) => boolean;
  isStoreFav: (id: string) => boolean;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      productIds: [],
      storeIds: [],
      toggleProduct: (id) =>
        set((s) => ({
          productIds: s.productIds.includes(id)
            ? s.productIds.filter((x) => x !== id)
            : [...s.productIds, id],
        })),
      toggleStore: (id) =>
        set((s) => ({
          storeIds: s.storeIds.includes(id)
            ? s.storeIds.filter((x) => x !== id)
            : [...s.storeIds, id],
        })),
      isProductFav: (id) => get().productIds.includes(id),
      isStoreFav: (id) => get().storeIds.includes(id),
    }),
    { name: "sheharlink-favorites" },
  ),
);
