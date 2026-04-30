import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart, findTier, type DeliveryTier } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useArea } from "@/hooks/useArea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AreaPicker } from "@/components/AreaPicker";
import { Minus, Plus, ShoppingBag, Trash2, AlertTriangle, Store as StoreIcon, Tag, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface CouponResult {
  valid: boolean;
  coupon_id?: string;
  code?: string;
  type?: string;
  value?: number;
  discount?: number;
  store_id?: string | null;
  error?: string;
}

const Cart = () => {
  const navigate = useNavigate();
  const cart = useCart();
  const { user } = useAuth();
  const { selectedArea } = useArea();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [tiers, setTiers] = useState<DeliveryTier[]>([]);
  const [storeAreaMap, setStoreAreaMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name,phone,address").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setName((prev) => prev || data.name || "");
        setPhone((prev) => prev || data.phone || "");
        setAddress((prev) => prev || data.address || "");
      }
    });
  }, [user]);

  // Load tiers + areas-for-stores in cart
  useEffect(() => {
    supabase.from("delivery_tiers").select("id,label,near_count,away_count,price").eq("is_active", true)
      .order("sort_order").then(({ data }) => setTiers((data ?? []) as DeliveryTier[]));
  }, []);

  const storeIds = cart.storeIds();
  useEffect(() => {
    if (storeIds.length === 0) { setStoreAreaMap({}); return; }
    supabase.from("store_areas").select("store_id,area_id").in("store_id", storeIds).then(({ data }) => {
      const map: Record<string, string[]> = {};
      (data ?? []).forEach((r: any) => {
        (map[r.store_id] = map[r.store_id] ?? []).push(r.area_id);
      });
      setStoreAreaMap(map);
    });
  }, [storeIds.join(",")]);

  const grouped = cart.itemsByStore();
  const storeNames = useMemo(() => {
    const m: Record<string, string> = {};
    cart.items.forEach((i) => { m[i.store_id] = i.store_name; });
    return m;
  }, [cart.items]);

  // Compute near/away
  const { nearCount, awayCount, awayStores } = useMemo(() => {
    let n = 0, a = 0;
    const away: string[] = [];
    for (const sid of storeIds) {
      const linked = storeAreaMap[sid] ?? [];
      const isNear = selectedArea ? linked.includes(selectedArea.id) : false;
      if (isNear) n++; else { a++; away.push(storeNames[sid] ?? "Store"); }
    }
    return { nearCount: n, awayCount: a, awayStores: away };
  }, [storeIds.join(","), storeAreaMap, selectedArea?.id, storeNames]);

  const tier = findTier(tiers, nearCount, awayCount);
  const subtotal = cart.subtotal();
  const discount = coupon?.discount ?? 0;
  const deliveryFee = tier?.price ?? 0;
  const total = subtotal - discount + deliveryFee;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    // Use the primary store id from the first cart item for store-scoped validation
    const primaryStoreId = storeIds[0] ?? null;
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: couponCode.trim().toUpperCase(),
      p_store_id: primaryStoreId,
      p_subtotal: subtotal,
    });
    setApplyingCoupon(false);
    if (error) { toast.error(error.message); return; }
    const result = data as CouponResult;
    if (!result.valid) { toast.error(result.error ?? 'Invalid coupon'); return; }
    setCoupon(result);
    toast.success(`Coupon applied! You save Rs. ${result.discount}`);
  };

  const removeCoupon = () => { setCoupon(null); setCouponCode(""); };

  const policyError = cart.items.length > 0 && !tier
    ? `No delivery option for this combination (${nearCount} near + ${awayCount} away store${awayCount + nearCount === 1 ? "" : "s"}). Please contact support or change your area / remove a store.`
    : null;

  const placeOrder = async () => {
    if (!user) return navigate("/auth", { state: { from: "/cart" } });
    if (cart.items.length === 0) return;
    if (!tier) { toast.error("No delivery option available for this cart."); return; }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error("Please fill name, phone, and address");
      return;
    }
    setPlacing(true);

    // Split delivery fee proportionally across stores by subtotal
    const orderRows: any[] = [];
    for (const sid of storeIds) {
      const items = grouped[sid];
      const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
      const share = Math.round(deliveryFee * (sub / subtotal));
      orderRows.push({
        customer_id: user.id,
        store_id: sid,
        items: items as any,
        subtotal: sub,
        delivery_fee: share,
        total_amount: sub + share - Math.round(discount * (sub / subtotal)),
        discount_amount: Math.round(discount * (sub / subtotal)),
        coupon_id: coupon?.coupon_id ?? null,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_address: address.trim(),
        notes: notes.trim() || null,
        delivery_tier_label: tier.label,
      });
    }

    const { data, error } = await supabase.from("orders").insert(orderRows).select("id,short_id");
    // Use coupon if applied
    if (!error && coupon?.coupon_id) {
      await supabase.rpc('use_coupon', { p_coupon_id: coupon.coupon_id });
    }
    setPlacing(false);
    if (error) { toast.error(error.message); return; }
    cart.clear();
    toast.success(`Placed ${data?.length ?? 0} order${data && data.length !== 1 ? "s" : ""}!`);
    if (data && data.length === 1) navigate(`/orders/${data[0].id}`, { replace: true });
    else navigate("/orders", { replace: true });
  };

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Your cart is empty</h2>
        <p className="mt-1 text-sm text-muted-foreground">Browse stores to add items.</p>
        <Link to="/" className="mt-6">
          <Button>Browse stores</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-32">
      <div>
        <h1 className="text-xl font-bold">Your cart</h1>
        <p className="text-xs text-muted-foreground">{storeIds.length} store{storeIds.length !== 1 ? "s" : ""} · {cart.itemCount()} items</p>
      </div>

      <Card className="p-3">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Delivering to</p>
        <AreaPicker />
      </Card>

      {storeIds.map((sid) => {
        const items = grouped[sid];
        const linked = storeAreaMap[sid] ?? [];
        const isNear = selectedArea ? linked.includes(selectedArea.id) : false;
        return (
          <Card key={sid} className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <StoreIcon className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">{storeNames[sid]}</p>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isNear ? "bg-primary/15 text-primary" : "bg-yellow-500/15 text-yellow-700"}`}>
                  {isNear ? "Near you" : "Away"}
                </span>
              </div>
              <button onClick={() => cart.clearStore(sid)} className="text-xs text-destructive">Remove</button>
            </div>
            <div className="divide-y divide-border">
              {items.map((i) => (
                <div key={i.product_id} className="flex items-center gap-3 p-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {i.image_url && <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">Rs. {i.price} × {i.qty}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cart.setQty(i.product_id, i.qty - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="min-w-[1.5ch] text-center text-sm font-semibold">{i.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => cart.setQty(i.product_id, i.qty + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => cart.remove(i.product_id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {policyError && (
        <Card className="flex items-start gap-2 border-destructive/40 bg-destructive/5 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-bold text-destructive">Delivery not available for this combination</p>
            <p className="mt-0.5 text-muted-foreground">{policyError}</p>
            {awayStores.length > 0 && <p className="mt-1 text-muted-foreground">Away store(s): {awayStores.join(", ")}</p>}
          </div>
        </Card>
      )}

      <Card className="space-y-2 p-4 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>Rs. {subtotal}</span></div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount ({coupon?.code})</span>
            <span>− Rs. {discount}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Delivery fee {tier && <span className="text-xs text-muted-foreground">({tier.label})</span>}</span>
          <span>Rs. {deliveryFee}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span>Rs. {total}</span></div>
        <p className="pt-1 text-xs text-muted-foreground">Payment: <span className="font-semibold text-foreground">Cash on Delivery</span></p>

        {/* Coupon field */}
        <div className="pt-2">
          {coupon ? (
            <div className="flex items-center justify-between rounded-xl bg-green-500/10 px-3 py-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-bold">{coupon.code} — Rs. {discount} off</span>
              </div>
              <button onClick={removeCoupon} className="text-xs text-destructive font-semibold">Remove</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  className="pl-9 rounded-full"
                />
              </div>
              <Button variant="outline" onClick={applyCoupon} disabled={applyingCoupon || !couponCode.trim()} className="rounded-full">
                {applyingCoupon ? "…" : "Apply"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">Delivery details</h2>
        <div className="space-y-2">
          <Label htmlFor="c-name">Name</Label>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-phone">Phone</Label>
          <Input id="c-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-addr">Address</Label>
          <Textarea id="c-addr" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-notes">Notes (optional)</Label>
          <Textarea id="c-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-4">
        <Button onClick={placeOrder} disabled={placing || !!policyError} className="h-14 w-full rounded-full text-base shadow-lg">
          {placing ? "Placing..." : `Place Order · Rs. ${total}`}
        </Button>
      </div>
    </div>
  );
};

export default Cart;
