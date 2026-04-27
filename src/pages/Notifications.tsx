import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Bell, Megaphone, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Broadcast {
  id: string;
  title: string;
  body: string;
  link: string | null;
  image_url: string | null;
  created_at: string;
}
interface OrderEvent { id: string; status: string; created_at: string; order_id: string; }

const Notifications = () => {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);

  useEffect(() => {
    supabase
      .from("broadcast_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setBroadcasts((data ?? []) as Broadcast[]));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("order_history")
      .select("id,status,created_at,order_id, orders!inner(customer_id)")
      .eq("orders.customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setOrderEvents((data ?? []) as any));
  }, [user]);

  const empty = broadcasts.length === 0 && orderEvents.length === 0;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      {empty && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        </Card>
      )}

      <div className="space-y-2">
        {broadcasts.map((n) => {
          const inner = (
            <Card className="flex gap-3 p-3">
              {n.image_url ? (
                <img src={n.image_url} alt={n.title} className="h-12 w-12 rounded object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-primary/10">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            </Card>
          );
          return n.link ? (
            n.link.startsWith("http") ? (
              <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer">{inner}</a>
            ) : (
              <Link key={n.id} to={n.link}>{inner}</Link>
            )
          ) : (
            <div key={n.id}>{inner}</div>
          );
        })}

        {orderEvents.map((it) => (
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
