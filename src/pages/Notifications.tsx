import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Bell, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Item { id: string; status: string; created_at: string; order_id: string; }

const Notifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("order_history")
      .select("id,status,created_at,order_id, orders!inner(customer_id)")
      .eq("orders.customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setItems((data ?? []) as any));
  }, [user]);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>
      {!user && <p className="text-sm text-muted-foreground">Sign in to see notifications.</p>}
      {user && items.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </Card>
      )}
      <div className="space-y-2">
        {items.map((it) => (
          <Link key={it.id} to={`/orders/${it.order_id}`}>
            <Card className="flex items-center gap-3 p-3">
              <Package className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Order {it.status.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
