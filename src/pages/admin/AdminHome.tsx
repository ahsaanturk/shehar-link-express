import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Package, Store, ShoppingBag, Users, Bell, Crown, 
  MapPin, LayoutGrid, Truck, BarChart3, MessageSquare, Landmark, TrendingUp 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { OtpUrgentBanner } from "@/components/admin/OtpUrgentBanner";

const AdminHome = () => {
  const { isSuperAdmin } = useAuth();
  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 pb-12">
      <div className="flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon" className="h-8 w-8 p-0"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <img src="/logo.png" alt="SheharLink Logo" className="h-8 w-8 object-contain rounded-md" />
        <h1 className="text-xl font-bold tracking-tight">Admin Portal</h1>
      </div>

      <OtpUrgentBanner />

      <div className="grid grid-cols-2 gap-4">
        {/* Core Operations */}
        <div className="col-span-2">
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1 mb-2">Operations</h2>
        </div>
        <AdminTile to="/admin/orders" icon={<ShoppingBag />} label="Live Orders" />
        <AdminTile to="/admin/inventory" icon={<Package />} label="Inventory" />
        
        {/* Finance & Growth */}
        <div className="col-span-2 mt-4">
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1 mb-2">Business</h2>
        </div>
        <AdminTile to="/admin/business" icon={<TrendingUp />} label="Dashboard" />
        <AdminTile to="/admin/stores" icon={<Store />} label="Stores" />

        {/* Setup & Logistics */}
        <div className="col-span-2 mt-4">
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1 mb-2">Logistics</h2>
        </div>
        <AdminTile to="/admin/logistics" icon={<MapPin />} label="Setup Areas" />
        <AdminTile to="/admin/notifications" icon={<Bell />} label="Alerts" />

        {/* Community & Reviews */}
        <div className="col-span-2 mt-4">
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1 mb-2">Feedback</h2>
        </div>
        <AdminTile to="/admin/reviews" icon={<MessageSquare />} label="Reviews" />
        <AdminTile to="/admin/users" icon={<Users />} label="Customers" />

        {/* System (Super Admin) */}
        {isSuperAdmin && (
          <>
            <div className="col-span-2 mt-4">
              <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1 mb-2">Management</h2>
            </div>
            <AdminTile to="/admin/roles" icon={<Crown />} label="Team Roles" />
          </>
        )}
      </div>
    </div>
  );
};

const AdminTile = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link to={to}>
    <Card className="flex flex-col items-center justify-center gap-2 p-5 transition hover:border-primary active:scale-95">
      <div className="text-primary">{icon}</div>
      <p className="text-[11px] font-bold uppercase tracking-tight text-center">{label}</p>
    </Card>
  </Link>
);

export default AdminHome;
