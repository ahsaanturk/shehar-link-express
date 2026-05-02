import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Package, Users, Store, DollarSign, TrendingUp, Star, ShoppingBag, 
  Download, PieChart, Landmark 
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

// --- Types ---
interface DailyStat { day: string; order_count: number; revenue: number; }
interface TopStore { store_id: string; store_name: string; order_count: number; total_revenue: number; }
interface KPIs {
  totalOrders: number; totalRevenue: number; totalCustomers: number;
  totalStores: number; totalProducts: number; avgRating: number;
}
interface SettlementOrder {
  id: string; short_id: string; total_amount: number; subtotal: number; 
  delivery_fee: number; store_id: string; customer_name: string;
  customer_phone: string; updated_at: string;
}

const BAR_COLORS = ["hsl(160, 84%, 39%)", "hsl(160, 70%, 45%)", "hsl(160, 60%, 50%)", "hsl(160, 50%, 55%)"];
const todayISO = () => new Date().toISOString().slice(0, 10);

const AdminBusiness = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [topStores, setTopStores] = useState<TopStore[]>([]);
  
  // Settlement state
  const [settleDate, setSettleDate] = useState<string>(todayISO());
  const [settleOrders, setSettleOrders] = useState<SettlementOrder[]>([]);
  const [allStores, setAllStores] = useState<any[]>([]);
  const [settleLoading, setSettleLoading] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    const [ordersRes, customersRes, storesRes, productsRes, reviewsRes] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("stores").select("id, name"),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("reviews").select("rating"),
    ]);

    const { data: allOrders } = await supabase.from("orders").select("total_amount").eq("status", "delivered");
    const totalRevenue = (allOrders ?? []).reduce((s, o) => s + Number(o.total_amount), 0);
    const reviews = (reviewsRes.data ?? []) as any[];
    const avgRating = reviews.length > 0 ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;

    setKpis({
      totalOrders: ordersRes.count ?? 0,
      totalRevenue,
      totalCustomers: customersRes.count ?? 0,
      totalStores: (storesRes.data ?? []).length,
      totalProducts: productsRes.count ?? 0,
      avgRating,
    });
    setAllStores(storesRes.data ?? []);

    const { data: dailyData } = await supabase.rpc("admin_daily_stats", { _days: 30 });
    setDaily((dailyData ?? []) as DailyStat[]);

    const { data: topData } = await supabase.rpc("admin_top_stores", { _limit: 5 });
    setTopStores((topData ?? []) as TopStore[]);
    setLoading(false);
  };

  const loadSettlements = async () => {
    setSettleLoading(true);
    const start = new Date(`${settleDate}T00:00:00`).toISOString();
    const end = new Date(`${settleDate}T23:59:59.999`).toISOString();
    const { data, error } = await supabase.from("orders")
      .select("id,short_id,total_amount,subtotal,delivery_fee,store_id,customer_name,customer_phone,updated_at")
      .eq("status", "delivered").gte("updated_at", start).lte("updated_at", end);
    if (error) toast.error(error.message);
    setSettleOrders((data ?? []) as SettlementOrder[]);
    setSettleLoading(false);
  };

  useEffect(() => { loadOverview(); }, []);
  useEffect(() => { loadSettlements(); }, [settleDate]);

  const storeMap = useMemo(() => Object.fromEntries(allStores.map(s => [s.id, s.name])), [allStores]);
  
  const settleTotals = useMemo(() => {
    let revenue = 0; let delivery = 0;
    const byStore = new Map<string, { count: number; subtotal: number; delivery: number; total: number }>();
    settleOrders.forEach(o => {
      revenue += Number(o.total_amount);
      delivery += Number(o.delivery_fee);
      const cur = byStore.get(o.store_id) ?? { count: 0, subtotal: 0, delivery: 0, total: 0 };
      cur.count++; cur.subtotal += Number(o.subtotal); cur.delivery += Number(o.delivery_fee); cur.total += Number(o.total_amount);
      byStore.set(o.store_id, cur);
    });
    return { revenue, delivery, count: settleOrders.length, byStore };
  }, [settleOrders]);

  const exportCSV = () => {
    const rows = [
      ["Order ID", "Store", "Customer", "Subtotal", "Delivery", "Total", "Time"],
      ...settleOrders.map(o => [o.short_id, storeMap[o.store_id] || "—", o.customer_name, o.subtotal, o.delivery_fee, o.total_amount, new Date(o.updated_at).toLocaleTimeString()])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `settlement-${settleDate}.csv`; a.click();
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Loading business data...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pb-12">
      <div className="flex items-center gap-2">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-xl font-bold">Business Dashboard</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
          <TabsTrigger value="overview" className="flex items-center gap-2"><PieChart className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="settlements" className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Settlements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KPI icon={<DollarSign />} label="Total Revenue" value={`Rs. ${kpis?.totalRevenue.toLocaleString()}`} color="text-emerald-500" />
            <KPI icon={<Package />} label="Total Orders" value={kpis?.totalOrders.toString() || "0"} color="text-blue-500" />
            <KPI icon={<Store />} label="Total Stores" value={kpis?.totalStores.toString() || "0"} color="text-orange-500" />
          </div>

          <Card className="p-4">
            <h2 className="text-sm font-bold mb-3">Revenue Trend (30 Days)</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" hide />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => `Rs. ${v}`} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(160, 84%, 39%)" fill="url(#revGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h2 className="text-sm font-bold mb-3">Top Stores by Revenue</h2>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topStores} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="store_name" width={80} tick={{ fontSize: 10 }} />
                    <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]}>
                      {topStores.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="text-sm font-bold mb-3 flex items-center justify-between">
                Platform Health
                <span className="text-[10px] font-normal text-muted-foreground uppercase">Lifetime</span>
              </h2>
              <div className="space-y-4">
                <HealthItem label="Avg. Order Value" value={`Rs. ${Math.round(kpis!.totalRevenue / (kpis!.totalOrders || 1))}`} />
                <HealthItem label="Customer Satisfaction" value={`${kpis!.avgRating} / 5.0`} />
                <HealthItem label="Stores Network" value={`${kpis!.totalStores} Stores`} />
                <HealthItem label="Inventory Size" value={`${kpis!.totalProducts} Products`} />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settlements" className="space-y-4 pt-4">
          <Card className="p-3 flex items-end gap-3 flex-wrap bg-muted/20">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Settlement Date</Label>
              <Input type="date" value={settleDate} onChange={e => setSettleDate(e.target.value)} max={todayISO()} className="h-9 mt-1" />
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={settleOrders.length === 0}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          </Card>

          <div className="grid grid-cols-3 gap-2">
            <StatSmall label="Delivered" value={settleTotals.count} />
            <StatSmall label="Sales" value={`Rs. ${settleTotals.revenue}`} />
            <StatSmall label="Delivery" value={`Rs. ${settleTotals.delivery}`} />
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Store Wise Breakdown</h3>
            {settleLoading ? <p className="text-sm p-8 text-center animate-pulse">Calculating store totals...</p> : 
              settleTotals.byStore.size === 0 ? <p className="text-sm p-8 text-center text-muted-foreground border rounded-xl border-dashed">No sales records found for this date.</p> :
              Array.from(settleTotals.byStore.entries()).map(([sid, agg]) => (
                <Card key={sid} className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary"><Store className="h-5 w-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{storeMap[sid] || "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground">{agg.count} orders · Rs. {agg.subtotal} goods + Rs. {agg.delivery} delivery</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">Rs. {agg.total}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">To Collect</p>
                  </div>
                </Card>
              ))
            }
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const KPI = ({ icon, label, value, color }: any) => (
  <Card className="p-3.5 flex items-center gap-3">
    <div className={`h-9 w-9 rounded-xl bg-secondary flex items-center justify-center ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-muted-foreground leading-none mb-1">{label}</p>
      <p className="text-sm font-extrabold truncate">{value}</p>
    </div>
  </Card>
);

const StatSmall = ({ label, value }: any) => (
  <Card className="p-3 text-center bg-secondary/30 border-none shadow-none">
    <p className="text-[10px] text-muted-foreground font-bold uppercase">{label}</p>
    <p className="text-lg font-black">{value}</p>
  </Card>
);

const HealthItem = ({ label, value }: any) => (
  <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

export default AdminBusiness;
