import { ReviewStars } from "@/components/ReviewStars";
import { ReviewForm } from "@/components/ReviewForm";
import { useReviews, type Review } from "@/hooks/useReviews";
import { formatDistanceToNow } from "date-fns";
import { User, ShieldCheck } from "lucide-react";

interface ReviewSectionProps {
  storeId?: string;
  productId?: string;
  avgRating: number;
  reviewCount: number;
}

export const ReviewSection = ({ storeId, productId, avgRating, reviewCount }: ReviewSectionProps) => {
  const { reviews, loading, canReview, refresh } = useReviews({ storeId, productId });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold">Reviews</h2>
          {reviewCount > 0 && (
            <div className="mt-0.5 flex items-center gap-1.5">
              <ReviewStars rating={avgRating} size="sm" showValue />
              <span className="text-xs text-muted-foreground">
                {reviewCount} review{reviewCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Review forms for eligible orders */}
      {canReview.length > 0 && (
        <div className="space-y-2">
          {canReview.map((cr) => (
            <ReviewForm
              key={cr.orderId}
              storeId={storeId}
              productId={productId}
              orderId={cr.orderId}
              onSubmitted={refresh}
            />
          ))}
        </div>
      )}

      {/* Review list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No reviews yet.{" "}
          {canReview.length > 0 ? "Be the first to leave one!" : "Purchase to leave a review."}
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </section>
  );
};

const ReviewCard = ({ review }: { review: Review }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <User className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold">{review.user_name ?? "User"}</p>
            <ShieldCheck className="h-3 w-3 text-primary" title="Verified purchase" />
          </div>
          <ReviewStars rating={review.rating} size="sm" />
        </div>
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
      </span>
    </div>
    {review.comment && (
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{review.comment}</p>
    )}
  </div>
);
