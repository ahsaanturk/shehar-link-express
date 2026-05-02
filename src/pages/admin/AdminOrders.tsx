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
  status: any; // Allow mixed statuses
  items?: any;
  subtotal?: number;
  delivery_fee: number;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes?: string | null;
  description?: string; // For custom orders
  created_at: string;
  store_id?: string | null;
  store_name?: string | null; // For custom orders
  cancellation_reason?: string | null;
  cancelled_by_admin?: boolean;
  type: "standard" | "custom";
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
  if (o.type === "custom") {
    return [
      `*SheharLink Custom Order ${o.short_id}*`,
      `Store: ${o.store_name || "Custom Location"}`,
      `Customer: ${o.customer_name}`,
      `Phone: ${o.customer_phone}`,
      `Address: ${o.customer_address}`,
      "",
      `Request: ${o.description}`,
      "",
      `*Delivery Fee (COD): Rs. ${o.total_amount}*`,
    ].join("\n");
  }

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

  const load = async () => {
    setLoading(true);
    const [{ data: std }, { data: cust }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("custom_orders").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    const combined: AdminOrder[] = [
      ...(std ?? []).map(o => ({ ...o, type: "standard" as const })),
      ...(cust ?? []).map(o => ({ 
        ...o, 
        type: "custom" as const, 
        total_amount: o.delivery_fee ?? 0,
        subtotal: 0,
        notes: o.admin_notes
      })),
    ];

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setOrders(combined);

    const ids = Array.from(new Set((std ?? []).map((x) => x.store_id)));
    if (ids.length) {
      const { data: s } = await supabase.from("stores").select("id,name").in("id", ids);
      setStoreNames(Object.fromEntries((s ?? []).map((x: any) => [x.id, x.name])));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch1 = supabase.channel("admin-orders-std").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load()).subscribe();
    const ch2 = supabase.channel("admin-orders-cust").on("postgres_changes", { event: "*", schema: "public", table: "custom_orders" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
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
            const isCustom = o.type === "custom";
            const itemCount = Array.isArray(o.items) ? o.items.reduce((s: number, i: any) => s + (i.qty ?? 0), 0) : 0;
            return (
              <Card
                key={o.id}
                className={`cursor-pointer p-4 transition active:scale-[0.99] ${isCustom ? "border-primary/20 bg-primary/5" : ""}`}
                onClick={() => setSelected(o)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{o.short_id}</p>
                      <StatusBadge status={o.status} />
                      {isCustom && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary uppercase">Custom</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.customer_name} · {isCustom ? "Custom Request" : `${itemCount} item${itemCount !== 1 ? "s" : ""}`} · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{isCustom ? o.store_name : (storeNames[o.store_id!] ?? "—")}</p>
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
                <DrawerDescription>
                  {selected.type === "custom" ? (
                    <span className="flex items-center gap-1.5 text-primary font-bold uppercase text-[10px]">
                      Custom Order Request from {selected.store_name}
                    </span>
                  ) : (storeNames[selected.store_id!] ?? "")}
                </DrawerDescription>
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

                {selected.type === "custom" ? (
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Customer Request</p>
                    <p className="text-sm whitespace-pre-wrap italic">"{selected.description}"</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {(selected.items as any[]).map((i: any, idx: number) => (
                      <li key={idx} className="flex justify-between p-2.5">
                        <span>{i.qty} × {i.name}</span>
                        <span className="text-muted-foreground">Rs. {i.price * i.qty}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-1 rounded-lg bg-muted p-3 text-xs">
                  {selected.type === "standard" && <div className="flex justify-between"><span>Subtotal</span><span>Rs. {selected.subtotal}</span></div>}
                  <div className="flex justify-between"><span>Delivery</span><span>Rs. {selected.delivery_fee}</span></div>
                  <div className="flex justify-between text-base font-bold"><span>Total (COD)</span><span>Rs. {selected.total_amount}</span></div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => shareWhatsApp(selected)}>
                  <MessageCircle className="mr-2 h-4 w-4" /> 
                  {selected.type === "custom" ? "Share Details via WhatsApp" : "Share to Store WhatsApp"}
                </Button>

                {selected.status === "cancelled" && selected.cancellation_reason && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="flex items-center gap-2 text-xs font-bold text-destructive">
                      <AlertCircle className="h-3 w-3" /> Cancelled Reason
                    </p>
                    <p className="mt-1 text-xs">{selected.cancellation_reason} {selected.cancelled_by_admin && "(by Admin)"}</p>
                  </div>
                )}

                {(selected.status === "preparing" || selected.status === "picked_up") && selected.type === "standard" && (
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

                {selected.type === "standard" && NEXT_ACTIONS[selected.status as OrderStatus]?.map((a) => (
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

                {selected.type === "custom" && (
                  <p className="text-[10px] text-center text-muted-foreground italic bg-secondary/10 p-2 rounded-lg border">
                    Manage full workflow for custom orders in the "Inventory > Banners" section.
                  </p>
                )}
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
