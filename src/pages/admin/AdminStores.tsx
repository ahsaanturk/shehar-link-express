import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface Store {
  id: string;
  name: string;
  description: string | null;
  category: string;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
}
interface Category { id: string; name: string; }
interface Area { id: string; name: string; }

interface FormState {
  id?: string;
  name: string;
  description: string;
  category_id: string;
  image_url: string | null;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  area_ids: string[];
  category_ids: string[];
  opening_time: string;
  closing_time: string;
  is_always_open: boolean;
}

const blank: FormState = {
  name: "", description: "", category_id: "", image_url: null,
  is_active: true, is_popular: false, sort_order: 0, area_ids: [], category_ids: [],
  opening_time: "09:00", closing_time: "22:00", is_always_open: false,
};

const AdminStores = ({ embedded = false }: { embedded?: boolean }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [storeAreas, setStoreAreas] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [storeCategories, setStoreCategories] = useState<Record<string, string[]>>({});

  const load = async () => {
    setLoading(true);
    const [s, c, a, sa, sc] = await Promise.all([
      supabase.from("stores").select("*").order("sort_order").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("sort_order"),
      supabase.from("areas").select("id,name").order("sort_order"),
      supabase.from("store_areas").select("store_id,area_id"),
      supabase.from("store_categories").select("store_id,category_id"),
    ]);
    if (s.error) toast.error(s.error.message);
    setStores((s.data ?? []) as Store[]);
    setCategories((c.data ?? []) as Category[]);
    setAreas((a.data ?? []) as Area[]);
    
    const aMap: Record<string, string[]> = {};
    (sa.data ?? []).forEach((row: any) => { (aMap[row.store_id] = aMap[row.store_id] ?? []).push(row.area_id); });
    setStoreAreas(aMap);

    const cMap: Record<string, string[]> = {};
    (sc.data ?? []).forEach((row: any) => { (cMap[row.store_id] = cMap[row.store_id] ?? []).push(row.category_id); });
    setStoreCategories(cMap);
    
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setForm({ ...blank, category_id: categories[0]?.id ?? "" });
    setOpen(true);
  };

  const startEdit = (s: Store & { opening_time?: string; closing_time?: string; is_always_open?: boolean }) => {
    setForm({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      category_id: s.category_id ?? categories[0]?.id ?? "",
      image_url: s.image_url,
      is_active: s.is_active,
      is_popular: s.is_popular,
      sort_order: s.sort_order,
      area_ids: storeAreas[s.id] ?? [],
      category_ids: storeCategories[s.id] ?? (s.category_id ? [s.category_id] : []),
      opening_time: s.opening_time ? s.opening_time.slice(0,5) : "09:00",
      closing_time: s.closing_time ? s.closing_time.slice(0,5) : "22:00",
      is_always_open: s.is_always_open ?? false,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.category_id) return toast.error("Choose a category");
    if (form.area_ids.length === 0) return toast.error("Select at least one delivery area");
    setSaving(true);

    setSaving(true);
    
    // Default to "Others" if no category selected
    let chosenCatIds = form.category_ids;
    if (chosenCatIds.length === 0) {
      const others = categories.find(c => c.name.toLowerCase() === "others");
      if (others) chosenCatIds = [others.id];
    }

    // Determine legacy enum from first category
    const cat = categories.find((c) => chosenCatIds.includes(c.id));
    const enumValue = (cat ? slugToEnum(cat.name) : "grocery") as any;

    // Generate slug from name and verify availability
    const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) { setSaving(false); return toast.error("Invalid name"); }
    const { data: avail } = await supabase.rpc("is_slug_available", { _slug: slug, _exclude_store_id: form.id ?? null } as any);
    if (avail === false) { setSaving(false); return toast.error(`Slug "${slug}" is taken or reserved. Pick a different store name.`); }

    const payload: any = {
      name: form.name.trim(),
      slug,
      description: form.description.trim() || null,
      category: enumValue,
      category_id: chosenCatIds[0] || null,
      image_url: form.image_url,
      is_active: form.is_active,
      is_popular: form.is_popular,
      sort_order: form.sort_order,
      opening_time: form.is_always_open ? null : (form.opening_time || null),
      closing_time: form.is_always_open ? null : (form.closing_time || null),
      is_always_open: form.is_always_open,
    };

    let storeId = form.id;
    if (form.id) {
      const { error } = await supabase.from("stores").update(payload).eq("id", form.id);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("stores").insert(payload).select("id").single();
      if (error || !data) { setSaving(false); return toast.error(error?.message ?? "Insert failed"); }
      storeId = data.id;
    }

    // Replace area links
    if (storeId) {
      await supabase.from("store_areas").delete().eq("store_id", storeId);
      if (form.area_ids.length > 0) {
        const rows = form.area_ids.map((area_id) => ({ store_id: storeId!, area_id }));
        const { error } = await supabase.from("store_areas").insert(rows);
        if (error) { setSaving(false); return toast.error(error.message); }
      }
      
      // Replace category links
      await supabase.from("store_categories").delete().eq("store_id", storeId);
      if (chosenCatIds.length > 0) {
        const rows = chosenCatIds.map((category_id) => ({ store_id: storeId!, category_id }));
        const { error } = await supabase.from("store_categories").insert(rows);
        if (error) { setSaving(false); return toast.error(error.message); }
      }
    }

    setSaving(false);
    toast.success(form.id ? "Store updated" : "Store created");
    setOpen(false);
    load();
  };

  const togglePopular = async (s: Store) => {
    const { error } = await supabase.from("stores").update({ is_popular: !s.is_popular }).eq("id", s.id);
    if (error) return toast.error(error.message);
    setStores((p) => p.map((x) => x.id === s.id ? { ...x, is_popular: !s.is_popular } : x));
  };

  const toggleActive = async (s: Store) => {
    const { error } = await supabase.from("stores").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) return toast.error(error.message);
    setStores((p) => p.map((x) => x.id === s.id ? { ...x, is_active: !s.is_active } : x));
  };

  const remove = async (s: Store) => {
    // First warning
    const firstConfirm = confirm(`Are you sure you want to delete "${s.name}"? All products related to this store will also be PERMANENTLY deleted.`);
    if (!firstConfirm) return;

    // Second warning
    const secondConfirm = confirm(`FINAL WARNING: This action cannot be undone. Are you absolutely sure you want to delete "${s.name}" and all its products?`);
    if (!secondConfirm) return;

    const { error } = await supabase.from("stores").delete().eq("id", s.id);
    if (error) {
      if (error.message.includes("violates foreign key constraint")) {
        return toast.error("Cannot delete store because it has existing orders. Please deactivate it instead.");
      }
      return toast.error(error.message);
    }
    
    setStores((p) => p.filter((x) => x.id !== s.id));
    toast.success(`Store "${s.name}" and its products have been deleted.`);
  };

  const toggleAreaInForm = (id: string) => {
    setForm((f) => ({
      ...f,
      area_ids: f.area_ids.includes(id) ? f.area_ids.filter((x) => x !== id) : [...f.area_ids, id],
    }));
  };

  const toggleCategoryInForm = (id: string) => {
    setForm((f) => ({
      ...f,
      category_ids: f.category_ids.includes(id) ? f.category_ids.filter((x) => x !== id) : [...f.category_ids, id],
    }));
  };

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-3xl space-y-4 p-4"}>
      {!embedded && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="text-xl font-bold">Stores</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={startCreate}><Plus className="h-4 w-4" /> New</Button></DialogTrigger>
          </Dialog>
        </div>
      )}

      {embedded && (
        <div className="flex justify-end">
          <Button onClick={startCreate} size="sm"><Plus className="h-4 w-4" /> New Store</Button>
        </div>
      )}

      {!embedded && <div className="h-px bg-border" />}
      
      {/* Dialog remains same but needs trigger logic adjustment if embedded */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit store" : "New store"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Image</Label>
              <ImageUpload bucket="store-images" value={form.image_url} onChange={(url) => setForm((f) => ({ ...f, image_url: url }))} />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Categories (select one or more)</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {categories.map((c) => {
                  const active = form.category_ids.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => toggleCategoryInForm(c.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                        active ? "border-primary bg-secondary text-primary" : "border-border bg-card text-foreground"
                      }`}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">If none selected, defaults to "Others".</p>
            </div>
            <div>
              <Label>Delivery Areas (select one or more)</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {areas.map((a) => {
                  const active = form.area_ids.includes(a.id);
                  return (
                    <button key={a.id} type="button" onClick={() => toggleAreaInForm(a.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                        active ? "border-primary bg-secondary text-primary" : "border-border bg-card text-foreground"
                      }`}>
                      {a.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div className="rounded-xl border border-border p-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Store Timings</p>
              <div className="flex items-center justify-between">
                <Label>Open 24/7 (Always Open)</Label>
                <Switch checked={form.is_always_open} onCheckedChange={(v) => setForm({ ...form, is_always_open: v })} />
              </div>
              {!form.is_always_open && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Opening Time</Label>
                    <Input type="time" value={form.opening_time} onChange={e => setForm({ ...form, opening_time: e.target.value })} />
                  </div>
                  <div>
                    <Label>Closing Time</Label>
                    <Input type="time" value={form.closing_time} onChange={e => setForm({ ...form, closing_time: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label>Mark as Popular</Label>
              <Switch checked={form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : stores.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No stores yet.</Card>
      ) : (
        <div className="space-y-2">
          {stores.map((s) => (
            <Card key={s.id} className="flex items-center gap-3 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {s.image_url && <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {storeCategories[s.id]?.map(cid => categories.find(c => c.id === cid)?.name).filter(Boolean).join(", ") || "Others"} · {(storeAreas[s.id]?.length ?? 0)} area(s)
                  {s.is_popular && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">Popular</span>}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Pop</span>
                  <Switch checked={s.is_popular} onCheckedChange={() => togglePopular(s)} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Active</span>
                  <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Map a category name back to one of the legacy enum values (only 3 are valid)
function slugToEnum(name: string): "grocery" | "fruits_veggies" | "fast_food" {
  const n = name.toLowerCase();
  if (n.includes("fruit") || n.includes("veg")) return "fruits_veggies";
  if (n.includes("fast") || n.includes("food") || n.includes("restaurant")) return "fast_food";
  return "grocery";
}

export default AdminStores;
