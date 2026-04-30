-- RPC for Daily Stats (30 days)
DROP FUNCTION IF EXISTS public.admin_daily_stats(_days integer);

CREATE FUNCTION public.admin_daily_stats(_days integer)
RETURNS TABLE(day date, order_count bigint, revenue numeric, delivered_count bigint, cancelled_count bigint) AS $$
BEGIN
  RETURN QUERY
  WITH day_series AS (
    SELECT generate_series(CURRENT_DATE - (_days - 1) * INTERVAL '1 day', CURRENT_DATE, '1 day')::date AS d
  )
  SELECT 
    ds.d as day,
    COUNT(o.id)::bigint as order_count,
    COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0)::numeric as revenue,
    COUNT(o.id) FILTER (WHERE o.status = 'delivered')::bigint as delivered_count,
    COUNT(o.id) FILTER (WHERE o.status = 'cancelled')::bigint as cancelled_count
  FROM day_series ds
  LEFT JOIN public.orders o ON o.created_at::date = ds.d
  GROUP BY ds.d
  ORDER BY ds.d ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for Top Stores
DROP FUNCTION IF EXISTS public.admin_top_stores(_limit integer);

CREATE FUNCTION public.admin_top_stores(_limit integer)
RETURNS TABLE(store_id uuid, store_name text, order_count bigint, total_revenue numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.store_id,
    s.name as store_name,
    COUNT(o.id)::bigint as order_count,
    SUM(o.total_amount)::numeric as total_revenue
  FROM public.orders o
  JOIN public.stores s ON s.id = o.store_id
  WHERE o.status = 'delivered'
  GROUP BY o.store_id, s.name
  ORDER BY total_revenue DESC
  LIMIT _limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
