import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Image as ImageIcon, CheckCircle, XCircle, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  promo_code: string | null;
  bg_gradient: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface FormState {
  id?: string;
  title: string;
  subtitle: string;
  promo_code: string;
  bg_gradient: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: string;
}

const blank: FormState = {
  title: "", subtitle: "", promo_code: "", 
  bg_gradient: "linear-gradient(135deg, hsl(271 81% 56%), hsl(280 70% 65%))",
  image_url: null, is_active: true, sort_order: "0",
};

const GRADIENTS = [
  { name: "Purple", value: "linear-gradient(135deg, hsl(271 81% 56%), hsl(280 70% 65%))" },
  { name: "Blue", value: "linear-gradient(135deg, hsl(217 91% 60%), hsl(224 76% 48%))" },
  { name: "Green", value: "linear-gradient(135deg, hsl(142 71% 45%), hsl(154 59% 45%))" },
  { name: "Orange", value: "linear-gradient(135deg, hsl(24 94% 50%), hsl(32 95% 44%))" },
  { name: "Red", value: "linear-gradient(135deg, hsl(0 84% 60%), hsl(0 72% 51%))" },
];

const AdminBanners = ({ embedded = false }: { embedded?: boolean }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("homepage_banners")
      .select("*")
      .order("sort_order", { ascending: true });
    
    if (error) toast.error(error.message);
    else setBanners((data ?? []) as Banner[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setForm({ ...blank, sort_order: String(banners.length) });
    setOpen(true);
  };

  const startEdit = (b: Banner) => {
    setForm({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle ?? "",
      promo_code: b.promo_code ?? "",
      bg_gradient: b.bg_gradient,
      image_url: b.image_url,
      is_active: b.is_active,
      sort_order: String(b.sort_order),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    setSaving(true);

    const payload: Partial<Banner> = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      promo_code: form.promo_code.trim().toUpperCase() || null,
      bg_gradient: form.bg_gradient,
      image_url: form.image_url,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from("homepage_banners").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("homepage_banners").insert(payload));
    }

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Banner updated" : "Banner created");
    setOpen(false);
    load();
  };

  const remove = async (b: Banner) => {
    if (!confirm(`Delete banner "${b.title}"?`)) return;
    const { error } = await supabase.from("homepage_banners").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    setBanners(prev => prev.filter(x => x.id !== b.id));
  };

  const toggle = async (b: Banner) => {
    const { error } = await supabase.from("homepage_banners").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) return toast.error(error.message);
    setBanners(prev => prev.map(x => x.id === b.id ? { ...x, is_active: !b.is_active } : x));
  };

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-3xl space-y-4 p-4"}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Homepage Banners</h2>
        <Button size="sm" onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New Banner</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit Banner" : "New Banner"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Flat 20% OFF" />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="On your first order" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Promo Code (Optional)</Label>
                <Input value={form.promo_code} onChange={e => setForm(f => ({ ...f, promo_code: e.target.value.toUpperCase() }))} placeholder="WELCOME20" />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
              </div>
            </div>
            
            <div>
              <Label>Banner Image (Optional)</Label>
              <ImageUpload bucket="banner-images" value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} />
            </div>

            <div>
              <Label>Background Style</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {GRADIENTS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, bg_gradient: g.value }))}
                    className={`h-10 w-20 rounded-md border-2 transition ${form.bg_gradient === g.value ? "border-primary scale-105" : "border-transparent"}`}
                    style={{ background: g.value }}
                    title={g.name}
                  />
                ))}
              </div>
              <div className="mt-2">
                <Label className="text-[10px]">Custom CSS Gradient</Label>
                <Input value={form.bg_gradient} onChange={e => setForm(f => ({ ...f, bg_gradient: e.target.value }))} className="h-8 text-[11px]" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>

            {/* Preview */}
            <div className="mt-4">
              <Label className="mb-2 block text-xs font-bold text-muted-foreground uppercase">Live Preview</Label>
              <div 
                className="relative flex w-full items-center overflow-hidden rounded-2xl p-4 text-left shadow-sm"
                style={{ background: form.bg_gradient }}
              >
                <div className="relative z-10 text-white">
                  <p className="text-xl font-extrabold leading-none">{form.title || "Banner Title"}</p>
                  <p className="mt-1 text-xs font-medium opacity-90">{form.subtitle || "Banner subtitle goes here"}</p>
                  {form.promo_code && (
                    <span className="mt-2 inline-block rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-bold backdrop-blur">
                      Tap to copy: {form.promo_code}
                    </span>
                  )}
                </div>
                {form.image_url && (
                  <img src={form.image_url} alt="" className="absolute -right-4 top-1/2 h-32 w-auto -translate-y-1/2 object-contain" />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : banners.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No banners yet. Create one above.</Card>
      ) : (
        <div className="space-y-3">
          {banners.map(b => (
            <Card key={b.id} className="flex items-center gap-3 px-3 py-2.5 overflow-hidden">
              <div 
                className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg border shadow-inner"
                style={{ background: b.bg_gradient }}
              >
                {b.image_url ? (
                  <img src={b.image_url} className="h-10 w-auto object-contain" alt="" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-white/50" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm truncate">{b.title}</p>
                  {b.is_active 
                    ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {b.subtitle}
                  {b.promo_code ? ` · Code: ${b.promo_code}` : ""}
                  {` · Order: ${b.sort_order}`}
                </p>
              </div>
              <Switch checked={b.is_active} onCheckedChange={() => toggle(b)} />
              <Button variant="ghost" size="icon" onClick={() => startEdit(b)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(b)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBanners;
