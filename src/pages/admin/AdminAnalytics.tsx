import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Users, Store, DollarSign, TrendingUp, Star, ShoppingBag } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { formatDistanceToNow, format } from "date-fns";

interface DailyStat {
  day: string;
  order_count: number;
  revenue: number;
  delivered_count: number;
  cancelled_count: number;
}

interface TopStore {
  store_id: string;
  store_name: string;
  order_count: number;
  total_revenue: number;
}

interface KPIs {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalStores: number;
  totalProducts: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  avgRating: number;
  totalReviews: number;
}

const BAR_COLORS = [
  "hsl(160, 84%, 39%)", "hsl(160, 70%, 45%)", "hsl(160, 60%, 50%)",
  "hsl(160, 50%, 55%)", "hsl(160, 40%, 60%)", "hsl(160, 30%, 65%)",
  "hsl(160, 25%, 70%)", "hsl(160, 20%, 72%)", "hsl(160, 15%, 75%)", "hsl(160, 10%, 78%)",
];

const AdminAnalytics = () => {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [topStores, setTopStores] = useState<TopStore[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // KPIs from direct counts
      const [
        ordersRes, customersRes, storesRes, productsRes,
        pendingRes, deliveredRes, cancelledRes,
        reviewsRes,
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("stores").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
        supabase.from("reviews").select("rating"),
      ]);

      // Total revenue
      const { data: allOrders } = await supabase.from("orders").select("total_amount").eq("status", "delivered");
      const totalRevenue = (allOrders ?? []).reduce((s: number, o: any) => s + Number(o.total_amount), 0);

      // Reviews avg
      const reviews = (reviewsRes.data ?? []) as any[];
      const avgRating = reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

      setKpis({
        totalOrders: ordersRes.count ?? 0,
        totalRevenue,
        totalCustomers: customersRes.count ?? 0,
        totalStores: storesRes.count ?? 0,
        totalProducts: productsRes.count ?? 0,
        pendingOrders: pendingRes.count ?? 0,
        deliveredOrders: deliveredRes.count ?? 0,
        cancelledOrders: cancelledRes.count ?? 0,
        avgRating,
        totalReviews: reviews.length,
      });

      // Daily stats (from RPC)
      const { data: dailyData } = await supabase.rpc("admin_daily_stats", { _days: 30 });
      setDaily((dailyData ?? []) as DailyStat[]);

      // Top stores
      const { data: topData } = await supabase.rpc("admin_top_stores", { _limit: 8 });
      setTopStores((topData ?? []) as TopStore[]);

      // Recent orders
      const { data: recent } = await supabase.from("orders")
        .select("id,short_id,status,total_amount,customer_name,created_at")
        .order("created_at", { ascending: false }).limit(5);
      setRecentOrders(recent ?? []);

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-xl font-bold">Analytics</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const k = kpis!;
  const chartData = daily.map((d) => ({
    ...d,
    dayLabel: format(new Date(d.day), "MMM d"),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 pb-8">
      <div className="flex items-center gap-2">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold">Analytics Dashboard</h1>
          <p className="text-xs text-muted-foreground">Last 30 days overview</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard icon={<DollarSign />} label="Total Revenue" value={`Rs. ${k.totalRevenue.toLocaleString()}`} color="text-emerald-500" />
        <KPICard icon={<Package />} label="Total Orders" value={k.totalOrders.toString()} color="text-blue-500" />
        <KPICard icon={<Users />} label="Customers" value={k.totalCustomers.toString()} color="text-violet-500" />
        <KPICard icon={<Store />} label="Stores" value={k.totalStores.toString()} color="text-orange-500" />
        <KPICard icon={<ShoppingBag />} label="Products" value={k.totalProducts.toString()} color="text-pink-500" />
        <KPICard icon={<Star />} label="Avg Rating" value={k.avgRating > 0 ? `${k.avgRating} ★ (${k.totalReviews})` : "No reviews"} color="text-yellow-500" />
      </div>

      {/* Order Status Breakdown */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-bold">Order Status Breakdown</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatusPill label="Pending" count={k.pendingOrders} className="bg-yellow-500/10 text-yellow-600" />
          <StatusPill label="Delivered" count={k.deliveredOrders} className="bg-emerald-500/10 text-emerald-600" />
          <StatusPill label="Cancelled" count={k.cancelledOrders} className="bg-red-500/10 text-red-600" />
        </div>
      </Card>

      {/* Revenue Chart */}
      <Card className="p-4">
        <h2 className="mb-1 text-sm font-bold">Revenue Trend</h2>
        <p className="mb-3 text-[10px] text-muted-foreground">Daily revenue over the past 30 days</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="dayLabel" tick={{ fontSize: 9 }} className="text-muted-foreground" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(160, 84%, 39%)" fill="url(#revenueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Orders Chart */}
      <Card className="p-4">
        <h2 className="mb-1 text-sm font-bold">Daily Orders</h2>
        <p className="mb-3 text-[10px] text-muted-foreground">Orders placed per day</p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220, 90%, 56%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(220, 90%, 56%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="dayLabel" tick={{ fontSize: 9 }} className="text-muted-foreground" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9 }} className="text-muted-foreground" allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                formatter={(value: number) => [value, "Orders"]}
              />
              <Area type="monotone" dataKey="order_count" stroke="hsl(220, 90%, 56%)" fill="url(#orderGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top Stores */}
      {topStores.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-1 text-sm font-bold">Top Stores by Revenue</h2>
          <p className="mb-3 text-[10px] text-muted-foreground">Delivered order revenue</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topStores.filter(s => s.total_revenue > 0)} layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9 }} className="text-muted-foreground" />
                <YAxis type="category" dataKey="store_name" tick={{ fontSize: 10 }} width={90} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="total_revenue" radius={[0, 6, 6, 0]}>
                  {topStores.filter(s => s.total_revenue > 0).map((_, idx) => (
                    <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Recent Orders */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs font-semibold text-primary">View all ›</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentOrders.map((o: any) => (
              <li key={o.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-semibold">{o.short_id}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {o.customer_name} · {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">Rs. {o.total_amount}</p>
                  <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    o.status === "delivered" ? "bg-emerald-500/10 text-emerald-600"
                    : o.status === "cancelled" ? "bg-red-500/10 text-red-600"
                    : o.status === "pending" ? "bg-yellow-500/10 text-yellow-600"
                    : "bg-blue-500/10 text-blue-600"
                  }`}>{o.status.replace("_", " ")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

const KPICard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <Card className="flex items-center gap-3 p-3.5">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary ${color}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-extrabold">{value}</p>
    </div>
  </Card>
);

const StatusPill = ({ label, count, className }: { label: string; count: number; className: string }) => (
  <div className={`flex flex-col items-center rounded-xl px-3 py-2.5 ${className}`}>
    <span className="text-lg font-extrabold">{count}</span>
    <span className="text-[10px] font-semibold">{label}</span>
  </div>
);

export default AdminAnalytics;
