-- ========== REVIEWS TABLE ==========
-- A user can review a store or a product, but ONLY if they have
-- a DELIVERED order containing that product / from that store.

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- A user can review a given store once per order
  -- A user can review a given product once per order
  CONSTRAINT reviews_unique_store UNIQUE (user_id, store_id, order_id),
  CONSTRAINT reviews_unique_product UNIQUE (user_id, product_id, order_id),

  -- Must target either a store or a product (or both)
  CONSTRAINT reviews_target_check CHECK (store_id IS NOT NULL OR product_id IS NOT NULL)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reviews_store ON public.reviews(store_id) WHERE store_id IS NOT NULL;
CREATE INDEX idx_reviews_product ON public.reviews(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_reviews_user ON public.reviews(user_id);

-- Trigger for updated_at
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== RLS POLICIES ==========

-- Anyone can read reviews (public social proof)
CREATE POLICY "Anyone views reviews" ON public.reviews
  FOR SELECT USING (true);

-- Users can create reviews for their own delivered orders
CREATE POLICY "Users create own reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.customer_id = auth.uid()
        AND o.status = 'delivered'
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews, admins can delete any
CREATE POLICY "Users delete own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Admins can manage all reviews
CREATE POLICY "Admins manage reviews" ON public.reviews
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== COMPUTED AVERAGE VIEWS ==========
-- We create SQL functions that compute averages on the fly.
-- For a small-to-medium scale app this is efficient and always accurate.

CREATE OR REPLACE FUNCTION public.store_avg_rating(_store_id uuid)
RETURNS TABLE(avg_rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating,
    COUNT(*) AS review_count
  FROM public.reviews
  WHERE store_id = _store_id;
$$;

CREATE OR REPLACE FUNCTION public.product_avg_rating(_product_id uuid)
RETURNS TABLE(avg_rating numeric, review_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating,
    COUNT(*) AS review_count
  FROM public.reviews
  WHERE product_id = _product_id;
$$;

-- ========== ANALYTICS HELPERS ==========

-- Daily order stats for the past N days
CREATE OR REPLACE FUNCTION public.admin_daily_stats(_days int DEFAULT 30)
RETURNS TABLE(
  day date,
  order_count bigint,
  revenue numeric,
  delivered_count bigint,
  cancelled_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    d.day::date,
    COUNT(o.id) AS order_count,
    COALESCE(SUM(o.total_amount), 0) AS revenue,
    COUNT(*) FILTER (WHERE o.status = 'delivered') AS delivered_count,
    COUNT(*) FILTER (WHERE o.status = 'cancelled') AS cancelled_count
  FROM generate_series(
    (now() - (_days || ' days')::interval)::date,
    now()::date,
    '1 day'
  ) AS d(day)
  LEFT JOIN public.orders o ON o.created_at::date = d.day
  GROUP BY d.day
  ORDER BY d.day;
$$;

-- Top stores by revenue
CREATE OR REPLACE FUNCTION public.admin_top_stores(_limit int DEFAULT 10)
RETURNS TABLE(
  store_id uuid,
  store_name text,
  order_count bigint,
  total_revenue numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    s.id AS store_id,
    s.name AS store_name,
    COUNT(o.id) AS order_count,
    COALESCE(SUM(o.total_amount), 0) AS total_revenue
  FROM public.stores s
  LEFT JOIN public.orders o ON o.store_id = s.id AND o.status = 'delivered'
  GROUP BY s.id, s.name
  ORDER BY total_revenue DESC
  LIMIT _limit;
$$;
