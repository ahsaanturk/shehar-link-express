import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Review {
  id: string;
  user_id: string;
  store_id: string | null;
  product_id: string | null;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name?: string;
}

export interface RatingStats {
  avg: number;
  count: number;
}

/** Fetch average rating for a store */
export const useStoreRating = (storeId: string | null) => {
  const [stats, setStats] = useState<RatingStats>({ avg: 0, count: 0 });

  useEffect(() => {
    if (!storeId) return;
    supabase.rpc("store_avg_rating", { _store_id: storeId }).then(({ data }) => {
      if (data && data.length > 0) {
        setStats({ avg: Number(data[0].avg_rating), count: Number(data[0].review_count) });
      }
    });
  }, [storeId]);

  return stats;
};

/** Fetch average rating for a product */
export const useProductRating = (productId: string | null) => {
  const [stats, setStats] = useState<RatingStats>({ avg: 0, count: 0 });

  useEffect(() => {
    if (!productId) return;
    supabase.rpc("product_avg_rating", { _product_id: productId }).then(({ data }) => {
      if (data && data.length > 0) {
        setStats({ avg: Number(data[0].avg_rating), count: Number(data[0].review_count) });
      }
    });
  }, [productId]);

  return stats;
};

/** Fetch reviews list for a store or product */
export const useReviews = (target: { storeId?: string; productId?: string }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState<{ orderId: string; storeName?: string }[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);

    // Fetch reviews
    let q = supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(50);
    if (target.storeId) q = q.eq("store_id", target.storeId);
    if (target.productId) q = q.eq("product_id", target.productId);
    const { data: revs } = await q;
    const reviewList = (revs ?? []) as Review[];

    // Fetch user names for reviews
    const userIds = [...new Set(reviewList.map((r) => r.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,name")
        .in("id", userIds);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { nameMap[p.id] = p.name ?? "User"; });
      reviewList.forEach((r) => { r.user_name = nameMap[r.user_id] ?? "User"; });
    }

    setReviews(reviewList);

    // Check if current user has delivered orders they haven't reviewed yet
    if (user) {
      let orderQ = supabase.from("orders").select("id,store_id").eq("customer_id", user.id).eq("status", "delivered");
      if (target.storeId) orderQ = orderQ.eq("store_id", target.storeId);
      const { data: orders } = await orderQ;

      if (orders && orders.length > 0) {
        // Get user's existing reviews
        let existQ = supabase.from("reviews").select("order_id,store_id,product_id").eq("user_id", user.id);
        if (target.storeId) existQ = existQ.eq("store_id", target.storeId);
        if (target.productId) existQ = existQ.eq("product_id", target.productId);
        const { data: existing } = await existQ;

        const existingSet = new Set(
          (existing ?? []).map((e: any) =>
            target.productId
              ? `${e.order_id}:${e.product_id}`
              : `${e.order_id}:${e.store_id}`,
          ),
        );

        // For product reviews, also verify the product's store matches the order's store
        const eligible: { orderId: string }[] = [];
        for (const o of orders as any[]) {
          const key = target.productId
            ? `${o.id}:${target.productId}`
            : `${o.id}:${target.storeId}`;
          if (!existingSet.has(key)) {
            // For product reviews, check if the product's store matches the order
            if (target.productId) {
              const { data: prod } = await supabase.from("products").select("store_id").eq("id", target.productId).maybeSingle();
              if (prod && prod.store_id === o.store_id) {
                eligible.push({ orderId: o.id });
              }
            } else {
              eligible.push({ orderId: o.id });
            }
          }
        }
        setCanReview(eligible);
      } else {
        setCanReview([]);
      }
    }
    setLoading(false);
  }, [target.storeId, target.productId, user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { reviews, loading, canReview, refresh };
};
