import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { MapPin, Search, ShoppingBasket, Apple, Pizza, Store as StoreIcon } from "lucide-react";

const categories = [
  { id: "grocery", label: "Grocery", icon: ShoppingBasket },
  { id: "fruits_veggies", label: "Fruits & Veggies", icon: Apple },
  { id: "fast_food", label: "Fast Food", icon: Pizza },
] as const;

interface Store {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  description: string | null;
}

const Home = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("stores")
      .select("id,name,category,image_url,description")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setStores((data ?? []) as Store[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return stores;
    const q = query.toLowerCase();
    return stores.filter((s) => s.name.toLowerCase().includes(q));
  }, [stores, query]);

  const byCategory = (cat: string) => filtered.filter((s) => s.category === cat);

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Deliver to</p>
            <div className="flex items-center gap-1 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" /> Muzaffarabad
            </div>
          </div>
          <div className="text-lg font-extrabold tracking-tight text-primary">SheharLink</div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search stores"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </header>

      <h1 className="sr-only">SheharLink — Muzaffarabad delivery</h1>

      <section className="px-4 pt-4">
        <div className="rounded-2xl p-4 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <p className="text-xs font-medium opacity-90">Cash on delivery</p>
          <p className="mt-1 text-lg font-bold leading-tight">Fresh stock, fast riders across Muzaffarabad</p>
        </div>
      </section>

      <section className="px-4 pt-6">
        <h2 className="mb-3 text-sm font-semibold">Categories</h2>
        <div className="grid grid-cols-3 gap-3">
          {categories.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#cat-${id}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition active:scale-95"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-center text-xs font-medium leading-tight">{label}</span>
            </a>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="space-y-4 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="mt-8 px-4 text-center">
          <StoreIcon className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No stores yet</p>
          <p className="text-xs text-muted-foreground">Stores will appear once an admin adds them.</p>
        </div>
      ) : (
        categories.map(({ id, label }) => {
          const list = byCategory(id);
          if (list.length === 0) return null;
          return (
            <section key={id} id={`cat-${id}`} className="pt-6">
              <div className="mb-3 flex items-center justify-between px-4">
                <h2 className="text-sm font-semibold">{label}</h2>
              </div>
              <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
                {list.map((s) => (
                  <Link
                    key={s.id}
                    to={`/store/${s.id}`}
                    className="w-40 shrink-0 rounded-xl border border-border bg-card p-3 transition active:scale-95"
                  >
                    <div className="mb-2 h-24 w-full overflow-hidden rounded-lg bg-muted">
                      {s.image_url && (
                        <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{label} · 15–30 min</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}

      <div className="h-6" />
    </div>
  );
};

export default Home;
