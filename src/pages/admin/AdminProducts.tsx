import { useEffect, useMemo, useState } from "react";
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
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Store = Database["public"]["Tables"]["stores"]["Row"];

interface FormState {
  id?: string;
  store_id: string;
  name: string;
  description: string;
  price: string;
  image_url: string | null;
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
}

const blank = (storeId: string): FormState => ({
  store_id: storeId, name: "", description: "", price: "", image_url: null,
  is_available: true, is_popular: false, sort_order: 0,
});

const AdminProducts = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank(""));
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, p] = await Promise.all([
      supabase.from("stores").select("*").order("name"),
      supabase.from("products").select("*").order("sort_order").order("created_at", { ascending: false }),
    ]);
    if (s.error) toast.error(s.error.message);
    if (p.error) toast.error(p.error.message);
    setStores(s.data ?? []);
    setProducts(p.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const storeMap = useMemo(() => Object.fromEntries(stores.map((s) => [s.id, s])), [stores]);
  const filtered = useMemo(
    () => (storeFilter === "all" ? products : products.filter((p) => p.store_id === storeFilter)),
    [products, storeFilter],
  );

  const startCreate = () => {
    if (stores.length === 0) return toast.error("Create a store first");
    setForm(blank(storeFilter !== "all" ? storeFilter : stores[0].id));
    setOpen(true);
  };

  const startEdit = (p: Product) => {
    setForm({
      id: p.id, store_id: p.store_id, name: p.name,
      description: p.description ?? "", price: String(p.price),
      image_url: p.image_url, is_available: p.is_available,
      is_popular: (p as any).is_popular ?? false,
      sort_order: (p as any).sort_order ?? 0,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return toast.error("Valid price required");
    if (!form.store_id) return toast.error("Select a store");

    setSaving(true);
    const payload: any = {
      store_id: form.store_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      image_url: form.image_url,
      is_available: form.is_available,
      is_popular: form.is_popular,
      sort_order: form.sort_order,
    };
    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Product updated" : "Product created");
    setOpen(false);
    load();
  };

  const toggleAvailable = async (p: Product) => {
    const { error } = await supabase.from("products").update({ is_available: !p.is_available }).eq("id", p.id);
    if (error) return toast.error(error.message);
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_available: !p.is_available } : x));
  };

  const togglePopular = async (p: Product) => {
    const next = !(p as any).is_popular;
    const { error } = await supabase.from("products").update({ is_popular: next }).eq("id", p.id);
    if (error) return toast.error(error.message);
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, is_popular: next } as any : x));
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="text-xl font-bold">Products</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={startCreate}><Plus className="h-4 w-4" /> New</Button></DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Store</Label>
                <Select value={form.store_id} onValueChange={(v) => setForm({ ...form, store_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a store" /></SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Image</Label>
                <ImageUpload bucket="product-images" value={form.image_url} onChange={(url) => setForm((f) => ({ ...f, image_url: url }))} />
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
                <Label>Price (Rs.)</Label>
                <Input type="number" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Mark as Popular</Label>
                <Switch checked={form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Available</Label>
                <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Filter by store</Label>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stores</SelectItem>
            {stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No products.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.name}
                  {(p as any).is_popular && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">Popular</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Rs. {Number(p.price).toFixed(0)} · {storeMap[p.store_id]?.name ?? "—"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Pop</span>
                  <Switch checked={(p as any).is_popular} onCheckedChange={() => togglePopular(p)} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Avail</span>
                  <Switch checked={p.is_available} onCheckedChange={() => toggleAvailable(p)} />
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
