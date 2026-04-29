import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, ShoppingCart, Store as StoreIcon } from "lucide-react";

interface ProductFull {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_visible: boolean;
  store_id: string;
  seo_title: string | null;
  seo_description: string | null;
  stores: { id: string; slug: string; name: string; image_url: string | null; is_visible: boolean; is_active: boolean } | null;
}

const ProductDetail = () => {
  const params = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { isProductFav, toggleProduct } = useFavorites();
  const [product, setProduct] = useState<ProductFull | null>(null);
  const [loading, setLoading] = useState(true);

  // Supports /product/:id (legacy) AND /:storeSlug/:productSlug (SEO)
  const legacyId = params.id;
  const storeSlug = params.storeSlug;
  const productSlug = params.productSlug;

  useEffect(() => {
    setLoading(true);
    const select = "id,slug,name,description,price,image_url,is_available,is_visible,store_id,seo_title,seo_description,stores(id,slug,name,image_url,is_visible,is_active)";

    const finalize = (data: any) => {
      if (!data || !data.is_visible || !data.stores?.is_visible || !data.stores?.is_active) {
        setProduct(null);
      } else {
        setProduct(data as ProductFull);
      }
      setLoading(false);
    };

    if (legacyId) {
      supabase.from("products").select(select).eq("id", legacyId).maybeSingle()
        .then(({ data }) => finalize(data));
    } else if (storeSlug && productSlug) {
      // find store first then product (slug unique per store)
      supabase.from("stores").select("id").eq("slug", storeSlug).maybeSingle().then(({ data: s }) => {
        if (!s) { setProduct(null); setLoading(false); return; }
        supabase.from("products").select(select).eq("store_id", s.id).eq("slug", productSlug).maybeSingle()
          .then(({ data }) => finalize(data));
      });
    } else { setLoading(false); }
  }, [legacyId, storeSlug, productSlug]);

  const seoTitle = product
    ? (product.seo_title || `${product.name} — Rs. ${Math.round(product.price)} | SheharLink`)
    : "Product | SheharLink";
  const seoDesc = product
    ? (product.seo_description || product.description || `Order ${product.name} from ${product.stores?.name ?? "local stores"} on SheharLink Muzaffarabad.`).slice(0, 160)
    : "Product details on SheharLink Muzaffarabad.";

  useSEO({
    title: seoTitle,
    description: seoDesc,
    image: product?.image_url ?? undefined,
    canonical: product && product.stores ? `${window.location.origin}/${product.stores.slug}/${product.slug}` : undefined,
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
            availability: product.is_available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: product.stores ? `${window.location.origin}/${product.stores.slug}/${product.slug}` : undefined,
          },
        }
      : null,
  });

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
        <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!product) return <div className="p-8 text-center text-sm text-muted-foreground">Product not found.</div>;

  const inCart = cart.items.find((i) => i.product_id === product.id)?.qty ?? 0;
  const fav = isProductFav(product.id);

  const addToCart = () => {
    cart.add({
      product_id: product.id,
      store_id: product.store_id,
      store_name: product.stores?.name ?? "Store",
      store_slug: product.stores?.slug,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url,
    });
  };

  return (
    <article className="pb-32">
      <div className="relative h-72 w-full bg-muted">
        {product.image_url && <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />}
        <button onClick={() => navigate(-1)} aria-label="Back"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={() => toggleProduct(product.id)} aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur">
          <Heart className={`h-5 w-5 ${fav ? "fill-primary text-primary" : ""}`} />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <header>
          <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>
          <p className="mt-1 text-2xl font-extrabold text-primary">Rs. {Math.round(product.price)}</p>
          {!product.is_available && <p className="mt-1 text-xs font-semibold text-destructive">Currently unavailable</p>}
        </header>

        {product.stores && (
          <Link to={`/${product.stores.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              {product.stores.image_url ? (
                <img src={product.stores.image_url} alt={product.stores.name} className="h-full w-full rounded-xl object-cover" />
              ) : <StoreIcon className="h-5 w-5" />}
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

      {product.is_available && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-4">
          {inCart === 0 ? (
            <Button onClick={addToCart} className="h-14 w-full rounded-full text-base shadow-lg">
              <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart · Rs. {Math.round(product.price)}
            </Button>
          ) : (
            <Button onClick={() => navigate("/cart")} className="h-14 w-full rounded-full text-base shadow-lg">
              <ShoppingCart className="mr-2 h-5 w-5" /> View Cart · {inCart} item{inCart !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      )}
    </article>
  );
};

export default ProductDetail;
