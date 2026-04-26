import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart, DELIVERY_FEE } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Cart = () => {
  const navigate = useNavigate();
  const cart = useCart();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

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

  const subtotal = cart.subtotal();
  const total = subtotal + (cart.items.length > 0 ? DELIVERY_FEE : 0);

  const placeOrder = async () => {
    if (!user) return navigate("/auth", { state: { from: "/cart" } });
    if (!cart.storeId || cart.items.length === 0) return;
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error("Please fill name, phone, and address");
      return;
    }
    setPlacing(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        store_id: cart.storeId,
        items: cart.items as any,
        subtotal,
        delivery_fee: DELIVERY_FEE,
        total_amount: total,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_address: address.trim(),
        notes: notes.trim() || null,
      })
      .select("id,short_id")
      .single();
    setPlacing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    cart.clear();
    toast.success(`Order ${data.short_id} placed!`);
    navigate(`/orders/${data.id}`, { replace: true });
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
        {cart.storeName && <p className="text-xs text-muted-foreground">From {cart.storeName}</p>}
      </div>

      <Card className="divide-y divide-border p-0">
        {cart.items.map((i) => (
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
      </Card>

      <Card className="space-y-2 p-4 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>Rs. {subtotal}</span></div>
        <div className="flex justify-between"><span>Delivery fee</span><span>Rs. {DELIVERY_FEE}</span></div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span>Rs. {total}</span></div>
        <p className="pt-1 text-xs text-muted-foreground">Payment: <span className="font-semibold text-foreground">Cash on Delivery</span></p>
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
        <Button onClick={placeOrder} disabled={placing} className="h-14 w-full rounded-full text-base shadow-lg">
          {placing ? "Placing..." : `Place Order · Rs. ${total}`}
        </Button>
      </div>
    </div>
  );
};

export default Cart;
