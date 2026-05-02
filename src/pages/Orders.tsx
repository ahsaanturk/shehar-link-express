import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge, OrderStatus } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OrderRow {
  id: string;
  short_id: string;
  status: any;
  total_amount: number;
  created_at: string;
  items?: any;
  type: "standard" | "custom";
}

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const [{ data: std }, { data: cust }] = await Promise.all([
      supabase.from("orders").select("id,short_id,status,total_amount,created_at,items").eq("customer_id", user.id),
      supabase.from("custom_orders").select("id,short_id,status,delivery_fee,created_at").eq("customer_id", user.id),
    ]);

    const combined: OrderRow[] = [
      ...(std ?? []).map(o => ({ ...o, type: "standard" as const })),
      ...(cust ?? []).map(o => ({ ...o, type: "custom" as const, total_amount: o.delivery_fee ?? 0 })),
    ];

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setOrders(combined);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const chStd = supabase.channel("orders-std").on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${user?.id}` }, () => load()).subscribe();
    const chCust = supabase.channel("orders-cust").on("postgres_changes", { event: "*", schema: "public", table: "custom_orders", filter: `customer_id=eq.${user?.id}` }, () => load()).subscribe();
    return () => { supabase.removeChannel(chStd); supabase.removeChannel(chCust); };
  }, [user]);

  if (loading) return <div className="space-y-3 p-4">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <Package className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">No orders yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your orders will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <h1 className="text-xl font-bold">Your orders</h1>
      {orders.map((o) => {
        const isCustom = o.type === "custom";
        const itemCount = Array.isArray(o.items) ? o.items.reduce((s: number, i: any) => s + (i.qty ?? 0), 0) : 0;
        
        return (
          <Link key={o.id} to={isCustom ? "#" : `/orders/${o.id}`}>
            <Card className={`flex items-center justify-between p-4 transition active:scale-[0.99] ${isCustom ? "border-primary/20 bg-primary/5" : ""}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{o.short_id}</p>
                  {isCustom ? (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase">Custom Request</span>
                  ) : (
                    <StatusBadge status={o.status as any} />
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isCustom ? (
                    <span className="flex items-center gap-1 uppercase font-bold text-[10px]">
                      <span className={
                        o.status === "delivered" ? "text-green-600" : 
                        o.status === "rejected" ? "text-destructive" : 
                        "text-amber-600"
                      }>{o.status}</span> 
                      · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                    </span>
                  ) : (
                    <>{itemCount} item{itemCount !== 1 ? "s" : ""} · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}</>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">Rs. {o.total_amount || 0}</p>
                {isCustom && !o.total_amount && <p className="text-[10px] text-muted-foreground italic">Fee pending</p>}
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

export default Orders;
