import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Star, Plus, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { useArea } from "@/hooks/useArea";

interface Store {
  id: string; name: string; image_url: string | null; description: string | null;
  category_id: string | null; is_popular: boolean;
}
interface Product {
  id: string; name: string; price: number; image_url: string | null; store_id: string;
  stores?: { name: string; category_id: string | null } | null;
}
interface Category { id: string; name: string; slug: string; }

const PAGE = 12;

const CategoryDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { selectedArea } = useArea();
  const [category, setCategory] = useState<Category | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [showAllStores, setShowAllStores] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Get area-restricted store ids
  const [areaStoreIds, setAreaStoreIds] = useState<string[] | null>(null);
  useEffect(() => {
    if (!selectedArea) { setAreaStoreIds(null); return; }
    supabase.from("store_areas").select("store_id").eq("area_id", selectedArea.id)
      .then(({ data }) => setAreaStoreIds((data ?? []).map((r: any) => r.store_id)));
  }, [selectedArea]);

  // Load category + initial stores
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setProducts([]); setPage(0); setHasMore(true);
    (async () => {
      const { data: cat } = await supabase.from("categories").select("id,name,slug").eq("slug", slug).maybeSingle();
      if (!cat) { setLoading(false); return; }
      setCategory(cat as Category);
      const { data: storeData } = await supabase
        .from("stores")
        .select("id,name,image_url,description,is_popular,store_categories!inner(category_id)")
        .eq("store_categories.category_id", cat.id)
        .eq("is_active", true)
        .order("is_popular", { ascending: false });
      setStores((storeData ?? []) as any[]);
      setLoading(false);
    })();
  }, [slug]);

  const loadMore = useCallback(async () => {
    if (!category || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const from = page * PAGE;
    const to = from + PAGE - 1;
    let q = supabase
      .from("products")
      .select("id,name,price,image_url,store_id,stores!inner(name, slug, is_active, store_categories!inner(category_id))")
      .eq("is_available", true)
      .eq("is_visible", true)
      .eq("stores.is_active", true)
      .eq("stores.store_categories.category_id", category.id)
      .order("created_at", { ascending: false })
      .range(from, to);
    const { data } = await q;
    let list = (data ?? []) as any[];
    if (areaStoreIds) list = list.filter((p) => areaStoreIds.includes(p.store_id));
    setProducts((prev) => [...prev, ...list]);
    setHasMore(list.length === PAGE);
    setPage((p) => p + 1);
    setLoadingMore(false);
  }, [category, page, hasMore, loadingMore, areaStoreIds]);

  useEffect(() => { if (category) loadMore(); /* eslint-disable-next-line */ }, [category, areaStoreIds]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const visibleStores = showAllStores ? stores : stores.slice(0, 4);

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
        <Link to="/categories"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-base font-bold">{category?.name ?? "Category"}</h1>
      </header>

      {loading ? (
        <div className="space-y-3 p-4">
          {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : !category ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Category not found.</p>
      ) : (
        <>
          {/* Stores */}
          <section className="px-4 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">Stores ({stores.length})</h2>
              {stores.length > 4 && (
                <button onClick={() => setShowAllStores((v) => !v)} className="text-xs font-semibold text-primary">
                  {showAllStores ? "Show less" : "View more ›"}
                </button>
              )}
            </div>
            {stores.length === 0 ? (
              <p className="text-xs text-muted-foreground">No stores in this category yet.</p>
            ) : (
              <ul className="space-y-2">
                {visibleStores.map((s) => <StoreRow key={s.id} store={s} />)}
              </ul>
            )}
          </section>

          {/* Products */}
          <section className="px-4 pt-6">
            <h2 className="mb-2 text-sm font-bold">Products</h2>
            {products.length === 0 && !loadingMore ? (
              <p className="text-xs text-muted-foreground">No products yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
            <div ref={sentinelRef} className="h-10" />
            {loadingMore && <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>}
          </section>
        </>
      )}
    </div>
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

const ProductCard = ({ product }: { product: Product }) => (
  <Link to={`/product/${product.id}`} className="block overflow-hidden rounded-2xl border border-border bg-card transition active:scale-[0.98]">
    <div className="aspect-square w-full bg-muted">
      {product.image_url && <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />}
    </div>
    <div className="p-2.5">
      <p className="truncate text-xs font-bold">{product.name}</p>
      <p className="truncate text-[10px] text-muted-foreground">{product.stores?.name ?? "Store"}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs font-bold">Rs. {Math.round(product.price)}</p>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Plus className="h-3.5 w-3.5" /></span>
      </div>
    </div>
  </Link>
);

export default CategoryDetail;
