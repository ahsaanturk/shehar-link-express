import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useLocation } from "react-router-dom";

/**
 * Floating cart button anchored bottom-right above the bottom nav.
 * Hidden on cart, auth, admin, checkout-like pages.
 */
export const FloatingCart = () => {
  const count = useCart((s) => s.itemCount());
  const subtotal = useCart((s) => s.subtotal());
  const { pathname } = useLocation();

  if (count === 0) return null;
  if (pathname.startsWith("/cart") || pathname.startsWith("/auth") || pathname.startsWith("/admin")) return null;

  return (
    <Link
      to="/cart"
      aria-label={`View cart with ${count} items`}
      className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-2xl shadow-primary/40 transition active:scale-95"
    >
      <span className="relative">
        <ShoppingCart className="h-5 w-5" />
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {count}
        </span>
      </span>
      <span className="text-sm font-bold">View Cart · Rs. {subtotal}</span>
    </Link>
  );
};
