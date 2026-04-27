import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Bell, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Item {
  id: string;
  title: string;
  body: string;
  link: string | null;
  image_url: string | null;
  created_at: string;
}

const AdminNotifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("broadcast_notifications")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Item[]);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("broadcast_notifications").insert({
      title: title.trim(),
      body: body.trim(),
      link: link.trim() || null,
      image_url: imageUrl.trim() || null,
      created_by: user?.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Notification sent to all users");
    setTitle(""); setBody(""); setLink(""); setImageUrl("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("broadcast_notifications").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" /> New Notification</h2>
        <div className="space-y-1">
          <Label htmlFor="t">Title</Label>
          <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Eid sale starts now!" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="b">Message</Label>
          <Textarea id="b" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" rows={3} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="l">Link (optional)</Label>
          <Input id="l" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/categories or https://…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="i">Image URL (optional)</Label>
          <Input id="i" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </div>
        <Button onClick={submit} disabled={saving} className="w-full">
          {saving ? "Sending…" : "Send to all users"}
        </Button>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Sent ({items.length})</h2>
        {items.length === 0 && (
          <Card className="flex flex-col items-center gap-2 p-6 text-center">
            <Bell className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
          </Card>
        )}
        {items.map((it) => (
          <Card key={it.id} className="flex gap-3 p-3">
            {it.image_url && (
              <img src={it.image_url} alt={it.title} className="h-14 w-14 rounded object-cover" />
            )}
            <div className="flex-1">
              <p className="font-medium">{it.title}</p>
              <p className="text-sm text-muted-foreground">{it.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(it.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminNotifications;
