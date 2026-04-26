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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { Database } from "@/integrations/supabase/types";

type Store = Database["public"]["Tables"]["stores"]["Row"];
type Category = Database["public"]["Enums"]["store_category"];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "grocery", label: "Grocery" },
  { value: "fruits_veggies", label: "Fruits & Veggies" },
  { value: "fast_food", label: "Fast Food" },
];

interface FormState {
  id?: string;
  name: string;
  description: string;
  category: Category;
  image_url: string | null;
  is_active: boolean;
}

const blank: FormState = {
  name: "",
  description: "",
  category: "grocery",
  image_url: null,
  is_active: true,
};

const AdminStores = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setStores(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setForm(blank);
    setOpen(true);
  };

  const startEdit = (s: Store) => {
    setForm({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      category: s.category,
      image_url: s.image_url,
      is_active: s.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      image_url: form.image_url,
      is_active: form.is_active,
    };
    const { error } = form.id
      ? await supabase.from("stores").update(payload).eq("id", form.id)
      : await supabase.from("stores").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Store updated" : "Store created");
    setOpen(false);
    load();
  };

  const toggleActive = async (s: Store) => {
    const { error } = await supabase.from("stores").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) return toast.error(error.message);
    setStores((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: !s.is_active } : x)));
  };

  const remove = async (s: Store) => {
    if (!confirm(`Delete "${s.name}"? Products will also be deleted.`)) return;
    const { error } = await supabase.from("stores").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Store deleted");
    setStores((prev) => prev.filter((x) => x.id !== s.id));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Stores</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startCreate}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit store" : "New store"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Image</Label>
                <ImageUpload
                  bucket="store-images"
                  value={form.image_url}
                  onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as Category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : stores.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No stores yet. Create your first one.</Card>
      ) : (
        <div className="space-y-2">
          {stores.map((s) => (
            <Card key={s.id} className="flex items-center gap-3 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {s.image_url ? (
                  <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{s.category.replace("_", " ")}</p>
              </div>
              <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
              <Button variant="ghost" size="icon" onClick={() => startEdit(s)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(s)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminStores;
