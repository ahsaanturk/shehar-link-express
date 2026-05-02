import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { useSEO } from "@/hooks/useSEO";
import { useStoreRating } from "@/hooks/useReviews";
import { ReviewSection } from "@/components/ReviewSection";
import { ReviewStars } from "@/components/ReviewStars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Heart, LayoutGrid, List, Plus, ShoppingCart, Search, Clock, ClipboardList } from "lucide-react";
import { toast } from "sonner";

interface Store {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_visible: boolean;
  is_active: boolean;
  opening_time: string | null;
  closing_time: string | null;
  is_always_open: boolean;
  theme_color: string | null;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_visible: boolean;
}

function getStoreTimingInfo(store: Store): { isOpen: boolean; label: string } {
  if (store.is_always_open) return { isOpen: true, label: "Open 24/7" };
  if (!store.opening_time || !store.closing_time) return { isOpen: true, label: "" };
  const now = new Date();
  const [oh, om] = store.opening_time.split(":").map(Number);
  const [ch, cm] = store.closing_time.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isOpen = nowMin >= openMin && nowMin < closeMin;
  const fmt = (h: number, m: number) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  return {
    isOpen,
    label: isOpen
      ? `Open · Closes at ${fmt(ch, cm)}`
      : `Closed · Opens at ${fmt(oh, om)}`,
  };
}

const StorePage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { isStoreFav, toggleStore } = useFavorites();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQ, setSearchQ] = useState("");

  const lookup = params.id ?? params.storeSlug;
  const isSlug = !!params.storeSlug;

  useEffect(() => {
    if (!lookup) return;
    setLoading(true);
    const q = supabase.from("stores")
      .select("id,slug,name,image_url,description,seo_title,seo_description,is_visible,is_active,opening_time,closing_time,is_always_open,theme_color");
    const finder = isSlug ? q.eq("slug", lookup) : q.eq("id", lookup);
    finder.maybeSingle().then(async ({ data }) => {
      if (!data || !data.is_active || !data.is_visible) {
        toast.error("Store is currently unavailable");
        navigate("/", { replace: true });
        return;
      }
      setStore(data as Store);
      const { data: pd } = await supabase.from("products")
        .select("id,slug,name,description,price,image_url,is_available,is_visible")
        .eq("store_id", data.id).eq("is_visible", true).order("sort_order").order("name");
      setProducts((pd ?? []) as Product[]);
      setLoading(false);
    });
  }, [lookup, isSlug]);

  useSEO({
    title: store ? (store.seo_title || `${store.name} — Order online | SheharLink`) : "Store | SheharLink",
    description: store ? (store.seo_description || store.description || `Order from ${store.name} on SheharLink, delivered fast in Muzaffarabad.`) : undefined,
    image: store?.image_url ?? undefined,
    canonical: store ? `${window.location.origin}/${store.slug}` : undefined,
    jsonLd: store ? {
      "@context": "https://schema.org",
      "@type": "Store",
      name: store.name,
      description: store.description ?? undefined,
      image: store.image_url ?? undefined,
      url: `${window.location.origin}/${store.slug}`,
    } : null,
  });

  const qtyInCart = (pid: string) => cart.items.find((i) => i.product_id === pid)?.qty ?? 0;
  const cartItemsThisStore = useMemo(
    () => store ? cart.items.filter((i) => i.store_id === store.id) : [],
    [cart.items, store?.id],
  );
  const storeSubtotal = cartItemsThisStore.reduce((s, i) => s + i.price * i.qty, 0);
  const storeRating = useStoreRating(store?.id ?? null);
  const timing = store ? getStoreTimingInfo(store) : null;
  const themeColor = store?.theme_color || "#7c3aed";

  const filteredProducts = useMemo(() => {
    if (!searchQ.trim()) return products;
    const q = searchQ.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)
    );
  }, [products, searchQ]);

  if (loading) return <div className="space-y-3 p-4">{[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;
  if (!store) return <div className="p-8 text-center text-sm text-muted-foreground">Store not found.</div>;

  const addToCart = (p: Product) => {
    cart.add({
      product_id: p.id, store_id: store.id, store_name: store.name, store_slug: store.slug,
      name: p.name, price: Number(p.price), image_url: p.image_url,
    });
  };

  return (
    <div className="pb-32 bg-secondary/5 min-h-screen">
      {/* Hero with dynamic background */}
      <div className="relative h-56 w-full overflow-hidden">
        {store.image_url ? (
          <img src={store.image_url} alt={store.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full opacity-20" style={{ background: themeColor }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link to="/" aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-md shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <button
            onClick={() => toggleStore(store.id)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-md shadow-sm"
          >
            <Heart className={`h-5 w-5 ${isStoreFav(store.id) ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        </div>

        {/* Floating Store Header */}
        <div className="absolute inset-x-4 bottom-0 translate-y-1/2">
          <Card className="border-none shadow-xl backdrop-blur-lg bg-card/90 p-5 rounded-2xl overflow-hidden relative">
            {/* Design accent */}
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: themeColor }} />
            
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-black tracking-tight">{store.name}</h1>
                <ReviewStars rating={storeRating.avg} size="sm" showValue count={storeRating.count} />
              </div>
              {store.description && <p className="mt-1 text-[11px] text-muted-foreground font-medium leading-relaxed max-w-[90%]">{store.description}</p>}
              <div className="mt-3 flex items-center gap-3">
                {timing && (
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                    timing.isOpen ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                  }`}>
                    <Clock className="h-3 w-3" />
                    {timing.isOpen ? "Open Now" : "Closed Now"}
                  </span>
                )}
                {timing?.label && <span className="text-[10px] font-medium text-muted-foreground">{timing.label}</span>}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="pt-20 px-4 space-y-4">
        {/* Custom Order Action */}
        <Link to={`/custom-order?store=${store.slug}`}>
          <div className="group flex items-center gap-4 rounded-2xl border border-dashed p-4 transition active:scale-[0.98]" style={{ borderColor: `${themeColor}40`, backgroundColor: `${themeColor}08` }}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl shadow-inner transition group-hover:scale-110" style={{ backgroundColor: `${themeColor}20` }}>
              <ClipboardList className="h-6 w-6" style={{ color: themeColor }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black" style={{ color: themeColor }}>Special Request / Custom Order</p>
              <p className="text-[10px] text-muted-foreground font-semibold">Order anything from this store even if not listed</p>
            </div>
          </div>
        </Link>

        {/* Menu Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between sticky top-0 z-20 py-3 bg-secondary/5 backdrop-blur-sm -mx-4 px-4">
            <div className="relative flex-1 max-w-[70%]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Find in menu..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="h-9 rounded-full pl-8 text-xs border-none shadow-sm bg-card"
              />
            </div>
            <div className="flex items-center gap-1 rounded-full bg-card p-1 shadow-sm">
              <button onClick={() => setView("grid")} className={`p-1.5 rounded-full transition ${view === "grid" ? "bg-secondary text-primary" : "text-muted-foreground"}`} style={{ color: view === "grid" ? themeColor : undefined }}><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setView("list")} className={`p-1.5 rounded-full transition ${view === "list" ? "bg-secondary text-primary" : "text-muted-foreground"}`} style={{ color: view === "list" ? themeColor : undefined }}><List className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="mt-2">
            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center"><Search className="h-6 w-6 text-muted-foreground" /></div>
                <p className="text-xs font-bold text-muted-foreground">{searchQ ? `No results for "${searchQ}"` : "This store has no items listed yet."}</p>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map((p) => {
                  const q = qtyInCart(p.id);
                  return (
                    <Card key={p.id} className="overflow-hidden border-none shadow-sm group">
                      <Link to={`/${store.slug}/${p.slug}`} className="block relative aspect-square bg-muted">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />}
                        {!p.is_available && <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center font-black text-[10px] uppercase text-muted-foreground">Unavailable</div>}
                      </Link>
                      <div className="p-3">
                        <Link to={`/${store.slug}/${p.slug}`}>
                          <p className="truncate text-xs font-black">{p.name}</p>
                          <p className="mt-0.5 truncate text-[9px] text-muted-foreground font-medium">{p.description || " "}</p>
                        </Link>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-sm font-black" style={{ color: themeColor }}>Rs. {Math.round(p.price)}</p>
                          {p.is_available && (
                            q === 0 ? (
                              <button onClick={() => addToCart(p)} className="flex h-7 w-7 items-center justify-center rounded-full text-white shadow-md transition active:scale-90" style={{ backgroundColor: themeColor }}>
                                <Plus className="h-4 w-4" />
                              </button>
                            ) : (
                              <Link to="/cart" className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[9px] font-black text-white shadow-md animate-in zoom-in-75" style={{ backgroundColor: themeColor }}>
                                <ShoppingCart className="h-3 w-3" /> ({q})
                              </Link>
                            )
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((p) => {
                  const q = qtyInCart(p.id);
                  return (
                    <Card key={p.id} className="flex items-center gap-4 p-3 border-none shadow-sm">
                      <Link to={`/${store.slug}/${p.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                        {!p.is_available && <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/${store.slug}/${p.slug}`}>
                          <p className="truncate text-sm font-black">{p.name}</p>
                          {p.description && <p className="line-clamp-1 text-[10px] text-muted-foreground font-medium">{p.description}</p>}
                          <p className="mt-1 text-sm font-black" style={{ color: themeColor }}>Rs. {Math.round(p.price)}</p>
                        </Link>
                      </div>
                      <div className="shrink-0">
                        {!p.is_available ? (
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">N/A</span>
                        ) : q === 0 ? (
                          <Button size="sm" className="h-8 rounded-full font-black text-[10px] uppercase tracking-wider shadow-sm text-white" style={{ backgroundColor: themeColor }} onClick={() => addToCart(p)}>Add</Button>
                        ) : (
                          <Link to="/cart"><Button size="sm" variant="secondary" className="h-8 rounded-full font-black text-[10px] uppercase tracking-wider border shadow-sm" style={{ color: themeColor, borderColor: themeColor }}><ShoppingCart className="mr-1 h-3.5 w-3.5" />{q}</Button></Link>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="pt-6">
          <ReviewSection storeId={store.id} avgRating={storeRating.avg} reviewCount={storeRating.count} />
        </div>
      </div>

      {cartItemsThisStore.length > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-sm px-4">
          <Button 
            onClick={() => navigate("/cart")} 
            className="flex h-14 w-full items-center justify-between rounded-2xl px-6 shadow-2xl transition active:scale-95 text-white"
            style={{ backgroundColor: themeColor }}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none mb-1">In your cart</p>
                <p className="text-sm font-black text-white">{cartItemsThisStore.reduce((s, i) => s + i.qty, 0)} Items</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none mb-1">Subtotal</p>
              <p className="text-sm font-black text-white">Rs. {storeSubtotal}</p>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
};

export default StorePage;
