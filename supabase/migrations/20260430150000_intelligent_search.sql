-- Enable the pg_trgm extension for similarity functions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Search Categories RPC
CREATE OR REPLACE FUNCTION search_categories(search_term text, page_limit int DEFAULT 5)
RETURNS SETOF categories AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM categories
  WHERE is_visible = true
    AND (
      name ILIKE '%' || search_term || '%' 
      OR similarity(name, search_term) > 0.1
    )
  ORDER BY
    CASE
      WHEN name ILIKE search_term THEN 0
      WHEN name ILIKE search_term || ' %' THEN 1
      WHEN name ILIKE search_term || '%' THEN 2
      WHEN name ILIKE '%' || search_term || '%' THEN 3
      ELSE 4
    END,
    similarity(name, search_term) DESC
  LIMIT page_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Search Stores RPC
-- Optionally filter by area_id if provided
CREATE OR REPLACE FUNCTION search_stores(search_term text, search_area uuid DEFAULT NULL, page_limit int DEFAULT 5)
RETURNS SETOF stores AS $$
BEGIN
  RETURN QUERY
  SELECT s.* FROM stores s
  LEFT JOIN store_areas sa ON s.id = sa.store_id
  WHERE s.is_active = true
    AND s.is_visible = true
    AND (search_area IS NULL OR sa.area_id = search_area)
    AND (
      s.name ILIKE '%' || search_term || '%' 
      OR similarity(s.name, search_term) > 0.1
    )
  ORDER BY
    CASE
      WHEN s.name ILIKE search_term THEN 0
      WHEN s.name ILIKE search_term || ' %' THEN 1
      WHEN s.name ILIKE search_term || '%' THEN 2
      WHEN s.name ILIKE '%' || search_term || '%' THEN 3
      ELSE 4
    END,
    similarity(s.name, search_term) DESC
  LIMIT page_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Search Products RPC
-- Optionally filter by store_areas area_id if provided
CREATE OR REPLACE FUNCTION search_products(search_term text, search_area uuid DEFAULT NULL, page_offset int DEFAULT 0, page_limit int DEFAULT 20)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  store_id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  is_available boolean,
  is_popular boolean,
  sort_order integer,
  slug text,
  is_visible boolean,
  category_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.* FROM products p
  INNER JOIN stores s ON p.store_id = s.id
  LEFT JOIN store_areas sa ON s.id = sa.store_id
  WHERE p.is_available = true
    AND p.is_visible = true
    AND s.is_active = true
    AND (search_area IS NULL OR sa.area_id = search_area)
    AND (
      p.name ILIKE '%' || search_term || '%' 
      OR similarity(p.name, search_term) > 0.1
    )
  ORDER BY
    CASE
      WHEN p.name ILIKE search_term THEN 0
      WHEN p.name ILIKE search_term || ' %' THEN 1
      WHEN p.name ILIKE search_term || '%' THEN 2
      WHEN p.name ILIKE '%' || search_term || '%' THEN 3
      ELSE 4
    END,
    similarity(p.name, search_term) DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$ LANGUAGE plpgsql STABLE;
