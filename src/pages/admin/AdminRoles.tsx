import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, Shield, UserIcon, Truck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Role = "customer" | "admin" | "super_admin" | "rider";

interface ProfileRow {
  id: string;
  name: string | null;
  phone: string | null;
  is_verified: boolean;
  roles: Role[];
}

const AdminRoles = () => {
  const { isSuperAdmin, user } = useAuth();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,name,phone,is_verified").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const map = new Map<string, Role[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role);
      map.set(r.user_id, arr);
    });
    setRows((profiles ?? []).map((p: any) => ({ ...p, roles: map.get(p.id) ?? [] })));
  };

  useEffect(() => { load(); }, []);

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Super admin access required.</p>
      </div>
    );
  }

  const toggleRole = async (uid: string, role: "admin" | "super_admin" | "rider", has: boolean) => {
    if (uid === user?.id && role === "super_admin" && has) {
      return toast.error("You cannot remove your own super admin role.");
    }
    setBusy(uid + role);
    if (has) {
      const { error } = await supabase.from("user_roles")
        .delete().eq("user_id", uid).eq("role", role);
      if (error) toast.error(error.message);
      else toast.success(`Removed ${role}`);
    } else {
      const { error } = await supabase.from("user_roles")
        .insert({ user_id: uid, role });
      if (error) toast.error(error.message);
      else toast.success(`Granted ${role}`);
    }
    setBusy(null);
    load();
  };

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((r) =>
    !q || (r.name ?? "").toLowerCase().includes(q) || (r.phone ?? "").includes(q),
  );

  const formatPhone = (p: string | null) =>
    p && p.length === 11 ? `+92 ${p.slice(1, 4)} ${p.slice(4, 7)} ${p.slice(7)}` : p ?? "—";

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <Crown className="h-5 w-5 text-yellow-600" />
        <h1 className="text-xl font-bold">Manage Roles</h1>
      </div>
      <p className="text-xs text-muted-foreground">
        Grant or revoke <strong>Admin</strong> or <strong>Super Admin</strong> access to any user.
      </p>

      <Input placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="space-y-2">
        {filtered.map((p) => {
          const isAdmin = p.roles.includes("admin");
          const isSuper = p.roles.includes("super_admin");
          const isRider = p.roles.includes("rider");
          return (
            <Card key={p.id} className="space-y-3 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold">{p.name || "Unnamed"}</p>
                  <p className="truncate text-xs text-muted-foreground">{formatPhone(p.phone)}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {isSuper && <Badge className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/15"><Crown className="mr-1 h-3 w-3" />Super</Badge>}
                  {isAdmin && <Badge variant="secondary"><Shield className="mr-1 h-3 w-3" />Admin</Badge>}
                  {isRider && <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary"><Truck className="mr-1 h-3 w-3" />Rider</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm" variant={isAdmin ? "destructive" : "outline"}
                  disabled={busy === p.id + "admin"}
                  onClick={() => toggleRole(p.id, "admin", isAdmin)}
                >
                  {isAdmin ? "Remove Admin" : "Make Admin"}
                </Button>
                <Button
                  size="sm" variant={isRider ? "destructive" : "outline"}
                  disabled={busy === p.id + "rider"}
                  onClick={() => toggleRole(p.id, "rider", isRider)}
                >
                  {isRider ? "Remove Rider" : "Make Rider"}
                </Button>
                <Button
                  size="sm" variant={isSuper ? "destructive" : "outline"}
                  disabled={busy === p.id + "super_admin"}
                  onClick={() => toggleRole(p.id, "super_admin", isSuper)}
                >
                  {isSuper ? "Remove Super" : "Make Super"}
                </Button>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground">No users found.</p>}
      </div>
    </div>
  );
};

export default AdminRoles;
