import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Plus, Trash2, MapPin, Truck, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

// --- Types ---
interface Area { id: string; name: string; slug: string; sort_order: number; is_visible: boolean; }
interface Tier { id: string; label: string; near_count: number; away_count: number; price: number; is_active: boolean; sort_order: number; }

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const AdminLogistics = () => {
  const [activeTab, setActiveTab] = useState("areas");
  const [loading, setLoading] = useState(true);
  
  // Area State
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaOpen, setAreaOpen] = useState(false);
  const [areaForm, setAreaForm] = useState<Partial<Area>>({});
  
  // Tier State
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tierOpen, setTierOpen] = useState(false);
  const [tierForm, setTierForm] = useState<Partial<Tier>>({});

  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [aRes, tRes] = await Promise.all([
      supabase.from("areas").select("*").order("sort_order"),
      supabase.from("delivery_tiers").select("*").order("sort_order")
    ]);
    setAreas((aRes.data ?? []) as Area[]);
    setTiers((tRes.data ?? []) as Tier[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // --- Area Logic ---
  const saveArea = async () => {
    if (!areaForm.name?.trim()) return toast.error("Name required");
    setSaving(true);
    const payload = { ...areaForm, name: areaForm.name.trim(), slug: slugify(areaForm.name) };
    const { error } = areaForm.id 
      ? await supabase.from("areas").update(payload).eq("id", areaForm.id)
      : await supabase.from("areas").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Area saved"); setAreaOpen(false); loadData();
  };

  const toggleArea = async (a: Area) => {
    const { error } = await supabase.from("areas").update({ is_visible: !a.is_visible }).eq("id", a.id);
    if (!error) setAreas(p => p.map(x => x.id === a.id ? { ...x, is_visible: !a.is_visible } : x));
  };

  const removeArea = async (a: Area) => {
    if (!confirm(`Delete "${a.name}"?`)) return;
    const { error } = await supabase.from("areas").delete().eq("id", a.id);
    if (!error) setAreas(p => p.filter(x => x.id !== a.id));
    else toast.error(error.message);
  };

  // --- Tier Logic ---
  const saveTier = async () => {
    if (!tierForm.label?.trim()) return toast.error("Label required");
    setSaving(true);
    const { error } = tierForm.id
      ? await supabase.from("delivery_tiers").update(tierForm).eq("id", tierForm.id)
      : await supabase.from("delivery_tiers").insert(tierForm);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tier saved"); setTierOpen(false); loadData();
  };

  const toggleTier = async (t: Tier) => {
    const { error } = await supabase.from("delivery_tiers").update({ is_active: !t.is_active }).eq("id", t.id);
    if (!error) setTiers(p => p.map(x => x.id === t.id ? { ...x, is_active: !t.is_active } : x));
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Loading logistics...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-12">
      <div className="flex items-center gap-2">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-xl font-bold">Logistics Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
          <TabsTrigger value="areas" className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Service Areas</TabsTrigger>
          <TabsTrigger value="tiers" className="flex items-center gap-2"><Truck className="h-4 w-4" /> Price Tiers</TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">Coverage Areas</h2>
            <Button size="sm" onClick={() => { setAreaForm({ name: "", sort_order: areas.length + 1, is_visible: true }); setAreaOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Area
            </Button>
          </div>

          <div className="space-y-2">
            {areas.map(a => (
              <Card key={a.id} className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-black">{a.sort_order}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">slug: {a.slug}</p>
                </div>
                <Switch checked={a.is_visible} onCheckedChange={() => toggleArea(a)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAreaForm(a); setAreaOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeArea(a)}><Trash2 className="h-4 w-4" /></Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">Delivery Pricing</h2>
            <Button size="sm" onClick={() => { setTierForm({ label: "", price: 100, near_count: 1, away_count: 0, sort_order: tiers.length + 1, is_active: true }); setTierOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Tier
            </Button>
          </div>

          <Card className="p-3 bg-primary/5 border-primary/20">
            <p className="text-[10px] leading-relaxed text-primary font-medium">
              Delivery prices are calculated during checkout based on how many "Near" and "Away" stores are in the customer's cart.
            </p>
          </Card>

          <div className="space-y-2">
            {tiers.map(t => (
              <Card key={t.id} className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Truck className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground">{t.near_count} near + {t.away_count} away stores</p>
                </div>
                <div className="text-right mr-2">
                  <p className="font-black text-sm text-primary">Rs. {t.price}</p>
                </div>
                <Switch checked={t.is_active} onCheckedChange={() => toggleTier(t)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setTierForm(t); setTierOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Area Dialog */}
      <Dialog open={areaOpen} onOpenChange={setAreaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{areaForm.id ? "Edit Area" : "New Area"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Area Name</Label>
              <Input value={areaForm.name || ""} onChange={e => setAreaForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Upper Chatter" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sort Order</Label><Input type="number" value={areaForm.sort_order || 0} onChange={e => setAreaForm(f => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
              <div className="flex items-center justify-between pt-6"><Label>Visible</Label><Switch checked={areaForm.is_visible ?? true} onCheckedChange={v => setAreaForm(f => ({ ...f, is_visible: v }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaOpen(false)}>Cancel</Button>
            <Button onClick={saveArea} disabled={saving}>{saving ? "Saving..." : "Save Area"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier Dialog */}
      <Dialog open={tierOpen} onOpenChange={setTierOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tierForm.id ? "Edit Price Tier" : "New Price Tier"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Label</Label>
              <Input value={tierForm.label || ""} onChange={e => setTierForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Two Local Stores" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Near Stores #</Label><Input type="number" value={tierForm.near_count || 0} onChange={e => setTierForm(f => ({ ...f, near_count: Number(e.target.value) }))} /></div>
              <div><Label>Away Stores #</Label><Input type="number" value={tierForm.away_count || 0} onChange={e => setTierForm(f => ({ ...f, away_count: Number(e.target.value) }))} /></div>
            </div>
            <div>
              <Label>Delivery Price (Rs.)</Label>
              <Input type="number" value={tierForm.price || 0} onChange={e => setTierForm(f => ({ ...f, price: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierOpen(false)}>Cancel</Button>
            <Button onClick={saveTier} disabled={saving}>{saving ? "Saving..." : "Save Tier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLogistics;
