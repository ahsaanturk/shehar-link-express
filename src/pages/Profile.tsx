import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name,phone,address").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
      }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name, phone, address }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  if (!user) return null;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{name || "Your profile"}</h1>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {isAdmin && (
        <Link to="/admin">
          <Card className="flex items-center gap-3 border-primary/30 bg-primary/5 p-4">
            <Shield className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Admin Portal</p>
              <p className="text-xs text-muted-foreground">Manage stores, products, and orders</p>
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
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
