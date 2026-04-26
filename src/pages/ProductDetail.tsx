import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Minus, Plus, ShoppingCart, Store as StoreIcon } from "lucide-react";

interface ProductFull {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  store_id: string;
  stores: { id: string; name: string; image_url: string | null; category: string } | null;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cart = useCart();
  const { isProductFav, toggleProduct } = useFavorites();
  const [product, setProduct] = useState<ProductFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("products")
      .select("id,name,description,price,image_url,is_available,store_id,stores(id,name,image_url,category)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data as ProductFull | null);
        setLoading(false);
      });
  }, [id]);

  const seoTitle = product
    ? `${product.name} — Rs. ${Math.round(product.price)} | SheharLink`
    : "Product | SheharLink";
  const seoDesc = product
    ? (product.description ?? `Order ${product.name} from ${product.stores?.name ?? "local stores"} on SheharLink Muzaffarabad.`).slice(0, 160)
    : "Product details on SheharLink Muzaffarabad.";

  useSEO({
    title: seoTitle,
    description: seoDesc,
    image: product?.image_url ?? undefined,
    jsonLd: product
      ? {
          "@context": "https://schema.org/",
          "@type": "Product",
          name: product.name,
          description: product.description ?? undefined,
          image: product.image_url ?? undefined,
          brand: product.stores?.name,
          offers: {
            "@type": "Offer",
            priceCurrency: "PKR",
            price: product.price,
            availability: product.is_available
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : null,
  });

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!product) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Product not found.</div>;
  }

  const inCart = cart.storeId === product.store_id ? cart.items.find((i) => i.product_id === product.id)?.qty ?? 0 : 0;
  const fav = isProductFav(product.id);

  return (
    <article className="pb-32">
      <div className="relative h-72 w-full bg-muted">
        {product.image_url && (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        )}
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => toggleProduct(product.id)}
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={fav}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur"
        >
          <Heart className={`h-5 w-5 ${fav ? "fill-primary text-primary" : ""}`} />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <header>
          <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
          <p className="mt-1 text-2xl font-extrabold text-primary">Rs. {Math.round(product.price)}</p>
          {!product.is_available && (
            <p className="mt-1 text-xs font-semibold text-destructive">Currently unavailable</p>
          )}
        </header>

        {product.stores && (
          <Link
            to={`/store/${product.stores.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              {product.stores.image_url ? (
                <img src={product.stores.image_url} alt={product.stores.name} className="h-full w-full rounded-xl object-cover" />
              ) : (
                <StoreIcon className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{product.stores.name}</p>
              <p className="text-[11px] text-muted-foreground">View store ›</p>
            </div>
          </Link>
        )}

        {product.description && (
          <section>
            <h2 className="mb-1 text-sm font-bold">Description</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          </section>
        )}
      </div>

      {/* Sticky add-to-cart */}
      {product.is_available && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-4">
          {inCart === 0 ? (
            <Button
              onClick={() =>
                cart.add(product.store_id, product.stores?.name ?? "Store", {
                  product_id: product.id,
                  name: product.name,
                  price: Number(product.price),
                  image_url: product.image_url,
                })
              }
              className="h-14 w-full rounded-full text-base shadow-lg"
            >
              <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart · Rs. {Math.round(product.price)}
            </Button>
          ) : (
            <div className="flex items-center justify-between rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg">
              <button
                onClick={() => cart.setQty(product.id, inCart - 1)}
                aria-label="Decrease"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/15"
              >
                <Minus className="h-5 w-5" />
              </button>
              <span className="text-base font-bold">{inCart} in cart · Rs. {Math.round(product.price * inCart)}</span>
              <button
                onClick={() => cart.setQty(product.id, inCart + 1)}
                aria-label="Increase"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/15"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default ProductDetail;
