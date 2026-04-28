import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter,
} from "@/components/ui/sheet";
import {
  ChevronRight, LogOut, Shield, User as UserIcon, Phone, Star,
  MapPin, LifeBuoy, MessageCircle, Crown,
} from "lucide-react";
import { toast } from "sonner";

const SUPPORT_WHATSAPP = "923468776390"; // +92 346 877 6390

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin, loading, signOut } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [waSame, setWaSame] = useState(false);
  const [address, setAddress] = useState("");
  const [creditScore, setCreditScore] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const load = () => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name,phone,whatsapp,address,credit_score,is_verified")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setName(data.name ?? "");
          setPhone(data.phone ?? "");
          setWhatsapp(data.whatsapp ?? "");
          setAddress(data.address ?? "");
          setCreditScore((data as any).credit_score ?? 0);
          setIsVerified((data as any).is_verified ?? false);
          setWaSame((data.whatsapp ?? "") === (data.phone ?? ""));
        }
      });
  };

  useEffect(load, [user]);

  const saveProfile = async () => {
    if (!user) return;
    if (phone && !/^03\d{9}$/.test(phone)) return toast.error("Phone must be 03xxxxxxxxx");
    setSaving(true);
    const wa = waSame ? phone : whatsapp;
    const { error } = await supabase.from("profiles")
      .update({ name, phone, whatsapp: wa }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setEditOpen(false);
  };

  const saveAddress = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ address }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Address saved");
    setAddrOpen(false);
  };

  const formatPhone = (p: string) => {
    if (!p || p.length !== 11) return p || "—";
    return `+92 ${p.slice(1, 4)} ${p.slice(4, 7)} ${p.slice(7)}`;
  };

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Hello, I need support with Sheharlink.")}`,
      "_blank",
    );
  };

  if (!user) return null;

  return (
    <div className="space-y-3 p-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserIcon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{name || "Your profile"}</h1>
          <p className="text-xs text-muted-foreground">{isVerified ? "Verified account" : "New account"}</p>
        </div>
      </div>

      {/* Name + Phone row → edit */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetTrigger asChild>
          <button className="w-full text-left">
            <Card className="p-4">
              <Row
                icon={<UserIcon className="h-4 w-4 text-primary" />}
                label="Name"
                value={name || "Add your name"}
              />
              <div className="my-3 h-px bg-border" />
              <Row
                icon={<Phone className="h-4 w-4 text-primary" />}
                label="Phone"
                value={formatPhone(phone)}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">Tap to edit</p>
            </Card>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Edit profile</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                inputMode="numeric" placeholder="03xxxxxxxxx" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="wasame" checked={waSame} onCheckedChange={(v) => setWaSame(!!v)} />
                <Label htmlFor="wasame" className="cursor-pointer text-xs">WhatsApp same as phone</Label>
              </div>
              {!waSame && (
                <Input value={whatsapp} placeholder="03xxxxxxxxx"
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 11))} />
              )}
            </div>
          </div>
          <SheetFooter>
            <Button onClick={saveProfile} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Credit Score */}
      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-600">
          <Star className="h-4 w-4 fill-current" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Credit Score</p>
          <p className="text-base font-bold">{creditScore} <span className="text-xs font-normal text-muted-foreground">/ 1000</span></p>
        </div>
      </Card>

      {/* Address */}
      <Sheet open={addrOpen} onOpenChange={setAddrOpen}>
        <SheetTrigger asChild>
          <button className="w-full text-left">
            <Card className="flex items-start gap-3 p-4">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Default Address</p>
                <p className="line-clamp-2 text-sm font-medium">{address || "Add your delivery address"}</p>
              </div>
              <ChevronRight className="mt-2 h-4 w-4 text-muted-foreground" />
            </Card>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Manage address</SheetTitle></SheetHeader>
          <div className="space-y-2 py-4">
            <Label>Default delivery address</Label>
            <Textarea rows={4} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <SheetFooter>
            <Button onClick={saveAddress} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Admin / Super admin entries */}
      {isAdmin && (
        <Link to="/admin">
          <Card className="flex items-center gap-3 border-primary/30 bg-primary/5 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Admin Portal</p>
              <p className="text-xs text-muted-foreground">Manage stores, orders & users</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      )}
      {isSuperAdmin && (
        <Link to="/admin/roles">
          <Card className="flex items-center gap-3 border-yellow-500/40 bg-yellow-500/5 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-600">
              <Crown className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Super Admin · Manage Roles</p>
              <p className="text-xs text-muted-foreground">Assign or remove admin access</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      )}

      {/* Help & Support */}
      <Card className="overflow-hidden p-0">
        <button
          onClick={openWhatsApp}
          className="flex w-full items-center gap-3 p-4 text-left transition active:bg-muted"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LifeBuoy className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Help & Support</p>
            <p className="text-xs text-muted-foreground">We're here to help</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="h-px bg-border" />
        <button
          onClick={openWhatsApp}
          className="flex w-full items-center gap-3 p-4 text-left transition active:bg-muted"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/15 text-green-600">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">WhatsApp Support</p>
            <p className="text-xs text-muted-foreground">+92 346 877 6390</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        onClick={() => { signOut(); navigate("/"); }}
        className="w-full"
      >
        <LogOut className="mr-2 h-4 w-4" /> Logout
      </Button>
    </div>
  );
};

const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
  </div>
);

export default Profile;
