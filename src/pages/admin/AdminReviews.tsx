import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewStars } from "@/components/ReviewStars";
import { ArrowLeft, Trash2, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ReviewRow {
  id: string;
  user_id: string;
  store_id: string | null;
  product_id: string | null;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name?: string;
  target_name?: string;
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const list = (data ?? []) as ReviewRow[];

    // Fetch user names
    const userIds = [...new Set(list.map((r) => r.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id,name").in("id", userIds);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.name ?? "User"; });
      list.forEach((r) => { r.user_name = nameMap[r.user_id] ?? "User"; });
    }

    // Fetch store/product names
    const storeIds = [...new Set(list.filter(r => r.store_id).map(r => r.store_id!))];
    const productIds = [...new Set(list.filter(r => r.product_id).map(r => r.product_id!))];
    const storeMap: Record<string, string> = {};
    const productMap: Record<string, string> = {};

    if (storeIds.length > 0) {
      const { data: stores } = await supabase.from("stores").select("id,name").in("id", storeIds);
      (stores ?? []).forEach((s: any) => { storeMap[s.id] = s.name; });
    }
    if (productIds.length > 0) {
      const { data: products } = await supabase.from("products").select("id,name").in("id", productIds);
      (products ?? []).forEach((p: any) => { productMap[p.id] = p.name; });
    }

    list.forEach((r) => {
      if (r.product_id && productMap[r.product_id]) {
        r.target_name = `Product: ${productMap[r.product_id]}`;
      } else if (r.store_id && storeMap[r.store_id]) {
        r.target_name = `Store: ${storeMap[r.store_id]}`;
      }
    });

    setReviews(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setReviews((p) => p.filter((r) => r.id !== id));
    toast.success("Review deleted");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-xl font-bold">Reviews ({reviews.length})</h1>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : reviews.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No reviews yet.</Card>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{r.user_name}</p>
                    <ReviewStars rating={r.rating} size="sm" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(r.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {r.target_name && (
                <p className="mt-1 text-[10px] font-semibold text-primary">{r.target_name}</p>
              )}
              {r.comment && (
                <p className="mt-1.5 text-xs text-muted-foreground">{r.comment}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
