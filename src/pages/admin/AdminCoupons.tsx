import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Coupon {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  min_order: number;
  store_id: string | null;
  expires_at: string | null;
  is_active: boolean;
  usage_count: number;
  max_usage: number | null;
  created_at: string;
}

interface Store { id: string; name: string; }

interface FormState {
  id?: string;
  code: string;
  type: "percent" | "flat";
  value: string;
  min_order: string;
  store_id: string;
  expires_at: string;
  is_active: boolean;
  max_usage: string;
}

const blank: FormState = {
  code: "", type: "percent", value: "", min_order: "0",
  store_id: "global", expires_at: "", is_active: true, max_usage: "",
};

const AdminCoupons = ({ embedded = false }: { embedded?: boolean }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, s] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.from("stores").select("id,name").eq("is_active", true).order("name"),
    ]);
    setCoupons((c.data ?? []) as Coupon[]);
    setStores((s.data ?? []) as Store[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setForm({ ...blank, code: generateCode() });
    setOpen(true);
  };

  const startEdit = (c: Coupon) => {
    setForm({
      id: c.id,
      code: c.code,
      type: c.type,
      value: String(c.value),
      min_order: String(c.min_order),
      store_id: c.store_id ?? "global",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      is_active: c.is_active,
      max_usage: c.max_usage ? String(c.max_usage) : "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim()) return toast.error("Code is required");
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) <= 0)
      return toast.error("Enter a valid value");
    setSaving(true);

    const payload: Partial<Coupon> = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      min_order: Number(form.min_order) || 0,
      store_id: form.store_id === "global" ? null : form.store_id || null,
      expires_at: form.expires_at ? new Date(form.expires_at + "T23:59:59").toISOString() : null,
      is_active: form.is_active,
      max_usage: form.max_usage ? Number(form.max_usage) : null,
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from("coupons").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("coupons").insert(payload));
    }

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Coupon updated" : "Coupon created");
    setOpen(false);
    load();
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    setCoupons(prev => prev.filter(x => x.id !== c.id));
  };

  const toggle = async (c: Coupon) => {
    const { error } = await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setCoupons(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x));
  };

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-3xl space-y-4 p-4"}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Coupons</h2>
        <Button size="sm" onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New Coupon</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit Coupon" : "New Coupon"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as "percent" | "flat" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount (Rs.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{form.type === "percent" ? "Discount (%)" : "Discount (Rs.)"}</Label>
                <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === "percent" ? "20" : "50"} />
              </div>
              <div>
                <Label>Min. Order (Rs.)</Label>
                <Input type="number" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Store (leave Global for all stores)</Label>
              <Select value={form.store_id} onValueChange={v => setForm(f => ({ ...f, store_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Global (all stores)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">🌐 Global (all stores)</SelectItem>
                  {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expires On</Label>
                <Input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
                <p className="text-[10px] text-muted-foreground mt-1">Leave blank = never expires</p>
              </div>
              <div>
                <Label>Max Usage</Label>
                <Input type="number" value={form.max_usage} onChange={e => setForm(f => ({ ...f, max_usage: e.target.value }))} placeholder="Unlimited" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : coupons.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No coupons yet. Create one above.</Card>
      ) : (
        <div className="space-y-2">
          {coupons.map(c => {
            const storeName = c.store_id ? stores.find(s => s.id === c.store_id)?.name : "Global";
            const expired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
            return (
              <Card key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold tracking-wider text-sm">{c.code}</p>
                    {c.is_active && !expired
                      ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                    {expired && <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-bold">EXPIRED</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {c.type === "percent" ? `${c.value}% off` : `Rs. ${c.value} off`}
                    {c.min_order > 0 ? ` · min Rs. ${c.min_order}` : ""}
                    {" · "}{storeName}
                    {c.expires_at ? ` · Exp: ${format(new Date(c.expires_at), "dd MMM yy")}` : ""}
                    {" · "}{c.usage_count}{c.max_usage ? `/${c.max_usage}` : ""} used
                  </p>
                </div>
                <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default AdminCoupons;
