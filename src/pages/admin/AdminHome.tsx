import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Store, ShoppingBag, Receipt, Users, Bell } from "lucide-react";

const AdminHome = () => {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-xl font-bold">Admin Portal</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <AdminTile to="/admin/orders" icon={<Package />} label="Orders" />
        <AdminTile to="/admin/users" icon={<Users />} label="Users" />
        <AdminTile to="/admin/stores" icon={<Store />} label="Stores" />
        <AdminTile to="/admin/products" icon={<ShoppingBag />} label="Products" />
        <AdminTile to="/admin/settlements" icon={<Receipt />} label="Settlements" />
        <AdminTile to="/admin/notifications" icon={<Bell />} label="Notifications" />
      </div>

      <Card className="p-4 text-sm text-muted-foreground">
        Coming in next steps: live order feed, status management, store/product CRUD, and daily settlements.
      </Card>
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
