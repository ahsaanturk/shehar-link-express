import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from "@/components/ui/drawer";
import { Phone, MapPin, MessageCircle, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface CustomOrder {
  id: string;
  short_id: string;
  store_name: string;
  description: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: "pending" | "accepted" | "rejected";
  delivery_fee: number | null;
  admin_notes: string | null;
  created_at: string;
}

type StatusFilter = "all" | "pending" | "accepted" | "rejected";

const AdminCustomOrders = ({ embedded = false }: { embedded?: boolean }) => {
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [selected, setSelected] = useState<CustomOrder | null>(null);
  const [fee, setFee] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("custom_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setOrders((data ?? []) as CustomOrder[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-custom-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_orders" }, payload => {
        if (payload.eventType === "INSERT") {
          toast.success(`New custom order ${(payload.new as CustomOrder).short_id}`);
          setOrders(prev => [payload.new as CustomOrder, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as CustomOrder;
          setSelected(sel => sel?.id === updated.id ? updated : sel);
          setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const visible = useMemo(
    () => filter === "all" ? orders : orders.filter(o => o.status === filter),
    [orders, filter]
  );

  const openOrder = (o: CustomOrder) => {
    setSelected(o);
    setFee(o.delivery_fee ? String(o.delivery_fee) : "");
    setAdminNotes(o.admin_notes ?? "");
  };

  const updateOrder = async (status: "accepted" | "rejected") => {
    if (!selected) return;
    if (status === "accepted" && (!fee || isNaN(Number(fee)))) {
      return toast.error("Please enter a delivery fee amount");
    }
    setUpdating(true);
    const { error } = await supabase.from("custom_orders")
      .update({
        status,
        delivery_fee: status === "accepted" ? Number(fee) : null,
        admin_notes: adminNotes.trim() || null,
      })
      .eq("id", selected.id);
    setUpdating(false);
    if (error) return toast.error(error.message);
    toast.success(`Order ${status}`);
  };

  const shareWhatsApp = (o: CustomOrder) => {
    const text = encodeURIComponent(
      `*SheharLink Custom Request ${o.short_id}*\n` +
      `Store: ${o.store_name}\n` +
      `Customer: ${o.customer_name}\n` +
      `Phone: ${o.customer_phone}\n` +
      `Address: ${o.customer_address}\n\n` +
      `Request:\n${o.description}` +
      (o.delivery_fee ? `\n\nDelivery Fee: Rs. ${o.delivery_fee}` : "")
    );
    window.open(`https://wa.me/92${o.customer_phone.replace(/^0/, "")}?text=${text}`, "_blank");
  };

  const statusBadge = (s: CustomOrder["status"]) => {
    const map = {
      pending: "bg-yellow-500/15 text-yellow-700",
      accepted: "bg-green-500/15 text-green-700",
      rejected: "bg-destructive/10 text-destructive",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${map[s]}`}>
        {s.charAt(0).toUpperCase() + s.slice(1)}
      </span>
    );
  };

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-2xl space-y-4 p-4"}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Custom Orders</h2>
        <span className="text-xs text-muted-foreground">{orders.filter(o => o.status === "pending").length} pending</span>
      </div>

      <Tabs value={filter} onValueChange={v => setFilter(v as StatusFilter)}>
        <TabsList className="grid w-full grid-cols-4">
          {(["all", "pending", "accepted", "rejected"] as StatusFilter[]).map(f => (
            <TabsTrigger key={f} value={f} className="text-xs capitalize">{f}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No custom orders in this view.</Card>
      ) : (
        <div className="space-y-2">
          {visible.map(o => (
            <Card key={o.id} className="cursor-pointer p-3.5 transition active:scale-[0.99]" onClick={() => openOrder(o)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">{o.short_id}</p>
                    {statusBadge(o.status)}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{o.customer_name} · {o.store_name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs">{o.description}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                  </p>
                  {o.delivery_fee && <p className="text-xs font-bold text-primary">Rs. {o.delivery_fee}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DrawerContent>
          {selected && (
            <div className="mx-auto w-full max-w-md pb-4">
              <DrawerHeader>
                <DrawerTitle className="flex items-center justify-between">
                  <span>{selected.short_id}</span>
                  {statusBadge(selected.status)}
                </DrawerTitle>
                <DrawerDescription>{selected.store_name}</DrawerDescription>
              </DrawerHeader>
              <div className="space-y-3 px-4 text-sm">
                <div>
                  <p className="font-semibold">{selected.customer_name}</p>
                  <a href={`tel:${selected.customer_phone}`} className="mt-0.5 flex items-center gap-2 text-primary">
                    <Phone className="h-3 w-3" /> {selected.customer_phone}
                  </a>
                  <p className="mt-1 flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {selected.customer_address}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Customer Request</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
                </div>

                <Button variant="outline" className="w-full" onClick={() => shareWhatsApp(selected)}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Share via WhatsApp
                </Button>

                {selected.status === "pending" && (
                  <div className="space-y-3 rounded-xl border border-border p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Admin Decision</p>
                    <div>
                      <Label htmlFor="co-fee">Delivery Fee (Rs.) — required to accept</Label>
                      <Input id="co-fee" type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="e.g. 100" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="co-notes">Notes to Customer (optional)</Label>
                      <Textarea id="co-notes" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} placeholder="e.g. Ready in 30 mins" className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => updateOrder("accepted")} disabled={updating} className="gap-1">
                        {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Accept
                      </Button>
                      <Button variant="destructive" onClick={() => updateOrder("rejected")} disabled={updating} className="gap-1">
                        {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Reject
                      </Button>
                    </div>
                  </div>
                )}

                {selected.status !== "pending" && selected.admin_notes && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Admin Notes</p>
                    <p className="text-sm">{selected.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default AdminCustomOrders;
