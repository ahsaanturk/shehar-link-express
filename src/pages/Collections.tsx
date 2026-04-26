import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { Input } from "@/components/ui/input";
import {
  Search,
  Star,
  ShoppingBasket,
  Apple,
  Pizza,
  Pill,
  UtensilsCrossed,
  CupSoda,
  Home as HomeIcon,
  Beef,
  Cake,
  LayoutGrid,
} from "lucide-react";

interface Store {
  id: string;
  name: string;
  category: "grocery" | "fruits_veggies" | "fast_food";
  image_url: string | null;
  description: string | null;
}

const categoryDefs = [
  { id: "grocery", label: "Groceries", icon: ShoppingBasket, filter: "grocery" as const },
  { id: "fruits_veggies", label: "Fruits & Veggies", icon: Apple, filter: "fruits_veggies" as const },
  { id: "fast_food", label: "Fast Food", icon: Pizza, filter: "fast_food" as const },
  { id: "pharmacy", label: "Pharmacy", icon: Pill, filter: null },
  { id: "restaurants", label: "Restaurants", icon: UtensilsCrossed, filter: null },
  { id: "beverages", label: "Beverages", icon: CupSoda, filter: null },
  { id: "home", label: "Home & Lifestyle", icon: HomeIcon, filter: null },
  { id: "meat", label: "Meat & Fish", icon: Beef, filter: null },
  { id: "sweets", label: "Sweets & Bakery", icon: Cake, filter: null },
];

const Collections = () => {
  const [tab, setTab] = useState<"stores" | "categories">("stores");
  const [stores, setStores] = useState<Store[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useSEO({
    title: "Browse Stores & Categories | SheharLink Muzaffarabad",
    description:
      "Discover local stores, restaurants, pharmacies and groceries in Muzaffarabad. Browse by category or shop directly.",
  });

  useEffect(() => {
    supabase
      .from("stores")
      .select("id,name,category,image_url,description")
      .eq("is_active", true)
      .order("name")
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

  const countByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    stores.forEach((s) => {
      m[s.category] = (m[s.category] ?? 0) + 1;
    });
    return m;
  }, [stores]);

  return (
    <div className="pb-4">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 pb-3 pt-3 backdrop-blur">
        <h1 className="text-lg font-bold">Collections</h1>
        <p className="text-xs text-muted-foreground">Find stores or browse by category</p>

        {/* Toggle */}
        <div
          role="tablist"
          aria-label="Collections view"
          className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
        >
          {(["stores", "categories"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold capitalize transition ${
                tab === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {t === "stores" ? <ShoppingBasket className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
              {t}
            </button>
          ))}
        </div>

        {tab === "stores" && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search stores…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-full pl-9"
            />
          </div>
        )}
      </header>

      {tab === "stores" ? (
        <section className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No stores found.</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/store/${s.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 transition active:scale-[0.99]"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {s.image_url && (
                        <img src={s.image_url} alt={s.name} loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{s.name}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-foreground">4.6</span>
                        <span>·</span>
                        <span>20–30 min</span>
                      </div>
                      {s.description && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{s.description}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {categoryDefs.map(({ id, label, icon: Icon, filter }) => {
              const count = filter ? countByCategory[filter] ?? 0 : 0;
              return (
                <Link
                  key={id}
                  to={filter ? `/?cat=${filter}` : "/"}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.98]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {filter ? `${count} store${count !== 1 ? "s" : ""}` : "Coming soon"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default Collections;
