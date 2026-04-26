import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";

interface Store {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  description: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
}

const StorePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const cart = useCart();

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("stores").select("id,name,category,image_url,description").eq("id", id).maybeSingle(),
      supabase.from("products").select("id,name,description,price,image_url,is_available").eq("store_id", id).order("name"),
    ]).then(([s, p]) => {
      setStore(s.data as Store | null);
      setProducts((p.data ?? []) as Product[]);
      setLoading(false);
    });

    const channel = supabase
      .channel(`store-${id}-products`)
      .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `store_id=eq.${id}` }, (payload) => {
        setProducts((prev) => {
          if (payload.eventType === "INSERT") return [...prev, payload.new as Product];
          if (payload.eventType === "UPDATE") return prev.map((p) => (p.id === (payload.new as any).id ? (payload.new as Product) : p));
          if (payload.eventType === "DELETE") return prev.filter((p) => p.id !== (payload.old as any).id);
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const qtyInCart = (pid: string) => cart.items.find((i) => i.product_id === pid)?.qty ?? 0;
  const isCurrentStore = cart.storeId === id;

  if (loading) return <div className="space-y-3 p-4">{[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;
  if (!store) return <div className="p-8 text-center text-sm text-muted-foreground">Store not found.</div>;

  return (
    <div className="pb-24">
      <div className="relative h-40 w-full bg-muted">
        {store.image_url && <img src={store.image_url} alt={store.name} className="h-full w-full object-cover" />}
        <Link to="/" className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="border-b border-border bg-card px-4 py-3">
        <h1 className="text-lg font-bold">{store.name}</h1>
        {store.description && <p className="text-xs text-muted-foreground">{store.description}</p>}
      </div>

      <div className="p-4">
        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {products.map((p) => {
              const inCart = isCurrentStore ? qtyInCart(p.id) : 0;
              return (
                <li key={p.id} className="flex items-center gap-3 py-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    {p.description && <p className="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>}
                    <p className="mt-1 text-sm font-bold text-primary">Rs. {p.price}</p>
                  </div>
                  {!p.is_available ? (
                    <span className="text-xs text-muted-foreground">Unavailable</span>
                  ) : inCart === 0 ? (
                    <Button size="sm" onClick={() => cart.add(store.id, store.name, { product_id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url })}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground">
                      <button onClick={() => cart.setQty(p.id, inCart - 1)} className="flex h-8 w-8 items-center justify-center rounded-full" aria-label="Decrease">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[1ch] text-sm font-bold">{inCart}</span>
                      <button onClick={() => cart.setQty(p.id, inCart + 1)} className="flex h-8 w-8 items-center justify-center rounded-full" aria-label="Increase">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isCurrentStore && cart.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-4">
          <Button onClick={() => navigate("/cart")} className="flex h-14 w-full items-center justify-between rounded-full px-5 shadow-lg">
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {cart.itemCount()} item{cart.itemCount() !== 1 ? "s" : ""}
            </span>
            <span>View Cart · Rs. {cart.subtotal()}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default StorePage;
