import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewStarsProps {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
  count?: number;
}

const SIZES = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export const ReviewStars = ({
  rating,
  max = 5,
  size = "sm",
  interactive = false,
  onChange,
  showValue = false,
  count,
}: ReviewStarsProps) => {
  const starSize = SIZES[size];

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const filled = starValue <= rating;
          const halfFilled = !filled && starValue - 0.5 <= rating;

          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange?.(starValue)}
              onMouseEnter={undefined}
              className={cn(
                "transition-transform",
                interactive
                  ? "cursor-pointer hover:scale-125 active:scale-95"
                  : "cursor-default",
              )}
              aria-label={`${starValue} star${starValue !== 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  starSize,
                  filled
                    ? "fill-yellow-400 text-yellow-400"
                    : halfFilled
                      ? "fill-yellow-400/50 text-yellow-400"
                      : "fill-transparent text-muted-foreground/40",
                )}
              />
            </button>
          );
        })}
      </div>
      {showValue && rating > 0 && (
        <span className="text-xs font-semibold text-foreground">{rating.toFixed(1)}</span>
      )}
      {count !== undefined && count > 0 && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
};
