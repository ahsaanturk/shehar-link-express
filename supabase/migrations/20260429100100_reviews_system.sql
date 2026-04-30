CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_verified_purchase boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS reviews_store_id_idx ON public.reviews(store_id);
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON public.reviews(product_id);

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for their purchases" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check if user is eligible to review
CREATE OR REPLACE FUNCTION public.can_user_review(p_user_id uuid, p_store_id uuid, p_product_id uuid DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  -- If product_id is null, check if user bought anything from this store
  IF p_product_id IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.orders 
      WHERE user_id = p_user_id 
      AND store_id = p_store_id 
      AND status = 'delivered'
    );
  ELSE
    -- Check if user bought this specific product
    RETURN EXISTS (
      SELECT 1 FROM public.orders 
      WHERE user_id = p_user_id 
      AND store_id = p_store_id 
      AND status = 'delivered'
      -- Search for product_id in the items JSONB array
      AND items @> jsonb_build_array(jsonb_build_object('id', p_product_id))
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
