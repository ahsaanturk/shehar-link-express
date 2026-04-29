import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Tier {
  id: string;
  label: string;
  near_count: number;
  away_count: number;
  price: number;
  is_active: boolean;
  sort_order: number;
}

const blank: Partial<Tier> = { label: "", near_count: 1, away_count: 0, price: 100, is_active: true, sort_order: 0 };

const AdminDeliveryTiers = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Tier>>(blank);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("delivery_tiers").select("*").order("sort_order");
    if (error) toast.error(error.message);
    setTiers((data ?? []) as Tier[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startCreate = () => { setForm({ ...blank, sort_order: tiers.length + 1 }); setOpen(true); };
  const startEdit = (t: Tier) => { setForm(t); setOpen(true); };

  const save = async () => {
    if (!form.label?.trim()) return toast.error("Label required");
    setSaving(true);
    const payload: any = {
      label: form.label.trim(),
      near_count: Number(form.near_count) || 0,
      away_count: Number(form.away_count) || 0,
      price: Number(form.price) || 0,
      is_active: form.is_active ?? true,
      sort_order: form.sort_order ?? 0,
    };
    const { error } = form.id
      ? await supabase.from("delivery_tiers").update(payload).eq("id", form.id)
      : await supabase.from("delivery_tiers").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false); load();
  };

  const toggle = async (t: Tier) => {
    const { error } = await supabase.from("delivery_tiers").update({ is_active: !t.is_active }).eq("id", t.id);
    if (error) return toast.error(error.message);
    setTiers((p) => p.map((x) => x.id === t.id ? { ...x, is_active: !t.is_active } : x));
  };

  const remove = async (t: Tier) => {
    if (!confirm(`Delete "${t.label}"?`)) return;
    const { error } = await supabase.from("delivery_tiers").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    setTiers((p) => p.filter((x) => x.id !== t.id));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-xl font-bold">Delivery Tiers</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={startCreate}><Plus className="h-4 w-4" /> New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit tier" : "New tier"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Label</Label><Input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. 2 near stores" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Near stores #</Label><Input type="number" min={0} value={form.near_count ?? 0} onChange={(e) => setForm({ ...form, near_count: Number(e.target.value) })} /></div>
                <div><Label>Away stores #</Label><Input type="number" min={0} value={form.away_count ?? 0} onChange={(e) => setForm({ ...form, away_count: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Price (Rs.)</Label><Input type="number" value={form.price ?? 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
              <div><Label>Sort order</Label><Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-3 text-xs text-muted-foreground">
        Tiers control checkout delivery price based on how many "near" and "away" stores the customer has in their cart.
        If no tier matches a combination, customers see an error and can't checkout that combination.
      </Card>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {tiers.map((t) => (
            <Card key={t.id} className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-xs font-bold">{t.sort_order}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.near_count} near + {t.away_count} away · Rs. {t.price}</p>
              </div>
              <Switch checked={t.is_active} onCheckedChange={() => toggle(t)} />
              <Button variant="ghost" size="icon" onClick={() => startEdit(t)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDeliveryTiers;
