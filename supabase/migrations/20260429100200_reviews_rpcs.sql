-- RPC for Store Average Rating
CREATE OR REPLACE FUNCTION public.store_avg_rating(_store_id uuid)
RETURNS TABLE(avg_rating numeric, review_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(rating), 0)::numeric as avg_rating,
    COUNT(*)::bigint as review_count
  FROM public.reviews
  WHERE store_id = _store_id AND product_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for Product Average Rating
CREATE OR REPLACE FUNCTION public.product_avg_rating(_product_id uuid)
RETURNS TABLE(avg_rating numeric, review_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(rating), 0)::numeric as avg_rating,
    COUNT(*)::bigint as review_count
  FROM public.reviews
  WHERE product_id = _product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
