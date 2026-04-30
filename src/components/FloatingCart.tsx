import { Link, useLocation } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";

/**
 * Floating cart button anchored to the right side of the screen.
 * Grabs attention when items are in the cart.
 */
export const FloatingCart = () => {
  const count = useCart((s) => s.itemCount());
  const subtotal = useCart((s) => s.subtotal());
  const { pathname } = useLocation();

  if (count === 0) return null;
  if (pathname.startsWith("/cart") || pathname.startsWith("/auth") || pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed right-4 top-1/2 z-50 -translate-y-1/2 transition-all duration-300 animate-in fade-in slide-in-from-right-4">
      <Link
        to="/cart"
        aria-label={`View cart with ${count} items`}
        className={cn(
          "flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl transition hover:scale-105 active:scale-95",
          "ring-4 ring-background"
        )}
      >
        <div className="relative">
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-primary shadow-sm">
            {count}
          </span>
        </div>
        <p className="mt-1 text-[10px] font-bold">Rs. {Math.round(subtotal)}</p>
      </Link>
    </div>
  );
};
