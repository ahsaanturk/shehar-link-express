import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, OrderStatus } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check, Clock, MapPin, Phone, AlertCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
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
  cancellation_reason: string | null;
  cancelled_by_admin: boolean;
}

const CANCEL_OPTIONS = [
  "Change of mind",
  "Ordered by mistake",
  "Long delivery time",
  "Found better price",
  "Other",
];

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
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelText, setCancelText] = useState("");

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

  const handleCancel = async () => {
    if (!id || !order) return;
    if (!cancelReason) return toast.error("Please select a reason");
    const finalReason = cancelReason === "Other" ? cancelText : cancelReason;
    if (cancelReason === "Other" && !cancelText.trim()) return toast.error("Please specify your reason");

    setCancelling(true);
    const { error } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancellation_reason: finalReason,
        cancelled_by_admin: false,
      })
      .eq("id", id);
    setCancelling(false);
    
    if (error) toast.error(error.message);
    else {
      toast.success("Order cancelled");
      setCancelOpen(false);
    }
  };

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
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <div>
              <p className="font-bold text-destructive">This order was cancelled.</p>
              {order.cancellation_reason && (
                <p className="mt-1 text-muted-foreground">
                  Reason: <span className="text-foreground">{order.cancellation_reason}</span>
                  {order.cancelled_by_admin && <span className="ml-1 font-semibold text-destructive">(by Admin)</span>}
                </p>
              )}
            </div>
          </div>
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

      {!cancelled && order.status === "pending" && (
        <Button
          variant="outline"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setCancelOpen(true)}
        >
          Cancel Order
        </Button>
      )}

      {!cancelled && order.status !== "pending" && (
        <p className="px-2 text-center text-[10px] text-muted-foreground">
          To cancel this order, please contact support via WhatsApp.
        </p>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>Please tell us why you want to cancel this order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {cancelReason === "Other" && (
              <Input
                placeholder="Type your reason here..."
                value={cancelText}
                onChange={(e) => setCancelText(e.target.value)}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetail;
