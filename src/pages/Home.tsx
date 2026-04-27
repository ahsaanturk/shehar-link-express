import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Search,
  Bell,
  ShoppingCart,
  ChevronDown,
  Star,
  Heart,
  Plus,
  ShoppingBasket,
  Apple,
  Pill,
  Pizza,
  UtensilsCrossed,
  CupSoda,
  Home as HomeIcon,
  Beef,
  Cake,
  LayoutGrid,
  Truck,
  ShieldCheck,
  PackageOpen,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import heroImg from "@/assets/hero-muzaffarabad.jpg";
import promoBasket from "@/assets/promo-basket.png";

interface Store {
  id: string;
  name: string;
  category: "grocery" | "fruits_veggies" | "fast_food";
  image_url: string | null;
  description: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  store_id: string;
  stores?: { name: string } | null;
}

const categories = [
  { id: "all", label: "All", icon: LayoutGrid, filter: null as null | Store["category"] },
  { id: "grocery", label: "Groceries", icon: ShoppingBasket, filter: "grocery" as const },
  { id: "fruits_veggies", label: "Fruits & Veggies", icon: Apple, filter: "fruits_veggies" as const },
  { id: "pharmacy", label: "Pharmacy", icon: Pill, filter: null },
  { id: "fast_food", label: "Fast Food", icon: Pizza, filter: "fast_food" as const },
  { id: "restaurants", label: "Restaurants", icon: UtensilsCrossed, filter: null },
  { id: "beverages", label: "Beverages", icon: CupSoda, filter: null },
  { id: "home", label: "Home & Lifestyle", icon: HomeIcon, filter: null },
  { id: "meat", label: "Meat & Fish", icon: Beef, filter: null },
  { id: "sweets", label: "Sweets & Bakery", icon: Cake, filter: null },
];

const Home = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const itemCount = useCart((s) => s.itemCount());

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/categories?q=${encodeURIComponent(query.trim())}`);
  };

  const copyPromo = () => {
    navigator.clipboard?.writeText("WELCOME20").catch(() => {});
    toast.success("Promo code WELCOME20 copied!");
  };

  useEffect(() => {
    Promise.all([
      supabase
        .from("stores")
        .select("id,name,category,image_url,description")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("id,name,price,image_url,store_id,stores(name)")
        .eq("is_available", true)
        .order("created_at", { ascending: false })
        .limit(12),
    ]).then(([storesRes, productsRes]) => {
      setStores((storesRes.data ?? []) as Store[]);
      setProducts((productsRes.data ?? []) as Product[]);
      setLoading(false);
    });
  }, []);

  const filteredStores = useMemo(() => {
    let list = stores;
    const cat = categories.find((c) => c.id === activeCat);
    if (cat?.filter) list = list.filter((s) => s.category === cat.filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return list;
  }, [stores, activeCat, query]);

  return (
    <div className="pb-4">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingBasket className="h-4 w-4" />
            </span>
            <div className="leading-none">
              <div className="text-base font-extrabold tracking-tight">
                <span className="text-primary">Shehar</span>
                <span className="text-foreground">Link</span>
              </div>
              <div className="text-[9px] font-medium text-muted-foreground">Sab kuch, aap ke paas</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <Link
              to="/cart"
              aria-label="Cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground"
            >
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        <button className="mt-2 flex items-center gap-1 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" />
          Muzaffarabad
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for stores, products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-full pl-9"
          />
        </div>
      </header>

      <h1 className="sr-only">SheharLink — Muzaffarabad delivery</h1>

      {/* Hero */}
      <section className="px-4 pt-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
          <div className="relative h-40 w-full">
            <img
              src={heroImg}
              alt="Muzaffarabad valley"
              width={1280}
              height={768}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/70 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center p-4">
              <h2 className="text-lg font-extrabold leading-tight text-foreground">
                Everything You Need,
                <br />
                <span className="text-primary">Delivered to You</span>
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
          <button className="text-xs font-semibold text-primary">View all ›</button>
        </div>
        <div className="no-scrollbar grid grid-flow-col grid-rows-2 auto-cols-[80px] gap-3 overflow-x-auto px-4 pb-1">
          {categories.map(({ id, label, icon: Icon }) => {
            const active = activeCat === id;
            return (
              <button
                key={id}
                onClick={() => setActiveCat(id)}
                className="flex flex-col items-center gap-1.5 transition active:scale-95"
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition-colors ${
                    active
                      ? "border-primary bg-secondary text-primary"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  <Icon className="h-7 w-7" />
                </span>
                <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Popular Stores */}
      <section className="pt-6">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="text-sm font-bold">Popular Stores</h2>
          <button className="text-xs font-semibold text-primary">View all ›</button>
        </div>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 w-44 shrink-0 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="px-4 text-xs text-muted-foreground">No stores yet for this category.</div>
        ) : (
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {filteredStores.map((s) => (
              <StoreCard key={s.id} store={s} />
            ))}
          </div>
        )}
      </section>

      {/* Promo banner */}
      <section className="px-4 pt-6">
        <div
          className="relative flex items-center overflow-hidden rounded-2xl p-4"
          style={{ background: "linear-gradient(135deg, hsl(271 81% 56%), hsl(280 70% 65%))" }}
        >
          <div className="relative z-10 text-primary-foreground">
            <p className="text-xl font-extrabold leading-none">Flat 20% OFF</p>
            <p className="mt-1 text-xs font-medium opacity-95">On your first order</p>
            <span className="mt-2 inline-block rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-bold backdrop-blur">
              Use Code: WELCOME20
            </span>
          </div>
          <img
            src={promoBasket}
            alt=""
            width={768}
            height={512}
            loading="lazy"
            className="absolute -right-4 top-1/2 h-32 w-auto -translate-y-1/2 object-contain"
          />
        </div>
      </section>

      {/* Popular Near You */}
      <section className="pt-6">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="text-sm font-bold">Popular Near You</h2>
          <button className="text-xs font-semibold text-primary">View all ›</button>
        </div>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 w-36 shrink-0 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="px-4 text-xs text-muted-foreground">No products yet.</div>
        ) : (
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const FeatureChip = ({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Truck;
  title: string;
  subtitle: string;
}) => (
  <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
      <Icon className="h-3.5 w-3.5" />
    </span>
    <div className="min-w-0 leading-tight">
      <p className="truncate text-[10px] font-bold">{title}</p>
      <p className="truncate text-[9px] text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);

const StoreCard = ({ store }: { store: Store }) => {
  const { isStoreFav, toggleStore } = useFavorites();
  const fav = isStoreFav(store.id);
  const categoryLabel: Record<Store["category"], string> = {
    grocery: "Grocery",
    fruits_veggies: "Fruits & Veggies",
    fast_food: "Fast Food",
  };
  return (
    <Link
      to={`/store/${store.id}`}
      className="w-44 shrink-0 overflow-hidden rounded-2xl border border-border bg-card transition active:scale-[0.98]"
    >
      <div className="relative h-24 w-full bg-muted">
        {store.image_url && (
          <img
            src={store.image_url}
            alt={store.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
        <button
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={fav}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-foreground backdrop-blur"
          onClick={(e) => {
            e.preventDefault();
            toggleStore(store.id);
          }}
        >
          <Heart className={`h-3.5 w-3.5 ${fav ? "fill-primary text-primary" : ""}`} />
        </button>
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-bold">{store.name}</p>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-foreground">4.6</span>
          <span>·</span>
          <span>20–30 min</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {categoryLabel[store.category]}
        </p>
      </div>
    </Link>
  );
};

const ProductCard = ({ product }: { product: Product }) => (
  <Link
    to={`/product/${product.id}`}
    className="block w-36 shrink-0 overflow-hidden rounded-2xl border border-border bg-card transition active:scale-[0.98]"
  >
    <div className="h-28 w-full bg-muted">
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </div>
    <div className="p-2.5">
      <p className="truncate text-xs font-bold">{product.name}</p>
      <p className="truncate text-[10px] text-muted-foreground">
        {product.stores?.name ?? "Store"}
      </p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs font-bold">Rs. {Math.round(product.price)}</p>
        <span
          aria-hidden
          className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  </Link>
);

export default Home;
