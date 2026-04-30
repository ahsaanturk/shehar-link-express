import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Award, Phone, MapPin, KeyRound, Trash2, ShieldCheck, ShieldOff, Pencil, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  credit_score: number;
  is_verified: boolean;
  created_at: string;
}

interface Otp {
  id: string;
  phone: string;
  user_id: string | null;
  otp: string;
  used: boolean;
  created_at: string;
  expires_at: string;
}

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [otps, setOtps] = useState<Otp[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [orderStats, setOrderStats] = useState<{ delivered: number; cancelled: number; total: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: ps }, { data: os }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("password_reset_otps").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setProfiles((ps ?? []) as Profile[]);
    setOtps((os ?? []) as Otp[]);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected) { setOrderStats(null); return; }
    supabase.from("orders").select("status").eq("customer_id", selected.id).then(({ data }) => {
      const arr = data ?? [];
      setOrderStats({
        total: arr.length,
        delivered: arr.filter((o) => o.status === "delivered").length,
        cancelled: arr.filter((o) => o.status === "cancelled").length,
      });
    });
  }, [selected]);

  const filter = (list: Profile[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").includes(q) ||
      (p.whatsapp ?? "").includes(q));
  };

  const pending = filter(profiles.filter((p) => !p.is_verified));
  const verified = filter(profiles.filter((p) => p.is_verified));
  const all = filter(profiles);

  const markOtpUsed = async (id: string) => {
    const { error } = await supabase.from("password_reset_otps").update({ used: true }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("OTP marked used"); load(); }
  };

  const deleteOtp = async (id: string) => {
    const { error } = await supabase.from("password_reset_otps").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const setVerification = async (userId: string, action: "verify" | "unverify") => {
    const { data, error } = await supabase.functions.invoke("admin-verify-user", {
      body: { action, userId },
    });
    if (error || (data as any)?.error) {
      return toast.error((data as any)?.error || error?.message || "Failed");
    }
    const dup = (data as any)?.deletedDuplicates ?? 0;
    toast.success(
      action === "verify"
        ? `User verified${dup ? ` · ${dup} duplicate account${dup > 1 ? "s" : ""} removed` : ""}`
        : "User unverified",
    );
    await load();
    setSelected((s) => (s ? { ...s, is_verified: action === "verify" } : s));
  };

  const startEdit = (p: Profile) => {
    setEditForm(p);
    setEditOpen(true);
  };

  const saveUser = async () => {
    if (!editForm.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: editForm.name,
        phone: editForm.phone,
        whatsapp: editForm.whatsapp,
        address: editForm.address,
        credit_score: editForm.credit_score,
      })
      .eq("id", editForm.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("User updated");
      setEditOpen(false);
      load();
      if (selected?.id === editForm.id) setSelected({ ...selected, ...editForm } as Profile);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Are you sure? This will delete the user profile AND their auth account permanently.")) return;
    const { data, error } = await supabase.functions.invoke("admin-verify-user", {
      body: { action: "delete_permanently", userId: id },
    });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || "Failed");
    toast.success("User deleted permanently");
    setSelected(null);
    load();
  };

  if (selected) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">User Details</h1>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={() => startEdit(selected)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => deleteUser(selected.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>
        <Card className="space-y-3 p-4">
          <Row label="Name" value={selected.name || "—"} />
          <Row label="Phone" value={selected.phone || "—"} />
          <Row label="WhatsApp" value={selected.whatsapp || "—"} />
          <Row label="Address" value={selected.address || "—"} />
          <Row label="Verified" value={selected.is_verified ? "Yes" : "No"} />
          <Row label="Credit Score" value={String(selected.credit_score)} />
          <Row label="Created" value={new Date(selected.created_at).toLocaleString()} />
        </Card>
        {orderStats && (
          <Card className="grid grid-cols-3 gap-2 p-4 text-center">
            <Stat label="Total" value={orderStats.total} />
            <Stat label="Delivered" value={orderStats.delivered} />
            <Stat label="Cancelled" value={orderStats.cancelled} />
          </Card>
        )}
        <div className="grid grid-cols-2 gap-2">
          {!selected.is_verified ? (
            <Button onClick={() => setVerification(selected.id, "verify")} className="col-span-2">
              <ShieldCheck className="mr-2 h-4 w-4" /> Verify user
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setVerification(selected.id, "unverify")} className="col-span-2">
              <ShieldOff className="mr-2 h-4 w-4" /> Unverify user
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Verifying removes any other unverified accounts using this same phone number, including their orders and history.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-xl font-bold">Users</h1>
        <div className="flex-1" />
        <Button size="sm" onClick={() => toast.info("To create a new user, please use the standard Sign Up page.")}>
          <UserPlus className="mr-1 h-4 w-4" /> New User
        </Button>
      </div>

      <Input placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="otps">OTPs</TabsTrigger>
        </TabsList>
        <TabsContent value="pending"><UserList items={pending} onSelect={setSelected} /></TabsContent>
        <TabsContent value="verified"><UserList items={verified} onSelect={setSelected} /></TabsContent>
        <TabsContent value="all"><UserList items={all} onSelect={setSelected} /></TabsContent>
        <TabsContent value="otps">
          <div className="space-y-2 pt-2">
            {otps.length === 0 && <p className="text-sm text-muted-foreground">No OTPs.</p>}
            {otps.map((o) => (
              <Card key={o.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <KeyRound className="h-4 w-4 text-primary" /> {o.otp}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {o.phone} · {o.used ? "used" : new Date(o.expires_at) < new Date() ? "expired" : "active"} ·{" "}
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  {!o.used && <Button size="sm" variant="outline" onClick={() => markOtpUsed(o.id)}>Mark used</Button>}
                  <Button size="icon" variant="ghost" onClick={() => deleteOtp(o.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full Name</Label>
              <Input value={editForm.name ?? ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editForm.phone ?? ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={editForm.whatsapp ?? ""} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={editForm.address ?? ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div>
              <Label>Credit Score (0 - 1000)</Label>
              <Input type="number" value={editForm.credit_score ?? 0} onChange={(e) => setEditForm({ ...editForm, credit_score: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveUser} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const UserList = ({ items, onSelect }: { items: Profile[]; onSelect: (p: Profile) => void }) => (
  <div className="space-y-2 pt-2">
    {items.length === 0 && <p className="text-sm text-muted-foreground">No users.</p>}
    {items.map((p) => (
      <Card key={p.id} className="cursor-pointer p-3 transition hover:border-primary" onClick={() => onSelect(p)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">{p.name || "Unnamed"}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" /> {p.phone || "—"}
            </p>
            {p.address && (
              <p className="mt-0.5 line-clamp-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" /> {p.address}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-sm font-bold">
              <Award className="h-3.5 w-3.5 text-primary" /> {p.credit_score}
            </div>
            <p className="text-[10px] text-muted-foreground">{p.is_verified ? "Verified" : "Pending"}</p>
          </div>
        </div>
      </Card>
    ))}
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div>
    <p className="text-xl font-extrabold">{value}</p>
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
  </div>
);

export default AdminUsers;
