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
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  items: any;
}

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id,short_id,status,total_amount,created_at,items")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data ?? []) as OrderRow[]);
        setLoading(false);
      });

    const channel = supabase
      .channel("orders-customer")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${user.id}` },
        (payload) => {
          setOrders((prev) => {
            if (payload.eventType === "INSERT") return [payload.new as OrderRow, ...prev];
            if (payload.eventType === "UPDATE") return prev.map((o) => (o.id === (payload.new as any).id ? (payload.new as OrderRow) : o));
            if (payload.eventType === "DELETE") return prev.filter((o) => o.id !== (payload.old as any).id);
            return prev;
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
        const itemCount = Array.isArray(o.items) ? o.items.reduce((s: number, i: any) => s + (i.qty ?? 0), 0) : 0;
        return (
          <Link key={o.id} to={`/orders/${o.id}`}>
            <Card className="flex items-center justify-between p-4 transition active:scale-[0.99]">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">{o.short_id}</p>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {itemCount} item{itemCount !== 1 ? "s" : ""} · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                </p>
              </div>
              <p className="text-sm font-bold">Rs. {o.total_amount}</p>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

export default Orders;
