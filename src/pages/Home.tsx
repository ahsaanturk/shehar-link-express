import { MapPin, Search, ShoppingBasket, Apple, Pizza } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const categories = [
  { id: "grocery", label: "Grocery", icon: ShoppingBasket, tint: "bg-secondary text-secondary-foreground" },
  { id: "fruits_veggies", label: "Fruits & Veggies", icon: Apple, tint: "bg-secondary text-secondary-foreground" },
  { id: "fast_food", label: "Fast Food", icon: Pizza, tint: "bg-secondary text-secondary-foreground" },
];

const Home = () => {
  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Deliver to</p>
            <div className="flex items-center gap-1 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              Muzaffarabad
            </div>
          </div>
          <div className="text-lg font-extrabold tracking-tight text-primary">SheharLink</div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input placeholder="Search stores or items" className="pl-9" />
        </div>
      </header>

      <h1 className="sr-only">SheharLink — Muzaffarabad delivery</h1>

      {/* Hero strip */}
      <section className="px-4 pt-4">
        <div
          className="rounded-2xl p-4 text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <p className="text-xs font-medium opacity-90">Cash on delivery</p>
          <p className="mt-1 text-lg font-bold leading-tight">Fresh stock, fast riders across Muzaffarabad</p>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Categories</h2>
        <div className="grid grid-cols-3 gap-3">
          {categories.map(({ id, label, icon: Icon, tint }) => (
            <Link
              key={id}
              to={`/category/${id}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition active:scale-95"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-full ${tint}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="text-center text-xs font-medium leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular stores rail (placeholder) */}
      <section className="pt-6">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="text-sm font-semibold">Popular Stores</h2>
          <Link to="/stores" className="text-xs font-medium text-primary">See all</Link>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-40 shrink-0 rounded-xl border border-border bg-card p-3">
              <div className="mb-2 h-24 w-full rounded-lg bg-muted" />
              <p className="truncate text-sm font-semibold">Store {i}</p>
              <p className="text-xs text-muted-foreground">Grocery · 15–25 min</p>
            </div>
          ))}
        </div>
      </section>

      {/* Near you rail (placeholder) */}
      <section className="pt-6">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="text-sm font-semibold">Near You</h2>
        </div>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-40 shrink-0 rounded-xl border border-border bg-card p-3">
              <div className="mb-2 h-24 w-full rounded-lg bg-muted" />
              <p className="truncate text-sm font-semibold">Local Spot {i}</p>
              <p className="text-xs text-muted-foreground">Fast Food · 20–30 min</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
