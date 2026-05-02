import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/hooks/useAuth";
import { AreaProvider } from "@/hooks/useArea";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Orders from "./pages/Orders.tsx";
import OrderDetail from "./pages/OrderDetail.tsx";
import Cart from "./pages/Cart.tsx";
import Profile from "./pages/Profile.tsx";
import Auth from "./pages/Auth.tsx";
import StorePage from "./pages/StorePage.tsx";
import Collections from "./pages/Collections.tsx";
import CategoryDetail from "./pages/CategoryDetail.tsx";
import Favorites from "./pages/Favorites.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Notifications from "./pages/Notifications.tsx";
import SearchResults from "./pages/SearchResults.tsx";
import AdminHome from "./pages/admin/AdminHome.tsx";
import AdminOrders from "./pages/admin/AdminOrders.tsx";
import AdminStores from "./pages/admin/AdminStores.tsx";
import AdminProducts from "./pages/admin/AdminProducts.tsx";
import AdminSettlements from "./pages/admin/AdminSettlements.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminNotifications from "./pages/admin/AdminNotifications.tsx";
import AdminRoles from "./pages/admin/AdminRoles.tsx";
import AdminAreas from "./pages/admin/AdminAreas.tsx";
import AdminInventory from "./pages/admin/AdminInventory.tsx";
import AdminDeliveryTiers from "./pages/admin/AdminDeliveryTiers.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminReviews from "./pages/admin/AdminReviews.tsx";
import NotFound from "./pages/NotFound.tsx";
import CustomOrder from "./pages/CustomOrder.tsx";
import AdminCoupons from "./pages/admin/AdminCoupons.tsx";
import AdminCustomOrders from "./pages/admin/AdminCustomOrders.tsx";
import AdminBanners from "./pages/admin/AdminBanners.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AreaProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<AppShell />}>
                <Route path="/" element={<Index />} />
                <Route path="/store/:id" element={<StorePage />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/categories" element={<Collections />} />
                <Route path="/category/:slug" element={<CategoryDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/custom-order" element={<CustomOrder />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminHome /></ProtectedRoute>} />
                <Route path="/admin/orders" element={<ProtectedRoute requireAdmin><AdminOrders /></ProtectedRoute>} />
                <Route path="/admin/inventory" element={<ProtectedRoute requireAdmin><AdminInventory /></ProtectedRoute>} />
                <Route path="/admin/areas" element={<ProtectedRoute requireAdmin><AdminAreas /></ProtectedRoute>} />
                <Route path="/admin/delivery-tiers" element={<ProtectedRoute requireAdmin><AdminDeliveryTiers /></ProtectedRoute>} />
                <Route path="/admin/settlements" element={<ProtectedRoute requireAdmin><AdminSettlements /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/notifications" element={<ProtectedRoute requireAdmin><AdminNotifications /></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><AdminAnalytics /></ProtectedRoute>} />
                <Route path="/admin/reviews" element={<ProtectedRoute requireAdmin><AdminReviews /></ProtectedRoute>} />
                <Route path="/admin/roles" element={<ProtectedRoute requireAdmin><AdminRoles /></ProtectedRoute>} />
                <Route path="/admin/coupons" element={<ProtectedRoute requireAdmin><AdminCoupons /></ProtectedRoute>} />
                <Route path="/admin/banners" element={<ProtectedRoute requireAdmin><AdminBanners /></ProtectedRoute>} />
                <Route path="/admin/custom-orders" element={<ProtectedRoute requireAdmin><AdminCustomOrders /></ProtectedRoute>} />

                {/* Legacy Admin Redirects */}
                <Route path="/admin/stores" element={<Navigate to="/admin/inventory" replace />} />
                <Route path="/admin/products" element={<Navigate to="/admin/inventory" replace />} />
                <Route path="/admin/categories" element={<Navigate to="/admin/inventory" replace />} />

                {/* SEO permalinks: must be last so reserved app routes like /cart win */}
                <Route path="/:storeSlug" element={<StorePage />} />
                <Route path="/:storeSlug/:productSlug" element={<ProductDetail />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </AreaProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
