import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Orders from "./pages/Orders.tsx";
import OrderDetail from "./pages/OrderDetail.tsx";
import Cart from "./pages/Cart.tsx";
import Profile from "./pages/Profile.tsx";
import Auth from "./pages/Auth.tsx";
import StorePage from "./pages/StorePage.tsx";
import Collections from "./pages/Collections.tsx";
import Favorites from "./pages/Favorites.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Notifications from "./pages/Notifications.tsx";
import AdminHome from "./pages/admin/AdminHome.tsx";
import AdminOrders from "./pages/admin/AdminOrders.tsx";
import AdminStores from "./pages/admin/AdminStores.tsx";
import AdminProducts from "./pages/admin/AdminProducts.tsx";
import AdminSettlements from "./pages/admin/AdminSettlements.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<Index />} />
              <Route path="/store/:id" element={<StorePage />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/categories" element={<Collections />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminHome /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute requireAdmin><AdminOrders /></ProtectedRoute>} />
              <Route path="/admin/stores" element={<ProtectedRoute requireAdmin><AdminStores /></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute requireAdmin><AdminProducts /></ProtectedRoute>} />
              <Route path="/admin/settlements" element={<ProtectedRoute requireAdmin><AdminSettlements /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
