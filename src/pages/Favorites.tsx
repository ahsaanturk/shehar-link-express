import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useSEO } from "@/hooks/useSEO";
import { Heart, Star } from "lucide-react";

interface Store {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
}
interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  store_id: string;
}

const Favorites = () => {
  const { productIds, storeIds, toggleProduct, toggleStore } = useFavorites();
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: "Your Favorites | SheharLink",
    description: "Your saved stores and products on SheharLink Muzaffarabad.",
  });

  useEffect(() => {
    const load = async () => {
      const [s, p] = await Promise.all([
        storeIds.length
          ? supabase.from("stores").select("id,name,image_url,description").in("id", storeIds)
          : Promise.resolve({ data: [] as Store[] }),
        productIds.length
          ? supabase.from("products").select("id,name,price,image_url,store_id").in("id", productIds)
          : Promise.resolve({ data: [] as Product[] }),
      ]);
      setStores(((s as any).data ?? []) as Store[]);
      setProducts(((p as any).data ?? []) as Product[]);
      setLoading(false);
    };
    load();
  }, [storeIds, productIds]);

  const empty = !loading && stores.length === 0 && products.length === 0;

  return (
    <div className="pb-4">
      <header className="border-b border-border bg-card px-4 py-3">
        <h1 className="text-lg font-bold">Favorites</h1>
        <p className="text-xs text-muted-foreground">Your saved stores & products</p>
      </header>

      {loading ? (
        <div className="space-y-3 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <Heart className="h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No favorites yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the heart on any store or product to save it here.
          </p>
        </div>
      ) : (
        <div className="space-y-6 p-4">
          {stores.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold">Stores</h2>
              <ul className="space-y-3">
                {stores.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5">
                    <Link to={`/store/${s.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {s.image_url && (
                          <img src={s.image_url} alt={s.name} loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{s.name}</p>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-foreground">4.6</span>
                        </div>
                      </div>
                    </Link>
                    <button
                      aria-label="Remove from favorites"
                      onClick={() => toggleStore(s.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary"
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {products.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold">Products</h2>
              <ul className="grid grid-cols-2 gap-3">
                {products.map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <Link to={`/product/${p.id}`}>
                      <div className="h-28 w-full bg-muted">
                        {p.image_url && (
                          <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-xs font-bold">{p.name}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xs font-bold">Rs. {Math.round(p.price)}</p>
                          <button
                            aria-label="Remove from favorites"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleProduct(p.id);
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-primary"
                          >
                            <Heart className="h-3.5 w-3.5 fill-current" />
                          </button>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Favorites;
