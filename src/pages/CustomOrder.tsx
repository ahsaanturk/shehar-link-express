import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useArea } from "@/hooks/useArea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ClipboardList, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface Store { id: string; name: string; slug: string; }

// Rotating placeholder texts — Urdu, Roman Urdu, English
const PLACEHOLDERS = [
  "اپنا آرڈر یہاں لکھیں… مثلاً: 2 کلو چاول، 1 لیٹر دودھ",
  "Apna order yahan likhein… Misal: 2 kilo chawal, 1 litre doodh",
  "Type your order here… e.g. 2 kg rice, 1 litre milk, some bread",
  "کوئی بھی چیز منگوائیں جو دستیاب نہ ہو…",
  "Jo cheez available nahi woh bhi mangwa saktay hain…",
  "Order anything you need — even if it's not listed in the store!",
];

export default function CustomOrder() {
  const { user } = useAuth();
  const { selectedArea } = useArea();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetStore = searchParams.get("store");

  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shortId, setShortId] = useState("");

  // Cycling placeholder
  const [phIdx, setPhIdx] = useState(0);
  const [phVisible, setPhVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setPhVisible(false);
      setTimeout(() => {
        setPhIdx(i => (i + 1) % PLACEHOLDERS.length);
        setPhVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Load stores
  useEffect(() => {
    supabase.from("stores").select("id,name,slug").eq("is_active", true).eq("is_visible", true).order("name")
      .then(({ data }) => {
        const list = (data ?? []) as Store[];
        setStores(list);
        if (presetStore) {
          const match = list.find(s => s.slug === presetStore || s.id === presetStore);
          if (match) { setStoreId(match.id); setStoreName(match.name); }
        } else if (list[0]) {
          setStoreId(list[0].id);
          setStoreName(list[0].name);
        }
      });
  }, [presetStore]);

  // Pre-fill user info
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name,phone,address").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setName(prev => prev || data.name || "");
          setPhone(prev => prev || data.phone || "");
          setAddress(prev => prev || data.address || "");
        }
      });
  }, [user]);

  const handleStoreChange = (val: string) => {
    setStoreId(val);
    const s = stores.find(x => x.id === val);
    setStoreName(s?.name ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return toast.error("Please select a store");
    if (!description.trim()) return toast.error("Please describe what you need");
    if (!name.trim() || !phone.trim() || !address.trim())
      return toast.error("Please fill your name, phone, and address");

    setSubmitting(true);
    const { data, error } = await supabase.from("custom_orders").insert({
      customer_id: user?.id ?? null,
      store_id: storeId,
      store_name: storeName,
      description: description.trim(),
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      customer_address: address.trim(),
    }).select("short_id").single();

    setSubmitting(false);
    if (error) return toast.error(error.message);
    setShortId(data?.short_id ?? "");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-xl font-extrabold">Request Submitted!</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Your custom order <span className="font-bold text-foreground">{shortId}</span> has been sent to <span className="font-bold text-foreground">{storeName}</span>.
          The admin will review it and set a delivery fee shortly.
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          آپ کا آرڈر موصول ہو گیا ہے۔ ڈیلیوری چارجز ایڈمن طے کریں گے۔
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-4">
          <Button onClick={() => navigate("/")}>Back to Home</Button>
          <Button variant="outline" onClick={() => { setSubmitted(false); setDescription(""); }}>Submit Another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-bold leading-tight">Custom Order</h1>
          <p className="text-[11px] text-muted-foreground">Order anything — even if it's not listed</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5 p-4">
        {/* Explainer banner */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Kuch bhi mangwain / کچھ بھی منگوائیں</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Jo cheez store mein nahi / جو چیز سٹور میں نہیں — woh bhi order kar saktay hain.
                Delivery charges <span className="font-semibold text-foreground">admin decide karay ga</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Store select */}
        <div className="space-y-1.5">
          <Label>Select Store / سٹور چنیں</Label>
          <Select value={storeId} onValueChange={handleStoreChange}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Choose a store…" />
            </SelectTrigger>
            <SelectContent>
              {stores.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description with animated placeholder */}
        <div className="space-y-1.5">
          <Label>What do you need? / آپ کو کیا چاہیے؟</Label>
          <div className="relative">
            <Textarea
              rows={5}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="rounded-xl resize-none"
              placeholder=" "
            />
            {!description && (
              <p
                className={`pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground leading-relaxed transition-opacity duration-400 ${phVisible ? "opacity-100" : "opacity-0"}`}
                style={{ transition: "opacity 0.4s" }}
              >
                {PLACEHOLDERS[phIdx]}
              </p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Urdu, Roman Urdu, or English — any language is fine ✓
          </p>
        </div>

        {/* Delivery info */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            ⚠️ Delivery charges will be decided by admin · ڈیلیوری چارجز ایڈمن طے کریں گے
          </p>
          <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400">
            This is a single-store request. Multi-store custom orders are not supported.
            <br />یہ صرف ایک سٹور کے لیے ہے۔ کثیر سٹور آرڈر قابل قبول نہیں۔
          </p>
        </div>

        {/* Contact details */}
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Details / آپ کی معلومات</p>
          <div className="space-y-1.5">
            <Label htmlFor="co-name">Name / نام</Label>
            <Input id="co-name" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="co-phone">Phone / فون</Label>
            <Input id="co-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="co-address">Address / پتہ</Label>
            <Textarea id="co-address" rows={2} value={address} onChange={e => setAddress(e.target.value)} className="rounded-xl resize-none" />
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="h-14 w-full rounded-full text-base shadow-lg">
          {submitting ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Submitting…</>
          ) : (
            "Submit Custom Order / آرڈر بھیجیں"
          )}
        </Button>
      </form>
    </div>
  );
}
