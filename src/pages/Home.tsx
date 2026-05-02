import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";
import {
  Search, Bell, ShoppingCart, Star, Heart, Plus, ShoppingBasket,
  Truck, ShieldCheck, PackageOpen, ClipboardList, Clock,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { useArea } from "@/hooks/useArea";
import { useStoreRating } from "@/hooks/useReviews";
import { ReviewStars } from "@/components/ReviewStars";
import { AreaPicker } from "@/components/AreaPicker";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import heroImg from "@/assets/hero-muzaffarabad.jpg";
import promoBasket from "@/assets/promo-basket.png";

interface Store {
  id: string; slug: string; name: string; image_url: string | null; description: string | null;
  category_id: string | null; is_popular: boolean; is_visible: boolean;
  opening_time?: string | null; closing_time?: string | null; is_always_open?: boolean;
}
interface Product {
  id: string; slug: string; name: string; price: number; image_url: string | null; store_id: string;
  is_visible: boolean;
  stores?: { name: string; slug: string } | null;
}
interface Category {
  id: string; name: string; slug: string; icon: string | null; show_on_home: boolean;
}
interface Banner {
  id: string; title: string; subtitle: string | null; promo_code: string | null;
  bg_gradient: string; image_url: string | null;
}

const PAGE = 10;
const STORE_SELECT = "id,slug,name,image_url,description,category_id,is_popular,is_visible";
const PRODUCT_SELECT = "id,slug,name,price,image_url,store_id,is_visible,stores(name,slug)";

const Home = () => {
  const navigate = useNavigate();
  const { selectedArea } = useArea();
  const cart = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularStores, setPopularStores] = useState<Store[]>([]);
  const [nearStores, setNearStores] = useState<Store[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [nearProducts, setNearProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const itemCount = useCart((s) => s.itemCount());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const copyPromo = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    toast.success(`Promo code ${code} copied!`);
  };

  const addToCart = (p: Product) => {
    if (!p.stores) return;
    cart.add({
      product_id: p.id, store_id: p.store_id, store_name: p.stores.name, store_slug: p.stores.slug,
      name: p.name, price: Number(p.price), image_url: p.image_url,
    });
    toast.success(`Added ${p.name}`);
  };

  const [areaStoreIds, setAreaStoreIds] = useState<string[] | null>(null);
  useEffect(() => {
    if (!selectedArea) { setAreaStoreIds([]); return; }
    supabase.from("store_areas").select("store_id").eq("area_id", selectedArea.id)
      .then(({ data }) => setAreaStoreIds((data ?? []).map((r: any) => r.store_id)));
  }, [selectedArea]);

  useEffect(() => {
    setLoading(true);
    setNearProducts([]); setPage(0); setHasMore(true);

    const load = async () => {
      const [catsRes, popStoresRes, popProdRes, bannersRes] = await Promise.all([
        supabase.from("categories").select("id,name,slug,icon,show_on_home")
          .eq("is_visible", true).eq("show_on_home", true).order("sort_order"),
        supabase.from("stores").select(STORE_SELECT)
          .eq("is_active", true).eq("is_visible", true).eq("is_popular", true).order("sort_order").limit(10),
        supabase.from("products").select(PRODUCT_SELECT)
          .eq("is_available", true).eq("is_visible", true).eq("is_popular", true).order("sort_order").limit(12),
        supabase.from("homepage_banners").select("*").eq("is_active", true).order("sort_order"),
      ]);
      setCategories((catsRes.data ?? []) as Category[]);
      setPopularStores((popStoresRes.data ?? []) as Store[]);
      setPopularProducts((popProdRes.data ?? []) as Product[]);
      setBanners((bannersRes.data ?? []) as Banner[]);

      if (areaStoreIds && areaStoreIds.length > 0) {
        const { data: ns } = await supabase.from("stores")
          .select(STORE_SELECT)
          .eq("is_active", true).eq("is_visible", true).in("id", areaStoreIds).order("sort_order").limit(10);
        setNearStores((ns ?? []) as Store[]);
      } else {
        setNearStores([]);
      }
      setLoading(false);
    };
    load();
  }, [areaStoreIds]);

  const loadMoreNear = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    if (!areaStoreIds) return;
    setLoadingMore(true);
    const from = page * PAGE;
    const to = from + PAGE - 1;
    let query = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_available", true).eq("is_visible", true)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (areaStoreIds.length > 0) query = query.in("store_id", areaStoreIds);
    else { setHasMore(false); setLoadingMore(false); return; }
    const { data } = await query;
    const list = (data ?? []) as Product[];
    setNearProducts((prev) => [...prev, ...list]);
    setHasMore(list.length === PAGE);
    setPage((p) => p + 1);
    setLoadingMore(false);
  }, [page, hasMore, loadingMore, areaStoreIds]);

  useEffect(() => { if (areaStoreIds) loadMoreNear(); /* eslint-disable-next-line */ }, [areaStoreIds]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMoreNear();
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMoreNear]);

  return (
    <div className="pb-4">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-1.5">
            <img src="/logo.png" alt="SheharLink Logo" className="h-8 w-8 object-contain rounded-lg" />
            <div className="leading-none">
              <div className="text-base font-extrabold tracking-tight">
                <span className="text-primary">Shehar</span><span className="text-foreground">Link</span>
              </div>
              <div className="text-[9px] font-medium text-muted-foreground">Sab kuch, aap ke paas</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/notifications" aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            </Link>
            <Link to="/cart" aria-label="Cart" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="mt-2"><AreaPicker /></div>

        <div className="relative mt-2">
          <SearchAutocomplete />
        </div>
      </header>

      <h1 className="sr-only">SheharLink — Muzaffarabad delivery</h1>

      {/* Hero */}
      <section className="px-4 pt-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
          <div className="relative h-40 w-full">
            <img src={heroImg} alt="Muzaffarabad valley" width={1280} height={768} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/70 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center p-4">
              <h2 className="text-lg font-extrabold leading-tight text-foreground">
                Everything You Need,<br /><span className="text-primary">Delivered to You</span>
              </h2>
              <p className="mt-1 max-w-[55%] text-[11px] leading-snug text-muted-foreground">
                Order from your favourite local shops, restaurants & pharmacies.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            <FeatureChip icon={Truck} title="Fast Delivery" subtitle="30–60 min" />
            <FeatureChip icon={ShieldCheck} title="Trusted" subtitle="Verified" />
            <FeatureChip icon={PackageOpen} title="Cash" subtitle="On delivery" />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="pt-5">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="text-sm font-bold">Shop by Categories</h2>
          <Link to="/categories" className="text-xs font-semibold text-primary">View all ›</Link>
        </div>
        {categories.length === 0 ? (
          <p className="px-4 text-xs text-muted-foreground">No categories yet.</p>
        ) : (
          <div className="no-scrollbar grid grid-flow-col grid-rows-2 auto-cols-[80px] gap-3 overflow-x-auto px-4 pb-1">
            {categories.map((c) => <CategoryTile key={c.id} category={c} />)}
          </div>
        )}
      </section>

      {/* Popular Stores */}
      <SectionHeader title="Popular Stores" to="/categories?tab=stores&filter=popular" />
      {loading ? <SkeletonRow /> : popularStores.length === 0 ? (
        <p className="px-4 text-xs text-muted-foreground">No popular stores yet.</p>
      ) : (
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {popularStores.slice(0, 10).map((s) => <StoreCard key={s.id} store={s} />)}
        </div>
      )}

      {/* Near You Stores */}
      <SectionHeader title="Stores Near You" to="/categories?tab=stores&filter=near" />
      {loading ? <SkeletonRow /> : nearStores.length === 0 ? (
        <p className="px-4 text-xs text-muted-foreground">No stores in {selectedArea?.name ?? "your area"} yet.</p>
      ) : (
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {nearStores.slice(0, 10).map((s) => <StoreCard key={s.id} store={s} />)}
        </div>
      )}

      {/* Dynamic Banners */}
      {banners.length > 0 && (
        <section className="no-scrollbar flex gap-4 overflow-x-auto px-4 pt-6">
          {banners.map((b) => (
            <button key={b.id} type="button" onClick={() => b.promo_code && copyPromo(b.promo_code)}
              className="relative flex min-w-[85%] shrink-0 items-center overflow-hidden rounded-2xl p-4 text-left transition active:scale-[0.99] sm:min-w-[400px]"
              style={{ background: b.bg_gradient }}>
              <div className="relative z-10 text-primary-foreground">
                <p className="text-xl font-extrabold leading-none">{b.title}</p>
                {b.subtitle && <p className="mt-1 text-xs font-medium opacity-95">{b.subtitle}</p>}
                {b.promo_code && (
                  <span className="mt-2 inline-block rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-bold backdrop-blur">
                    Tap to copy: {b.promo_code}
                  </span>
                )}
              </div>
              {b.image_url && (
                <img src={b.image_url} alt="" width={300} height={200} loading="lazy"
                  className="absolute -right-4 top-1/2 h-32 w-auto -translate-y-1/2 object-contain" />
              )}
            </button>
          ))}
        </section>
      )}

      {/* Popular Products */}
      <SectionHeader title="Popular Products" to="/categories?tab=products&filter=popular" />
      {loading ? <SkeletonProductRow /> : popularProducts.length === 0 ? (
        <p className="px-4 text-xs text-muted-foreground">No popular products yet.</p>
      ) : (
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {popularProducts.map((p) => <ProductCardH key={p.id} product={p} onAdd={() => addToCart(p)} />)}
        </div>
      )}

      {/* Products Near You */}
      <section className="pt-6">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="text-sm font-bold">Products Near You</h2>
        </div>
        {nearProducts.length === 0 && !loadingMore ? (
          <p className="px-4 text-xs text-muted-foreground">No products in {selectedArea?.name ?? "your area"} yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4">
            {nearProducts.map((p) => <ProductCardV key={p.id} product={p} onAdd={() => addToCart(p)} />)}
          </div>
        )}
        <div ref={sentinelRef} className="h-10" />
        {loadingMore && <p className="py-4 text-center text-xs text-muted-foreground">Loading more…</p>}
      </section>
    </div>
  );
};

const SectionHeader = ({ title, to }: { title: string; to: string }) => (
  <div className="mt-6 mb-3 flex items-center justify-between px-4">
    <h2 className="text-sm font-bold">{title}</h2>
    <Link to={to} className="text-xs font-semibold text-primary">View all ›</Link>
  </div>
);

const SkeletonRow = () => (
  <div className="flex gap-3 overflow-x-auto px-4">
    {[1,2,3].map((i) => <div key={i} className="h-44 w-44 shrink-0 animate-pulse rounded-2xl bg-muted" />)}
  </div>
);
const SkeletonProductRow = () => (
  <div className="flex gap-3 overflow-x-auto px-4">
    {[1,2,3].map((i) => <div key={i} className="h-44 w-36 shrink-0 animate-pulse rounded-2xl bg-muted" />)}
  </div>
);

const CategoryTile = ({ category }: { category: Category }) => {
  const Icon = (category.icon && (Icons as any)[category.icon]) || Icons.LayoutGrid;
  return (
    <Link to={`/category/${category.slug}`} className="flex flex-col items-center gap-1.5 transition active:scale-95">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-foreground">
        <Icon className="h-7 w-7" />
      </span>
      <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight">{category.name}</span>
    </Link>
  );
};

const FeatureChip = ({ icon: Icon, title, subtitle }: { icon: typeof Truck; title: string; subtitle: string }) => (
  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Icon className="h-3.5 w-3.5" /></span>
    <div className="min-w-0 leading-tight">
      <p className="truncate text-[10px] font-bold">{title}</p>
      <p className="truncate text-[9px] text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

const StoreCard = ({ store }: { store: Store }) => {
  const { isStoreFav, toggleStore } = useFavorites();
  const rating = useStoreRating(store.id);
  const fav = isStoreFav(store.id);

  // Compute timing badge
  let timingLabel = "";
  let timingOpen = true;
  if (!store.is_always_open && store.opening_time && store.closing_time) {
    const now = new Date();
    const [oh, om] = store.opening_time.split(":").map(Number);
    const [ch, cm] = store.closing_time.split(":").map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    timingOpen = nowMin >= openMin && nowMin < closeMin;
    const fmt = (h: number, m: number) => `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
    timingLabel = timingOpen ? `Open until ${fmt(ch, cm)}` : `Closed`;
  } else if (store.is_always_open) {
    timingLabel = "24/7";
  }

  return (
    <Link to={`/${store.slug}`} className="w-44 shrink-0 overflow-hidden rounded-2xl border border-border bg-card transition active:scale-[0.98]">
      <div className="relative h-24 w-full bg-muted">
        {store.image_url && <img src={store.image_url} alt={store.name} loading="lazy" className="h-full w-full object-cover" />}
        <button aria-label={fav ? "Remove favorite" : "Add favorite"} aria-pressed={fav}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-card/90 backdrop-blur"
          onClick={(e) => { e.preventDefault(); toggleStore(store.id); }}>
          <Heart className={`h-3.5 w-3.5 ${fav ? "fill-primary text-primary" : ""}`} />
        </button>
        {timingLabel && (
          <span className={`absolute left-2 bottom-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold backdrop-blur ${
            timingOpen ? "bg-green-500/80 text-white" : "bg-red-500/80 text-white"
          }`}>
            <Clock className="h-2.5 w-2.5" />{timingLabel}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-bold">{store.name}</p>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          {rating.count > 0 ? (
            <ReviewStars rating={rating.avg} size="sm" showValue count={rating.count} />
          ) : (
            <span className="text-[10px] text-muted-foreground">No reviews yet</span>
          )}
        </div>
      </div>
    </Link>
  );
};

const ProductCardH = ({ product, onAdd }: { product: Product; onAdd: () => void }) => (
  <div className="block w-36 shrink-0 overflow-hidden rounded-2xl border border-border bg-card transition active:scale-[0.98]">
    <Link to={product.stores ? `/${product.stores.slug}/${product.slug}` : "#"}>
      <div className="h-28 w-full bg-muted">
        {product.image_url && <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />}
      </div>
    </Link>
    <div className="p-2.5">
      <Link to={product.stores ? `/${product.stores.slug}/${product.slug}` : "#"}>
        <p className="truncate text-xs font-bold">{product.name}</p>
        <p className="truncate text-[10px] text-muted-foreground">{product.stores?.name ?? "Store"}</p>
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs font-bold">Rs. {Math.round(product.price)}</p>
        <button onClick={onAdd} aria-label={`Add ${product.name}`} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground transition active:scale-90"><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  </div>
);

const ProductCardV = ({ product, onAdd }: { product: Product; onAdd: () => void }) => (
  <div className="block overflow-hidden rounded-2xl border border-border bg-card transition active:scale-[0.98]">
    <Link to={product.stores ? `/${product.stores.slug}/${product.slug}` : "#"}>
      <div className="aspect-square w-full bg-muted">
        {product.image_url && <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />}
      </div>
    </Link>
    <div className="p-2.5">
      <Link to={product.stores ? `/${product.stores.slug}/${product.slug}` : "#"}>
        <p className="truncate text-xs font-bold">{product.name}</p>
        <p className="truncate text-[10px] text-muted-foreground">{product.stores?.name ?? "Store"}</p>
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs font-bold">Rs. {Math.round(product.price)}</p>
        <button onClick={onAdd} aria-label={`Add ${product.name}`} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground transition active:scale-90"><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  </div>
);

export default Home;
