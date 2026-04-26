import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, OrderStatus } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Clock, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  short_id: string;
  status: OrderStatus;
  items: any;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes: string | null;
  created_at: string;
  store_id: string;
}

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "preparing", label: "Preparing" },
  { key: "picked_up", label: "Picked Up" },
  { key: "delivered", label: "Delivered" },
];

const stepIndex = (s: OrderStatus) => STEPS.findIndex((x) => x.key === s);

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      setOrder(data as Order | null);
      if (data?.store_id) {
        const { data: s } = await supabase.from("stores").select("name").eq("id", data.store_id).maybeSingle();
        setStoreName(s?.name ?? "");
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (payload) => {
        setOrder((prev) => ({ ...(prev as Order), ...(payload.new as Order) }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) return <div className="p-4"><div className="h-40 animate-pulse rounded-lg bg-muted" /></div>;
  if (!order) return <div className="p-8 text-center text-sm text-muted-foreground">Order not found.</div>;

  const cancelled = order.status === "cancelled";
  const currentStep = stepIndex(order.status);

  return (
    <div className="space-y-4 p-4 pb-8">
      <div className="flex items-center gap-2">
        <Link to="/orders">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">Order</p>
          <h1 className="text-xl font-bold tracking-tight">{order.short_id}</h1>
        </div>
        <div className="ml-auto"><StatusBadge status={order.status} /></div>
      </div>

      {cancelled ? (
        <Card className="border-destructive/50 bg-destructive/5 p-4 text-sm">
          This order was cancelled.
        </Card>
      ) : (
        <Card className="p-4">
          <p className="mb-4 text-sm font-semibold">Tracking</p>
          <ol className="relative space-y-4">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStep;
              const active = idx === currentStep;
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition",
                    done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
                  )}>
                    {done ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </span>
                  <span className={cn("text-sm", done ? "font-semibold" : "text-muted-foreground", active && "text-primary")}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold">From {storeName || "—"}</p>
        <ul className="divide-y divide-border text-sm">
          {(order.items as any[]).map((i: any, idx: number) => (
            <li key={idx} className="flex justify-between py-2">
              <span>{i.qty} × {i.name}</span>
              <span className="text-muted-foreground">Rs. {i.price * i.qty}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-border pt-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>Rs. {order.subtotal}</span></div>
          <div className="flex justify-between"><span>Delivery fee</span><span>Rs. {order.delivery_fee}</span></div>
          <div className="flex justify-between font-bold"><span>Total (COD)</span><span>Rs. {order.total_amount}</span></div>
        </div>
      </Card>

      <Card className="space-y-2 p-4 text-sm">
        <p className="font-semibold">Delivery to</p>
        <p>{order.customer_name}</p>
        <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3" /> {order.customer_phone}</p>
        <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {order.customer_address}</p>
        {order.notes && <p className="border-t border-border pt-2 text-xs text-muted-foreground">Note: {order.notes}</p>}
      </Card>
    </div>
  );
};

export default OrderDetail;
