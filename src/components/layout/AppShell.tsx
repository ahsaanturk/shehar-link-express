import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { FloatingCart } from "@/components/FloatingCart";

export const AppShell = () => {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <main className={hideNav ? "flex-1" : "flex-1 pb-20"}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
      <FloatingCart />
    </div>
  );
};
