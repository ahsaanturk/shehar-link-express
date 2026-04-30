import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Store, ShoppingBag, Receipt, Users, Bell, Crown, MapPin, LayoutGrid, Truck, BarChart3, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { OtpUrgentBanner } from "@/components/admin/OtpUrgentBanner";

const AdminHome = () => {
  const { isSuperAdmin } = useAuth();
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon" className="h-8 w-8 p-0"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <img src="/logo.png" alt="SheharLink Logo" className="h-8 w-8 object-contain rounded-md" />
        <h1 className="text-xl font-bold">Admin Portal</h1>
      </div>

      <OtpUrgentBanner />

      <div className="grid grid-cols-2 gap-3">
        <AdminTile to="/admin/orders" icon={<Package />} label="Orders" />
        <AdminTile to="/admin/users" icon={<Users />} label="Users" />
        <AdminTile to="/admin/inventory" icon={<LayoutGrid />} label="Inventory" />
        <AdminTile to="/admin/areas" icon={<MapPin />} label="Areas" />
        <AdminTile to="/admin/delivery-tiers" icon={<Truck />} label="Delivery Tiers" />
        <AdminTile to="/admin/settlements" icon={<Receipt />} label="Settlements" />
        <AdminTile to="/admin/notifications" icon={<Bell />} label="Notifications" />
        <AdminTile to="/admin/analytics" icon={<BarChart3 />} label="Analytics" />
        <AdminTile to="/admin/reviews" icon={<MessageSquare />} label="Reviews" />
        {isSuperAdmin && <AdminTile to="/admin/roles" icon={<Crown />} label="Roles" />}
      </div>
    </div>
  );
};

const AdminTile = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link to={to}>
    <Card className="flex aspect-square flex-col items-center justify-center gap-2 p-4 transition hover:border-primary">
      <div className="text-primary">{icon}</div>
      <p className="text-sm font-medium">{label}</p>
    </Card>
  </Link>
);

export default AdminHome;
