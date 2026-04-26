import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, IndianRupee, Package, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Store = Database["public"]["Tables"]["stores"]["Row"];

const todayISO = () => new Date().toISOString().slice(0, 10);

const AdminSettlements = () => {
  const [date, setDate] = useState<string>(todayISO());
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    const [o, s] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("status", "delivered")
        .gte("updated_at", start.toISOString())
        .lte("updated_at", end.toISOString())
        .order("updated_at", { ascending: false }),
      supabase.from("stores").select("*"),
    ]);
    if (o.error) toast.error(o.error.message);
    if (s.error) toast.error(s.error.message);
    setOrders(o.data ?? []);
    setStores(s.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const storeMap = useMemo(() => Object.fromEntries(stores.map((s) => [s.id, s])), [stores]);

  const totals = useMemo(() => {
    let revenue = 0;
    let delivery = 0;
    const byStore = new Map<string, { count: number; subtotal: number; delivery: number; total: number }>();
    for (const o of orders) {
      revenue += Number(o.total_amount);
      delivery += Number(o.delivery_fee);
      const key = o.store_id;
      const cur = byStore.get(key) ?? { count: 0, subtotal: 0, delivery: 0, total: 0 };
      cur.count += 1;
      cur.subtotal += Number(o.subtotal);
      cur.delivery += Number(o.delivery_fee);
      cur.total += Number(o.total_amount);
      byStore.set(key, cur);
    }
    return { revenue, delivery, count: orders.length, byStore };
  }, [orders]);

  const exportCSV = () => {
    const rows = [
      ["Order ID", "Store", "Customer", "Phone", "Subtotal", "Delivery", "Total", "Delivered At"],
      ...orders.map((o) => [
        o.short_id,
        storeMap[o.store_id]?.name ?? "—",
        o.customer_name,
        o.customer_phone,
        Number(o.subtotal).toFixed(2),
        Number(o.delivery_fee).toFixed(2),
        Number(o.total_amount).toFixed(2),
        new Date(o.updated_at).toLocaleString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settlement-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Settlements</h1>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-3">
        <div className="flex-1 min-w-[140px]">
          <Label htmlFor="date" className="text-xs">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={orders.length === 0}>
          <Download className="h-4 w-4" /> CSV
        </Button>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<Package className="h-4 w-4" />} label="Orders" value={String(totals.count)} />
        <StatCard icon={<IndianRupee className="h-4 w-4" />} label="COD Total" value={`₹${totals.revenue.toFixed(0)}`} />
        <StatCard icon={<IndianRupee className="h-4 w-4" />} label="Delivery" value={`₹${totals.delivery.toFixed(0)}`} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">By store</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : totals.byStore.size === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No delivered orders on this date.</Card>
        ) : (
          <div className="space-y-2">
            {Array.from(totals.byStore.entries()).map(([storeId, agg]) => (
              <Card key={storeId} className="flex items-center gap-3 p-3">
                <div className="rounded-md bg-muted p-2 text-muted-foreground">
                  <StoreIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{storeMap[storeId]?.name ?? "Unknown store"}</p>
                  <p className="text-xs text-muted-foreground">
                    {agg.count} orders · ₹{agg.subtotal.toFixed(0)} subtotal + ₹{agg.delivery.toFixed(0)} delivery
                  </p>
                </div>
                <p className="font-semibold">₹{agg.total.toFixed(0)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Orders</h2>
        {orders.length === 0 ? null : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Card key={o.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{o.short_id}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {storeMap[o.store_id]?.name ?? "—"} · {o.customer_name}
                  </p>
                </div>
                <p className="font-semibold">₹{Number(o.total_amount).toFixed(0)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Card className="p-3">
    <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon} {label}</div>
    <p className="mt-1 text-lg font-bold">{value}</p>
  </Card>
);

export default AdminSettlements;
