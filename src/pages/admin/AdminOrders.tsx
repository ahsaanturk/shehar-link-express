import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge, OrderStatus } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Phone, MessageCircle, Loader2, Truck, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface AdminOrder {
  id: string;
  short_id: string;
  status: any;
  items?: any;
  subtotal?: number;
  delivery_fee: number;
  items_cost?: number;
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  notes?: string | null;
  description?: string;
  created_at: string;
  store_id?: string | null;
  store_name?: string | null;
  cancellation_reason?: string | null;
  cancelled_by_admin?: boolean;
  type: "standard" | "custom";
  rider_id?: string | null;
}

interface Rider { id: string; name: string; phone: string; }

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

const AdminOrders = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [updating, setUpdating] = useState(false);
  
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [deliverConfirmOpen, setDeliverOpen] = useState(false);
  const [itemsCostInput, setItemsCostInput] = useState("");
  const [customFeeInput, setCustomFeeInput] = useState("");
  const [customNotesInput, setCustomNotesInput] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState<string>("none");

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
        total_amount: (o.items_cost ?? 0) + (o.delivery_fee ?? 0),
        subtotal: o.items_cost ?? 0,
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

    const { data: rRoles } = await supabase.from("user_roles").select("user_id").eq("role", "rider");
    const uids = (rRoles ?? []).map(r => r.user_id);
    if (uids.length > 0) {
      const { data: pData } = await supabase.from("profiles").select("id,name,phone").in("id", uids);
      setRiders((pData ?? []) as Rider[]);
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
    
    if (next === "delivered" && selected.type === "custom" && !deliverConfirmOpen) {
      setItemsCostInput(selected.items_cost ? String(selected.items_cost) : "");
      setDeliverOpen(true);
      return;
    }

    if (next === "forwarded" && selectedRiderId === "none") {
      return toast.error("Please select a rider first");
    }

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
    if (next === "delivered" && selected.type === "custom") {
      update.items_cost = Number(itemsCostInput);
    }
    if (next === "forwarded") {
      update.rider_id = selectedRiderId;
    }

    const table = selected.type === "custom" ? "custom_orders" : "orders";
    const { error } = await supabase.from(table).update(update).eq("id", selected.id);
    
    setUpdating(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Marked ${next}`);
      setCancelOpen(false);
      setCancelReason("");
      setOrders(prev => prev.map(o => o.id === selected.id ? { ...o, status: next, rider_id: (next === "forwarded" ? selectedRiderId : o.rider_id) } : o));
      setSelected(prev => prev ? { ...prev, status: next, rider_id: (next === "forwarded" ? selectedRiderId : prev.rider_id) } : null);
    }
  };

  const shareWhatsApp = (o: AdminOrder) => {
    const store = o.type === "custom" ? o.store_name : (storeNames[o.store_id!] ?? "SheharLink");
    let text = `*SheharLink Order ${o.short_id}*\nStore: ${store}\nCustomer: ${o.customer_name}\n*Total: Rs. ${o.total_amount}*`;
    window.open(`https://wa.me/92${o.customer_phone.replace(/^0/, "")}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareWithRider = (o: AdminOrder) => {
    if (!o.rider_id) return;
    const rider = riders.find(r => r.id === o.rider_id);
    if (!rider) return;
    const store = o.type === "custom" ? o.store_name : (storeNames[o.store_id!] ?? "SheharLink");
    const text = `*New Task*\nID: ${o.short_id}\nStore: ${store}\nCustomer: ${o.customer_name}\nAddress: ${o.customer_address}\nFee: Rs. ${o.delivery_fee}`;
    window.open(`https://wa.me/92${rider.phone.replace(/^0/, "")}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-xl font-bold">Live orders</h1>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="no-scrollbar h-auto w-full justify-start gap-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value} className="text-xs">{f.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No orders in this view.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((o) => (
            <Card key={o.id} className={`cursor-pointer p-4 transition active:scale-[0.99] ${o.type === "custom" ? "border-primary/20 bg-primary/5" : ""}`} onClick={() => {
              setSelected(o);
              setSelectedRiderId(o.rider_id ?? "none");
              if (o.type === "custom" && o.status === "pending") {
                setCustomFeeInput(o.delivery_fee ? String(o.delivery_fee) : "");
                setCustomNotesInput(o.notes ?? "");
              }
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{o.short_id}</p>
                    {o.type === "standard" ? <StatusBadge status={o.status} /> : (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${o.status === "delivered" ? "bg-green-500/15 text-green-700" : o.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-500/15 text-amber-700"}`}>
                        {String(o.status).toUpperCase()}
                      </span>
                    )}
                    {o.type === "custom" && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary uppercase">Custom</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{o.customer_name} · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{o.type === "custom" ? o.store_name : (storeNames[o.store_id!] ?? "—")}</p>
                </div>
                <p className="text-sm font-bold">Rs. {o.total_amount}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DrawerContent className="max-h-[90vh]">
          {selected && (
            <div className="mx-auto w-full max-w-md overflow-y-auto p-4">
              <DrawerHeader className="px-0">
                <DrawerTitle className="flex items-center justify-between">
                  <span>{selected.short_id}</span>
                  {selected.type === "standard" ? <StatusBadge status={selected.status} /> : (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selected.status === "delivered" ? "bg-green-500/15 text-green-700" : "bg-amber-500/15 text-amber-700"}`}>
                      {String(selected.status).toUpperCase()}
                    </span>
                  )}
                </DrawerTitle>
              </DrawerHeader>

              <div className="space-y-4 text-sm pb-8">
                <div>
                  <p className="font-bold">{selected.customer_name}</p>
                  <a href={`tel:${selected.customer_phone}`} className="mt-1 flex items-center gap-2 text-primary font-medium">
                    <Phone className="h-3 w-3" /> {selected.customer_phone}
                  </a>
                  <p className="mt-1 flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {selected.customer_address}
                  </p>
                </div>

                {selected.type === "custom" ? (
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Customer Request</p>
                    <p className="italic">"{selected.description}"</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    {(selected.items as any[]).map((i, idx) => (
                      <div key={idx} className="flex justify-between p-2.5 border-b border-border last:border-0">
                        <span>{i.qty} × {i.name}</span>
                        <span className="text-muted-foreground">Rs. {i.price * i.qty}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1 rounded-lg bg-muted p-3 text-xs">
                  <div className="flex justify-between"><span>{selected.type === "standard" ? "Subtotal" : "Items Cost"}</span><span>Rs. {selected.type === "standard" ? selected.subtotal : (selected.items_cost ?? 0)}</span></div>
                  <div className="flex justify-between"><span>Delivery</span><span>Rs. {selected.delivery_fee}</span></div>
                  <div className="flex justify-between text-base font-bold border-t border-border/50 pt-1 mt-1"><span>Total</span><span>Rs. {selected.total_amount}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => shareWhatsApp(selected)}><MessageCircle className="mr-1.5 h-4 w-4" /> Customer</Button>
                  {selected.rider_id && <Button variant="outline" size="sm" className="border-purple-200 text-purple-700" onClick={() => shareWithRider(selected)}><Truck className="mr-1.5 h-4 w-4" /> Rider</Button>}
                </div>

                {selected.type === "custom" && selected.status === "pending" && (
                  <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-[10px] font-bold uppercase text-primary">Admin Decision</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px]">Delivery Fee</Label><Input type="number" value={customFeeInput} onChange={e => setCustomFeeInput(e.target.value)} className="h-8" /></div>
                      <div><Label className="text-[10px]">Notes</Label><Input value={customNotesInput} onChange={e => setCustomNotesInput(e.target.value)} className="h-8" /></div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm" disabled={updating} onClick={async () => {
                        if (!customFeeInput) return toast.error("Enter fee");
                        setUpdating(true);
                        await supabase.from("custom_orders").update({ status: "accepted", delivery_fee: Number(customFeeInput), admin_notes: customNotesInput || null }).eq("id", selected.id);
                        setUpdating(false); toast.success("Accepted"); load(); setSelected(null);
                      }}>Accept</Button>
                      <Button variant="destructive" size="sm" disabled={updating} onClick={() => updateStatus("rejected")}>Reject</Button>
                    </div>
                  </div>
                )}

                {selected.type === "custom" && (selected.status === "accepted" || selected.status === "forwarded" || selected.status === "picked_up") && (
                  <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> Rider Assignment</p>
                    <select value={selectedRiderId} onChange={e => setSelectedRiderId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                      <option value="none">-- Select Rider --</option>
                      {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <Button className="w-full bg-purple-600" size="sm" disabled={updating || selectedRiderId === "none"} onClick={() => updateStatus("forwarded")}>Forward to Rider</Button>
                    {(selected.status === "forwarded" || selected.status === "picked_up") && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" disabled={updating || selected.status === "picked_up"} onClick={() => updateStatus("picked_up")}>{selected.status === "picked_up" ? "Picked Up ✓" : "Mark Picked Up"}</Button>
                        <Button className="bg-green-600" size="sm" disabled={updating} onClick={() => updateStatus("delivered")}>Mark Delivered</Button>
                      </div>
                    )}
                  </div>
                )}

                {selected.type === "standard" && NEXT_ACTIONS[selected.status as OrderStatus]?.map((a) => (
                  <Button key={a.next} variant={a.next === "cancelled" ? "destructive" : "default"} className="w-full" disabled={updating} onClick={() => updateStatus(a.next)}>{updating ? <Loader2 className="h-4 w-4 animate-spin" /> : a.label}</Button>
                ))}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Dialog open={deliverConfirmOpen} onOpenChange={setDeliverOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Finalize Delivery</DialogTitle><DialogDescription>Enter the items cost paid at the store.</DialogDescription></DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Items Cost (Rs.)</Label>
            <Input type="number" value={itemsCostInput} onChange={(e) => setItemsCostInput(e.target.value)} />
            {selected && <p className="text-xs font-bold text-primary">Total Collection: Rs. {Number(itemsCostInput || 0) + (selected.delivery_fee || 0)}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeliverOpen(false)}>Back</Button>
            <Button className="bg-green-600" onClick={() => { setDeliverOpen(false); updateStatus("delivered"); }} disabled={updating || !itemsCostInput}>Confirm Delivered</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Order</DialogTitle></DialogHeader>
          <Input placeholder="Reason..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="my-4" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button variant="destructive" onClick={() => updateStatus("cancelled", cancelReason)} disabled={updating || !cancelReason.trim()}>Confirm Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
