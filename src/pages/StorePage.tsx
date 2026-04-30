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
import { ArrowLeft, Heart, LayoutGrid, List, Plus, Star, ShoppingCart } from "lucide-react";

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

/**
 * Resolves either /store/:id (legacy) or /:storeSlug
 */
const StorePage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { isStoreFav, toggleStore } = useFavorites();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");

  const lookup = params.id ?? params.storeSlug;
  const isSlug = !!params.storeSlug;

  useEffect(() => {
    if (!lookup) return;
    setLoading(true);
    const q = supabase.from("stores")
      .select("id,slug,name,image_url,description,seo_title,seo_description,is_visible,is_active");
    const finder = isSlug ? q.eq("slug", lookup) : q.eq("id", lookup);
    finder.maybeSingle().then(async ({ data }) => {
      if (!data || !data.is_active || !data.is_visible) {
        setStore(null); setProducts([]); setLoading(false); return;
      }
      setStore(data as Store);
      const { data: pd } = await supabase.from("products")
        .select("id,slug,name,description,price,image_url,is_available,is_visible")
        .eq("store_id", data.id).eq("is_visible", true).order("sort_order").order("name");
      setProducts((pd ?? []) as Product[]);
      setLoading(false);
    });

    let channel: any;
    // realtime once we know id
    return () => { if (channel) supabase.removeChannel(channel); };
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

  if (loading) return <div className="space-y-3 p-4">{[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;
  if (!store) return <div className="p-8 text-center text-sm text-muted-foreground">Store not found.</div>;


  const addToCart = (p: Product) => {
    cart.add({
      product_id: p.id, store_id: store.id, store_name: store.name, store_slug: store.slug,
      name: p.name, price: Number(p.price), image_url: p.image_url,
    });
  };

  return (
    <div className="pb-32">
      {/* Hero */}
      <div className="relative h-48 w-full bg-muted">
        {store.image_url && <img src={store.image_url} alt={store.name} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <Link to="/" aria-label="Back" className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <button
          onClick={() => toggleStore(store.id)}
          aria-label={isStoreFav(store.id) ? "Remove favorite" : "Add favorite"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur"
        >
          <Heart className={`h-5 w-5 ${isStoreFav(store.id) ? "fill-primary text-primary" : ""}`} />
        </button>
      </div>

      <div className="-mt-6 px-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h1 className="text-xl font-extrabold">{store.name}</h1>
          {store.description && <p className="mt-1 text-xs text-muted-foreground">{store.description}</p>}
          <div className="mt-2 flex items-center gap-3 text-xs">
            <ReviewStars rating={storeRating.avg} size="sm" showValue count={storeRating.count} />
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between px-4 pt-5">
        <h2 className="text-sm font-bold">Menu ({products.length})</h2>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button aria-label="Grid view" onClick={() => setView("grid")}
            className={`flex h-7 w-7 items-center justify-center rounded-full ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button aria-label="List view" onClick={() => setView("list")}
            className={`flex h-7 w-7 items-center justify-center rounded-full ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-3">
        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No products yet.</p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => {
              const q = qtyInCart(p.id);
              return (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <Link to={`/${store.slug}/${p.slug}`} className="block">
                    <div className="aspect-square w-full bg-muted">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                    </div>
                  </Link>
                  <div className="p-2.5">
                    <Link to={`/${store.slug}/${p.slug}`}>
                      <p className="line-clamp-1 text-sm font-bold">{p.name}</p>
                      <p className="line-clamp-1 text-[10px] text-muted-foreground">{p.description ?? " "}</p>
                    </Link>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-sm font-extrabold text-primary">Rs. {Math.round(p.price)}</p>
                      {!p.is_available ? (
                        <span className="text-[10px] text-muted-foreground">N/A</span>
                      ) : q === 0 ? (
                        <button onClick={() => addToCart(p)} aria-label={`Add ${p.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition active:scale-95">
                          <Plus className="h-4 w-4" />
                        </button>
                      ) : (
                        <Link to="/cart" className="flex h-7 items-center gap-1 rounded-full bg-secondary px-2 text-[10px] font-bold text-primary">
                          <ShoppingCart className="h-3 w-3" /> View ({q})
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {products.map((p) => {
              const q = qtyInCart(p.id);
              return (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <Link to={`/${store.slug}/${p.slug}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                  </Link>
                  <Link to={`/${store.slug}/${p.slug}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    {p.description && <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>}
                    <p className="mt-1 text-sm font-bold text-primary">Rs. {Math.round(p.price)}</p>
                  </Link>
                  {!p.is_available ? (
                    <span className="text-xs text-muted-foreground">Unavailable</span>
                  ) : q === 0 ? (
                    <Button size="sm" onClick={() => addToCart(p)}><Plus className="h-4 w-4" /> Add</Button>
                  ) : (
                    <Link to="/cart"><Button size="sm" variant="secondary"><ShoppingCart className="mr-1 h-4 w-4" />View ({q})</Button></Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Reviews */}
      <div className="px-4 pt-6">
        <ReviewSection
          storeId={store.id}
          avgRating={storeRating.avg}
          reviewCount={storeRating.count}
        />
      </div>

      {cartItemsThisStore.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-4">
          <Button onClick={() => navigate("/cart")} className="flex h-14 w-full items-center justify-between rounded-full px-5 shadow-lg">
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {cartItemsThisStore.reduce((s, i) => s + i.qty, 0)} from this store
            </span>
            <span>View Cart · Rs. {storeSubtotal}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default StorePage;
