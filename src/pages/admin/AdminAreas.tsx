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

interface Area {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const AdminAreas = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Area>>({ name: "", sort_order: 0, is_visible: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("areas").select("*").order("sort_order");
    if (error) toast.error(error.message);
    setAreas((data ?? []) as Area[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setForm({ name: "", sort_order: areas.length + 1, is_visible: true });
    setOpen(true);
  };
  const startEdit = (a: Area) => { setForm(a); setOpen(true); };

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Name required");
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      slug: slugify(form.name),
      sort_order: form.sort_order ?? 0,
      is_visible: form.is_visible ?? true,
    };
    const { error } = form.id
      ? await supabase.from("areas").update(payload).eq("id", form.id)
      : await supabase.from("areas").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Updated" : "Created");
    setOpen(false);
    load();
  };

  const toggle = async (a: Area) => {
    const { error } = await supabase.from("areas").update({ is_visible: !a.is_visible }).eq("id", a.id);
    if (error) return toast.error(error.message);
    setAreas((p) => p.map((x) => x.id === a.id ? { ...x, is_visible: !a.is_visible } : x));
  };

  const remove = async (a: Area) => {
    if (!confirm(`Delete area "${a.name}"?`)) return;
    const { error } = await supabase.from("areas").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    setAreas((p) => p.filter((x) => x.id !== a.id));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-xl font-bold">Delivery Areas</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={startCreate}><Plus className="h-4 w-4" /> New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit area" : "New area"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Visible</Label>
                <Switch checked={form.is_visible ?? true} onCheckedChange={(v) => setForm({ ...form, is_visible: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2">
          {areas.map((a) => (
            <Card key={a.id} className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-xs font-bold">{a.sort_order}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.slug}</p>
              </div>
              <Switch checked={a.is_visible} onCheckedChange={() => toggle(a)} />
              <Button variant="ghost" size="icon" onClick={() => startEdit(a)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(a)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAreas;
