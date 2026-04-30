import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, OrderStatus } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from "@/components/ui/drawer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Phone, MessageCircle, Loader2, Smartphone, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface AdminOrder {
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

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "preparing", label: "Preparing" },
  { value: "picked_up", label: "Picked Up" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const NEXT_ACTIONS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }[]>> = {
  pending: [{ next: "preparing", label: "Accept (Preparing)" }, { next: "cancelled", label: "Cancel" }],
  preparing: [{ next: "picked_up", label: "Mark Picked Up" }, { next: "cancelled", label: "Cancel" }],
  picked_up: [{ next: "delivered", label: "Mark Delivered" }],
};

const buildWhatsAppText = (o: AdminOrder, storeName?: string) => {
  const lines = [
    `*SheharLink Order ${o.short_id}*`,
    storeName ? `From: ${storeName}` : null,
    `Customer: ${o.customer_name}`,
    `Phone: ${o.customer_phone}`,
    `Address: ${o.customer_address}`,
    "",
    "Items:",
    ...(o.items as any[]).map((i: any) => `• ${i.qty} × ${i.name} — Rs. ${i.price * i.qty}`),
    "",
    `Subtotal: Rs. ${o.subtotal}`,
    `Delivery: Rs. ${o.delivery_fee}`,
    `*Total (COD): Rs. ${o.total_amount}*`,
    o.notes ? `\nNote: ${o.notes}` : null,
  ].filter(Boolean);
  return lines.join("\n");
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [updating, setUpdating] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: o } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      const list = (o ?? []) as AdminOrder[];
      setOrders(list);
      const ids = Array.from(new Set(list.map((x) => x.store_id)));
      if (ids.length) {
        const { data: s } = await supabase.from("stores").select("id,name").in("id", ids);
        setStoreNames(Object.fromEntries((s ?? []).map((x: any) => [x.id, x.name])));
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => {
          if (payload.eventType === "INSERT") {
            toast.success(`New order ${(payload.new as any).short_id}`);
            return [payload.new as AdminOrder, ...prev];
          }
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as AdminOrder;
            setSelected((sel) => (sel?.id === updated.id ? updated : sel));
            return prev.map((o) => (o.id === updated.id ? updated : o));
          }
          if (payload.eventType === "DELETE") return prev.filter((o) => o.id !== (payload.old as any).id);
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  );

  const updateStatus = async (next: OrderStatus, reason?: string) => {
    if (!selected) return;
    if (next === "cancelled" && !reason) {
      setCancelOpen(true);
      return;
    }
    setUpdating(true);
    const update: any = { status: next };
    if (next === "cancelled") {
      update.cancellation_reason = reason;
      update.cancelled_by_admin = true;
    }
    const { error } = await supabase.from("orders").update(update).eq("id", selected.id);
    setUpdating(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Marked ${next.replace("_", " ")}`);
      setCancelOpen(false);
      setCancelReason("");
    }
  };

  const shareWhatsApp = (o: AdminOrder) => {
    const text = encodeURIComponent(buildWhatsAppText(o, storeNames[o.store_id]));
    window.open(`https://wa.me/92${o.customer_phone.replace(/^0/, "")}?text=${text}`, "_blank");
  };

  const notifyUser = (o: AdminOrder, type: "preparing" | "picked_up", method: "wa" | "sms") => {
    const msg = type === "preparing" 
      ? `Hello ${o.customer_name}, your order ${o.short_id} from ${storeNames[o.store_id] || "SheharLink"} is now being prepared.`
      : `Hello ${o.customer_name}, your order ${o.short_id} has been picked up by our rider and is on the way to you!`;
    const text = encodeURIComponent(msg);
    const phone = `92${o.customer_phone.replace(/^0/, "")}`;
    if (method === "wa") {
      window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
    } else {
      window.location.href = `sms:+${phone}?body=${text}`;
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Link to="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-xl font-bold">Live orders</h1>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="no-scrollbar h-auto w-full justify-start gap-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value} className="text-xs">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No orders in this view.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((o) => {
            const itemCount = Array.isArray(o.items) ? o.items.reduce((s: number, i: any) => s + (i.qty ?? 0), 0) : 0;
            return (
              <Card
                key={o.id}
                className="cursor-pointer p-4 transition active:scale-[0.99]"
                onClick={() => setSelected(o)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{o.short_id}</p>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.customer_name} · {itemCount} item{itemCount !== 1 ? "s" : ""} · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{storeNames[o.store_id] ?? "—"}</p>
                  </div>
                  <p className="text-sm font-bold">Rs. {o.total_amount}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          {selected && (
            <div className="mx-auto w-full max-w-md">
              <DrawerHeader>
                <DrawerTitle className="flex items-center justify-between">
                  <span>{selected.short_id}</span>
                  <StatusBadge status={selected.status} />
                </DrawerTitle>
                <DrawerDescription>{storeNames[selected.store_id] ?? ""}</DrawerDescription>
              </DrawerHeader>

              <div className="space-y-3 px-4 pb-4 text-sm">
                <div>
                  <p className="font-semibold">{selected.customer_name}</p>
                  <a href={`tel:${selected.customer_phone}`} className="mt-0.5 flex items-center gap-2 text-primary">
                    <Phone className="h-3 w-3" /> {selected.customer_phone}
                  </a>
                  <p className="mt-1 flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {selected.customer_address}
                  </p>
                  {selected.notes && <p className="mt-1 text-xs text-muted-foreground">Note: {selected.notes}</p>}
                </div>

                <ul className="divide-y divide-border rounded-lg border border-border">
                  {(selected.items as any[]).map((i: any, idx: number) => (
                    <li key={idx} className="flex justify-between p-2.5">
                      <span>{i.qty} × {i.name}</span>
                      <span className="text-muted-foreground">Rs. {i.price * i.qty}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-1 rounded-lg bg-muted p-3 text-xs">
                  <div className="flex justify-between"><span>Subtotal</span><span>Rs. {selected.subtotal}</span></div>
                  <div className="flex justify-between"><span>Delivery</span><span>Rs. {selected.delivery_fee}</span></div>
                  <div className="flex justify-between text-base font-bold"><span>Total (COD)</span><span>Rs. {selected.total_amount}</span></div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => shareWhatsApp(selected)}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Share to Store WhatsApp
                </Button>

                {selected.status === "cancelled" && selected.cancellation_reason && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="flex items-center gap-2 text-xs font-bold text-destructive">
                      <AlertCircle className="h-3 w-3" /> Cancelled Reason
                    </p>
                    <p className="mt-1 text-xs">{selected.cancellation_reason} {selected.cancelled_by_admin && "(by Admin)"}</p>
                  </div>
                )}

                {(selected.status === "preparing" || selected.status === "picked_up") && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notify Customer</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => notifyUser(selected, selected.status as any, "wa")}>
                        <MessageCircle className="mr-1 h-3.5 w-3.5 text-green-600" /> WhatsApp
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => notifyUser(selected, selected.status as any, "sms")}>
                        <Smartphone className="mr-1 h-3.5 w-3.5 text-blue-600" /> SMS
                      </Button>
                    </div>
                  </div>
                )}

                {NEXT_ACTIONS[selected.status]?.map((a) => (
                  <Button
                    key={a.next}
                    variant={a.next === "cancelled" ? "destructive" : "default"}
                    className="w-full"
                    disabled={updating}
                    onClick={() => updateStatus(a.next)}
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : a.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>Please provide a reason for cancelling this order. This will be shown to the customer.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input 
              placeholder="Reason (e.g. Out of stock, Store closed...)" 
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button variant="destructive" onClick={() => updateStatus("cancelled", cancelReason)} disabled={updating || !cancelReason.trim()}>
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
