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

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  show_on_home: boolean;
  is_visible: boolean;
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const AdminCategories = () => {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Category>>({ name: "", icon: "ShoppingBasket", sort_order: 0, show_on_home: true, is_visible: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("categories").select("*").order("sort_order");
    if (error) toast.error(error.message);
    setCats((data ?? []) as Category[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setForm({ name: "", icon: "ShoppingBasket", sort_order: cats.length + 1, show_on_home: true, is_visible: true });
    setOpen(true);
  };
  const startEdit = (c: Category) => { setForm(c); setOpen(true); };

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Name required");
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      slug: slugify(form.name),
      icon: form.icon || null,
      sort_order: form.sort_order ?? 0,
      show_on_home: form.show_on_home ?? true,
      is_visible: form.is_visible ?? true,
    };
    const { error } = form.id
      ? await supabase.from("categories").update(payload).eq("id", form.id)
      : await supabase.from("categories").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Updated" : "Created");
    setOpen(false);
    load();
  };

  const toggle = async (c: Category, field: "is_visible" | "show_on_home") => {
    const next = !c[field];
    const { error } = await supabase.from("categories").update({ [field]: next }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setCats((p) => p.map((x) => x.id === c.id ? { ...x, [field]: next } : x));
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    setCats((p) => p.filter((x) => x.id !== c.id));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-xl font-bold">Categories</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={startCreate}><Plus className="h-4 w-4" /> New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Icon (Lucide name)</Label>
                <Input value={form.icon ?? ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. ShoppingBasket, Pizza, Pill" />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show on home</Label>
                <Switch checked={form.show_on_home ?? true} onCheckedChange={(v) => setForm({ ...form, show_on_home: v })} />
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
          {cats.map((c) => (
            <Card key={c.id} className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-xs font-bold">{c.sort_order}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.icon ?? "—"} · {c.show_on_home ? "Home" : "Hidden from home"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Home</span>
                  <Switch checked={c.show_on_home} onCheckedChange={() => toggle(c, "show_on_home")} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Visible</span>
                  <Switch checked={c.is_visible} onCheckedChange={() => toggle(c, "is_visible")} />
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
