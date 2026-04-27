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
import { LogOut, Shield, User as UserIcon, Award } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [waSame, setWaSame] = useState(false);
  const [address, setAddress] = useState("");
  const [creditScore, setCreditScore] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
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
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (phone && !/^03\d{9}$/.test(phone)) return toast.error("Phone must be 03xxxxxxxxx");
    setSaving(true);
    const wa = waSame ? phone : whatsapp;
    const { error } = await supabase.from("profiles").update({ name, phone, whatsapp: wa, address }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  if (!user) return null;

  const scorePct = Math.max(0, Math.min(100, (creditScore / 1000) * 100));
  const scoreColor =
    creditScore < 0 ? "bg-destructive" :
    creditScore >= 500 ? "bg-green-500" :
    creditScore >= 150 ? "bg-primary" : "bg-yellow-500";

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{name || "Your profile"}</h1>
          <p className="text-xs text-muted-foreground">{phone || user.email}</p>
        </div>
      </div>

      {/* Credit Score Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold">Credit Score</p>
          </div>
          <p className="text-xl font-extrabold">{creditScore}<span className="text-xs font-normal text-muted-foreground"> / 1000</span></p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${scoreColor} transition-all`} style={{ width: `${scorePct}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {!isVerified
            ? "Place your first order to start earning credits. Your account verifies on first successful delivery."
            : "Keep ordering to earn more credits. +20 per delivered order."}
        </p>
      </Card>

      {isAdmin && (
        <Link to="/admin">
          <Card className="flex items-center gap-3 border-primary/30 bg-primary/5 p-4">
            <Shield className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Admin Portal</p>
              <p className="text-xs text-muted-foreground">Manage stores, products, orders & users</p>
            </div>
          </Card>
        </Link>
      )}

      <Card className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" inputMode="numeric" value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="03xxxxxxxxx" />
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
        <div className="space-y-2">
          <Label htmlFor="address">Default delivery address</Label>
          <Textarea id="address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save"}
        </Button>
      </Card>

      <Button variant="outline" onClick={() => { signOut(); navigate("/"); }} className="w-full">
        <LogOut className="mr-2 h-4 w-4" /> Sign out
      </Button>
    </div>
  );
};

export default Profile;
