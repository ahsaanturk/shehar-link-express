import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Store, Package, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useArea } from "@/hooks/useArea";

interface Suggestion {
  id: string;
  name: string;
  type: "category" | "store" | "product";
  url: string;
  image_url?: string | null;
}

export const SearchAutocomplete = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { selectedArea } = useArea();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const [catsRes, storesRes, prodsRes] = await Promise.all([
          supabase.rpc('search_categories', { search_term: query, page_limit: 3 }),
          supabase.rpc('search_stores', { search_term: query, search_area: selectedArea?.id || null, page_limit: 3 }),
          supabase.rpc('search_products', { search_term: query, search_area: selectedArea?.id || null, page_limit: 5, page_offset: 0 })
        ]);

        const newSuggestions: Suggestion[] = [];

        if (catsRes.data) {
          catsRes.data.forEach((c: { id: string; name: string; slug: string }) => {
            newSuggestions.push({
              id: c.id,
              name: c.name,
              type: "category",
              url: `/category/${c.slug}`
            });
          });
        }

        if (storesRes.data) {
          storesRes.data.forEach((s: { id: string; name: string; image_url: string; slug: string }) => {
            newSuggestions.push({
              id: s.id,
              name: s.name,
              type: "store",
              image_url: s.image_url,
              url: `/${s.slug}`
            });
          });
        }

        if (prodsRes.data) {
          prodsRes.data.forEach((p: { id: string; name: string; image_url: string }) => {
            // we assume stores table slug is needed, but we don't have it directly from the simple RPC unless joined.
            // Our RPC joins stores but doesn't explicitly return store slug. Let's fallback to search results or a generic product link if slug is missing.
            // Actually the RPC returns the product. Let's just link to product detail. ProductDetail handles missing store slug.
            newSuggestions.push({
              id: p.id,
              name: p.name,
              type: "product",
              image_url: p.image_url,
              url: `/product/${p.id}` // A direct link to product page is supported by ProductDetail route (`/product/:id`)
            });
          });
        }

        setSuggestions(newSuggestions);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [query, selectedArea]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={onSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Search for stores, products…" 
          value={query} 
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => { if (query) setIsOpen(true); }}
          className="rounded-full pl-9 bg-secondary/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all" 
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>

      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg animate-in fade-in zoom-in-95">
          <div className="max-h-[60vh] overflow-y-auto overscroll-contain py-2">
            {suggestions.length === 0 && !loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches found for "{query}"</p>
            ) : (
              <ul>
                {suggestions.map((s) => (
                  <li key={`${s.type}-${s.id}`}>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        navigate(s.url);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-muted active:bg-muted/80"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary text-muted-foreground">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} loading="lazy" className="h-full w-full object-cover" />
                        ) : s.type === "category" ? (
                          <LayoutGrid className="h-5 w-5" />
                        ) : s.type === "store" ? (
                          <Store className="h-5 w-5" />
                        ) : (
                          <Package className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-semibold">{s.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.type}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-border bg-muted/30 p-2">
            <button
              onClick={onSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20 active:scale-[0.98]"
            >
              <Search className="h-4 w-4" />
              View all results for "{query}"
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
