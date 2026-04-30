import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, LayoutGrid, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useArea } from "@/hooks/useArea";
import { useFavorites } from "@/hooks/useFavorites";
import { useCart } from "@/hooks/useCart";
import { ReviewStars } from "@/components/ReviewStars";
import { useStoreRating } from "@/hooks/useReviews";

const PAGE_SIZE = 20;

export default function SearchResults() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const navigate = useNavigate();
  const { selectedArea } = useArea();
  const cart = useCart();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!query) return;
    
    setLoadingInitial(true);
    setProducts([]);
    setPage(0);
    setHasMore(true);

    const fetchInitial = async () => {
      try {
        const [catsRes, storesRes, prodsRes] = await Promise.all([
          supabase.rpc('search_categories', { search_term: query, page_limit: 10 }),
          supabase.rpc('search_stores', { search_term: query, search_area: selectedArea?.id || null, page_limit: 10 }),
          supabase.rpc('search_products', { search_term: query, search_area: selectedArea?.id || null, page_limit: PAGE_SIZE, page_offset: 0 })
        ]);

        setCategories(catsRes.data || []);
        setStores(storesRes.data || []);
        
        const initialProducts = prodsRes.data || [];
        setProducts(initialProducts);
        setHasMore(initialProducts.length === PAGE_SIZE);
        setPage(1);
      } catch (err) {
        console.error("Error fetching search results:", err);
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchInitial();
  }, [query, selectedArea]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loadingInitial) return;
    
    setLoadingMore(true);
    try {
      const offset = page * PAGE_SIZE;
      const { data } = await supabase.rpc('search_products', { 
        search_term: query, 
        search_area: selectedArea?.id || null, 
        page_limit: PAGE_SIZE, 
        page_offset: offset 
      });
      
      const newProducts = data || [];
      setProducts(prev => [...prev, ...newProducts]);
      setHasMore(newProducts.length === PAGE_SIZE);
      setPage(p => p + 1);
    } catch (err) {
      console.error("Error loading more products:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loadingInitial, page, query, selectedArea]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const addToCart = (p: any) => {
    cart.add({
      product_id: p.id,
      store_id: p.store_id,
      store_name: "Store", // In a real scenario we'd fetch this or join it
      store_slug: "",
      name: p.name,
      price: Number(p.price),
      image_url: p.image_url,
    });
  };

  if (!query) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
        <p className="text-muted-foreground">Please enter a search term.</p>
        <button onClick={() => navigate(-1)} className="mt-4 font-semibold text-primary">Go back</button>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold leading-tight">Search Results</h1>
          <p className="text-[11px] text-muted-foreground">Showing results for "{query}"</p>
        </div>
      </header>

      {loadingInitial ? (
        <div className="flex flex-col gap-6 p-4">
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted" />)}
          </div>
        </div>
      ) : categories.length === 0 && stores.length === 0 && products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <LayoutGrid className="h-10 w-10 opacity-50" />
          </div>
          <p className="mt-4 font-bold text-lg">No results found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search terms</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pt-4">
          {/* Categories */}
          {categories.length > 0 && (
            <section>
              <h2 className="mb-3 px-4 text-sm font-bold">Categories</h2>
              <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
                {categories.map(c => (
                  <Link key={c.id} to={`/category/${c.slug}`} className="flex w-24 flex-col items-center gap-1.5 shrink-0 transition active:scale-95">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
                      <LayoutGrid className="h-6 w-6 text-foreground" />
                    </span>
                    <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight">{c.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Stores */}
          {stores.length > 0 && (
            <section>
              <h2 className="mb-3 px-4 text-sm font-bold">Stores</h2>
              <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
                {stores.map(s => <SearchStoreCard key={s.id} store={s} />)}
              </div>
            </section>
          )}

          {/* Products */}
          {products.length > 0 && (
            <section>
              <h2 className="mb-3 px-4 text-sm font-bold">Products</h2>
              <div className="grid grid-cols-2 gap-3 px-4">
                {products.map(p => (
                  <div key={p.id} className="block overflow-hidden rounded-2xl border border-border bg-card transition active:scale-[0.98]">
                    <Link to={`/product/${p.id}`}>
                      <div className="aspect-square w-full bg-muted">
                        {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
                      </div>
                    </Link>
                    <div className="p-2.5">
                      <Link to={`/product/${p.id}`}>
                        <p className="truncate text-xs font-bold">{p.name}</p>
                      </Link>
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-xs font-bold">Rs. {Math.round(p.price)}</p>
                        <button onClick={() => addToCart(p)} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground transition active:scale-90"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div ref={sentinelRef} className="h-10" />
              {loadingMore && <p className="py-4 text-center text-xs text-muted-foreground">Loading more…</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const SearchStoreCard = ({ store }: { store: any }) => {
  const { isStoreFav, toggleStore } = useFavorites();
  const rating = useStoreRating(store.id);
  const fav = isStoreFav(store.id);
  return (
    <Link to={`/${store.slug || store.id}`} className="w-44 shrink-0 overflow-hidden rounded-2xl border border-border bg-card transition active:scale-[0.98]">
      <div className="relative h-24 w-full bg-muted">
        {store.image_url && <img src={store.image_url} alt={store.name} loading="lazy" className="h-full w-full object-cover" />}
        <button 
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-card/90 backdrop-blur"
          onClick={(e) => { e.preventDefault(); toggleStore(store.id); }}>
          <Heart className={`h-3.5 w-3.5 ${fav ? "fill-primary text-primary" : ""}`} />
        </button>
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-bold">{store.name}</p>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          {rating.count > 0 ? (
            <ReviewStars rating={rating.avg} size="sm" showValue count={rating.count} />
          ) : (
            <span className="text-[10px] text-muted-foreground">No reviews</span>
          )}
        </div>
      </div>
    </Link>
  );
};
