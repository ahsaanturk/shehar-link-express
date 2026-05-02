import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { useArea } from "@/hooks/useArea";
import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";
import {
  Search, Star, ShoppingBasket, LayoutGrid, Package as PackageIcon, Heart, Plus,
} from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";

type Tab = "stores" | "products" | "categories";
type StoresFilter = "popular" | "near";
type ProductsFilter = "popular" | "near";

interface Store {
  id: string; name: string; image_url: string | null; description: string | null;
  category_id: string | null; is_popular: boolean;
}
interface Product {
  id: string; name: string; price: number; image_url: string | null; store_id: string;
  stores?: { name: string } | null;
}
interface Category {
  id: string; name: string; slug: string; icon: string | null;
}

const PAGE = 20;

const Collections = () => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) ?? "stores";
  const storesFilter = (params.get("filter") as StoresFilter) ?? "popular";
  const productsFilter = (params.get("filter") as ProductsFilter) ?? "popular";
  const { selectedArea } = useArea();

  const [query, setQuery] = useState("");

  useSEO({
    title: "Browse Stores, Products & Categories | SheharLink",
    description: "Discover local stores, products and categories in Muzaffarabad. Popular and near you.",
  });

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    if (t === "stores" || t === "products") next.set("filter", "popular");
    else next.delete("filter");
    setParams(next, { replace: true });
  };
  const setFilter = (f: string) => {
    const next = new URLSearchParams(params);
    next.set("filter", f);
    setParams(next, { replace: true });
  };

  return (
    <div className="pb-4">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 pb-3 pt-3 backdrop-blur">
        <h1 className="text-lg font-bold">Collections</h1>
        <p className="text-xs text-muted-foreground">
          {selectedArea ? `Area: ${selectedArea.name}` : "Find stores, products or categories"}
        </p>

        {/* Tab toggle */}
        <div role="tablist" className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
          {(["stores", "products", "categories"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[11px] font-bold capitalize transition ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}>
              {t === "stores" ? <ShoppingBasket className="h-3.5 w-3.5" /> :
               t === "products" ? <PackageIcon className="h-3.5 w-3.5" /> :
               <LayoutGrid className="h-3.5 w-3.5" />}
              {t}
            </button>
          ))}
        </div>

        {(tab === "stores" || tab === "products") && (
          <>
            <div className="relative mt-3">
              <SearchAutocomplete />
            </div>
            <div className="mt-3 flex gap-2">
              <FilterChip active={(tab === "stores" ? storesFilter : productsFilter) === "popular"} onClick={() => setFilter("popular")}>Popular</FilterChip>
              <FilterChip active={(tab === "stores" ? storesFilter : productsFilter) === "near"} onClick={() => setFilter("near")}>Near You</FilterChip>
            </div>
          </>
        )}
      </header>

      {tab === "stores" && <StoresPanel filter={storesFilter} query={query} />}
      {tab === "products" && <ProductsPanel filter={productsFilter} query={query} />}
      {tab === "categories" && <CategoriesPanel />}
    </div>
  );
};

const FilterChip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}
    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
    }`}>
    {children}
  </button>
);

const StoresPanel = ({ filter, query }: { filter: StoresFilter; query: string }) => {
  const { selectedArea } = useArea();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      let areaIds: string[] | null = null;
      if (filter === "near" && selectedArea) {
        const { data } = await supabase.from("store_areas").select("store_id").eq("area_id", selectedArea.id);
        areaIds = (data ?? []).map((r: any) => r.store_id);
      }
      let q = supabase.from("stores")
        .select("id,name,image_url,description,category_id,is_popular")
        .eq("is_active", true);
      if (filter === "popular") q = q.eq("is_popular", true);
      if (filter === "near" && areaIds) {
        if (areaIds.length === 0) { setStores([]); setLoading(false); return; }
        q = q.in("id", areaIds);
      }
      q = q.order("sort_order").order("name");
      const { data } = await q;
      setStores((data ?? []) as Store[]);
      setLoading(false);
    })();
  }, [filter, selectedArea]);

  const filtered = useMemo(() => {
    if (!query.trim()) return stores;
    const qq = query.toLowerCase();
    return stores.filter((s) => s.name.toLowerCase().includes(qq));
  }, [stores, query]);

  return (
    <section className="p-4">
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No stores found.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => <StoreRow key={s.id} store={s} />)}
        </ul>
      )}
    </section>
  );
};

const StoreRow = ({ store }: { store: Store }) => {
  const { isStoreFav, toggleStore } = useFavorites();
  const fav = isStoreFav(store.id);
  return (
    <li>
      <Link to={`/store/${store.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 transition active:scale-[0.99]">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {store.image_url && <img src={store.image_url} alt={store.name} loading="lazy" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{store.name}</p>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-foreground">4.6</span>
            <span>·</span><span>20–30 min</span>
            {store.is_popular && <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">Popular</span>}
          </div>
        </div>
        <button onClick={(e) => { e.preventDefault(); toggleStore(store.id); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : ""}`} />
        </button>
      </Link>
    </li>
  );
};

const ProductsPanel = ({ filter, query }: { filter: ProductsFilter; query: string }) => {
  const { selectedArea } = useArea();
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [areaIds, setAreaIds] = useState<string[] | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setProducts([]); setPage(0); setHasMore(true);
    if (filter === "near" && selectedArea) {
      supabase.from("store_areas").select("store_id").eq("area_id", selectedArea.id)
        .then(({ data }) => setAreaIds((data ?? []).map((r: any) => r.store_id)));
    } else {
      setAreaIds(null);
    }
  }, [filter, selectedArea]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const from = page * PAGE;
    const to = from + PAGE - 1;
    
    // We must ensure the store is active
    let q = supabase.from("products")
      .select("id,name,price,image_url,store_id,stores!inner(name, slug, is_active)")
      .eq("is_available", true)
      .eq("is_visible", true)
      .eq("stores.is_active", true);
      
    if (filter === "popular") q = q.eq("is_popular", true);
    if (filter === "near") {
      if (!areaIds) { setLoading(false); return; }
      if (areaIds.length === 0) { setHasMore(false); setLoading(false); return; }
      q = q.in("store_id", areaIds);
    }
    q = q.order("sort_order").order("created_at", { ascending: false }).range(from, to);
    const { data } = await q;
    const list = (data ?? []) as any[];
    setProducts((prev) => [...prev, ...list]);
    setHasMore(list.length === PAGE);
    setPage((p) => p + 1);
    setLoading(false);
  }, [loading, hasMore, page, filter, areaIds]);

  useEffect(() => {
    if (filter === "popular" || (filter === "near" && areaIds !== null)) loadMore();
    // eslint-disable-next-line
  }, [filter, areaIds]);

  useEffect(() => {
    const el = sentinelRef.current; if (!el) return;
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting) loadMore(); }, { rootMargin: "200px" });
    obs.observe(el); return () => obs.disconnect();
  }, [loadMore]);

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const qq = query.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(qq));
  }, [products, query]);

  return (
    <section className="p-4">
      {filtered.length === 0 && !loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No products found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <Link key={p.id} to={`/product/${p.id}`} className="block overflow-hidden rounded-2xl border border-border bg-card transition active:scale-[0.98]">
              <div className="aspect-square w-full bg-muted">
                {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-bold">{p.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{p.stores?.name ?? "Store"}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs font-bold">Rs. {Math.round(p.price)}</p>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Plus className="h-3.5 w-3.5" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div ref={sentinelRef} className="h-10" />
      {loading && <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>}
    </section>
  );
};

const CategoriesPanel = () => {
  const [cats, setCats] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("categories")
        .select("id,name,slug,icon")
        .eq("is_visible", true).order("sort_order");
      setCats((data ?? []) as Category[]);
      const { data: storesData } = await supabase.from("stores")
        .select("category_id").eq("is_active", true);
      const map: Record<string, number> = {};
      (storesData ?? []).forEach((s: any) => { if (s.category_id) map[s.category_id] = (map[s.category_id] ?? 0) + 1; });
      setCounts(map);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <section className="p-4 grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</section>;
  }
  return (
    <section className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {cats.map((c) => {
          const Icon = (c.icon && (Icons as any)[c.icon]) || Icons.LayoutGrid;
          const n = counts[c.id] ?? 0;
          return (
            <Link key={c.id} to={`/category/${c.slug}`}
              className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.98]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><Icon className="h-6 w-6" /></span>
              <div>
                <p className="text-sm font-bold">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{n} store{n !== 1 ? "s" : ""}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default Collections;
