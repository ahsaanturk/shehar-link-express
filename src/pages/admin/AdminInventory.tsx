import { useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Store, ShoppingBag, LayoutGrid, Tag, ClipboardList } from "lucide-react";
import AdminStores from "./AdminStores";
import AdminProducts from "./AdminProducts";
import AdminCategories from "./AdminCategories";
import AdminCoupons from "./AdminCoupons";
import AdminCustomOrders from "./AdminCustomOrders";

const AdminInventory = () => {
  const [activeTab, setActiveTab] = useState("stores");

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-xl font-bold">Inventory Management</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="stores" className="flex items-center gap-1.5">
            <Store className="h-4 w-4" /> <span className="hidden sm:inline">Stores</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-1.5">
            <LayoutGrid className="h-4 w-4" /> <span className="hidden sm:inline">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-1.5">
            <Tag className="h-4 w-4" /> <span className="hidden sm:inline">Coupons</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" /> <span className="hidden sm:inline">Custom</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stores" className="mt-4 border-none p-0">
          <AdminStores embedded={true} />
        </TabsContent>
        <TabsContent value="products" className="mt-4 border-none p-0">
          <AdminProducts embedded={true} />
        </TabsContent>
        <TabsContent value="categories" className="mt-4 border-none p-0">
          <AdminCategories embedded={true} />
        </TabsContent>
        <TabsContent value="coupons" className="mt-4 border-none p-0">
          <AdminCoupons embedded={true} />
        </TabsContent>
        <TabsContent value="custom" className="mt-4 border-none p-0">
          <AdminCustomOrders embedded={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInventory;
