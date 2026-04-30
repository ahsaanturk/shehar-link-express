import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReviewStars } from "@/components/ReviewStars";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquarePlus } from "lucide-react";

interface ReviewFormProps {
  storeId?: string;
  productId?: string;
  orderId: string;
  onSubmitted: () => void;
}

export const ReviewForm = ({ storeId, productId, orderId, onSubmitted }: ReviewFormProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!user) return null;

  const submit = async () => {
    if (rating === 0) return toast.error("Please select a rating");
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      store_id: storeId ?? null,
      product_id: productId ?? null,
      order_id: orderId,
      rating,
      comment: comment.trim() || null,
    } as any);
    setSubmitting(false);
    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        toast.error("You've already reviewed this item for this order");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Review submitted! Thanks for your feedback.");
    setRating(0);
    setComment("");
    setExpanded(false);
    onSubmitted();
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition hover:bg-primary/10 active:scale-[0.98]"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Write a review
      </button>
    );
  }

  return (
    <Card className="space-y-3 border-primary/20 p-4">
      <p className="text-sm font-semibold">Your Rating</p>
      <ReviewStars rating={rating} size="lg" interactive onChange={setRating} />
      <Textarea
        placeholder="Share your experience (optional)…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="resize-none"
      />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={submitting || rating === 0} size="sm">
          {submitting ? "Submitting…" : "Submit Review"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
};
