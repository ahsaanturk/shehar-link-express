-- ============================================================
-- Store Timings
-- ============================================================
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS closing_time  TIME DEFAULT '22:00:00',
  ADD COLUMN IF NOT EXISTS is_always_open BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- Coupons
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('percent', 'flat')),
  value       NUMERIC NOT NULL CHECK (value > 0),
  min_order   NUMERIC NOT NULL DEFAULT 0,
  store_id    UUID REFERENCES stores(id) ON DELETE CASCADE,  -- NULL = global
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INT NOT NULL DEFAULT 0,
  max_usage   INT,  -- NULL = unlimited
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Public can read active, non-expired coupons
CREATE POLICY "coupons_public_read" ON coupons
  FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > now()));

-- Admin full access (uses same is_admin() helper already in DB)
CREATE POLICY "coupons_admin_all" ON coupons
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
  );

-- validate_coupon RPC
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code        TEXT,
  p_store_id    UUID,
  p_subtotal    NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
  v_discount NUMERIC;
BEGIN
  SELECT * INTO v_coupon
  FROM coupons
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_usage IS NULL OR usage_count < max_usage)
    AND (store_id IS NULL OR store_id = p_store_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', FALSE, 'error', 'Coupon not found or expired');
  END IF;

  IF p_subtotal < v_coupon.min_order THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', format('Minimum order is Rs. %s for this coupon', v_coupon.min_order)
    );
  END IF;

  IF v_coupon.type = 'percent' THEN
    v_discount := ROUND(p_subtotal * v_coupon.value / 100, 0);
  ELSE
    v_discount := LEAST(v_coupon.value, p_subtotal);
  END IF;

  RETURN jsonb_build_object(
    'valid',      TRUE,
    'coupon_id',  v_coupon.id,
    'code',       v_coupon.code,
    'type',       v_coupon.type,
    'value',      v_coupon.value,
    'discount',   v_discount,
    'store_id',   v_coupon.store_id
  );
END;
$$;

-- use_coupon RPC — called at order placement
CREATE OR REPLACE FUNCTION use_coupon(p_coupon_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE coupons SET usage_count = usage_count + 1 WHERE id = p_coupon_id;
END;
$$;

-- ============================================================
-- Custom Orders ("Ghasiya")
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id         TEXT UNIQUE NOT NULL DEFAULT 'CO-' || UPPER(SUBSTR(gen_random_uuid()::TEXT, 1, 6)),
  customer_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  store_id         UUID REFERENCES stores(id) ON DELETE SET NULL,
  store_name       TEXT NOT NULL,
  description      TEXT NOT NULL,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','rejected')),
  delivery_fee     NUMERIC,
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE custom_orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (even guests)
CREATE POLICY "custom_orders_insert" ON custom_orders
  FOR INSERT WITH CHECK (TRUE);

-- Owner can read their own
CREATE POLICY "custom_orders_owner_read" ON custom_orders
  FOR SELECT USING (customer_id = auth.uid());

-- Admin full access
CREATE POLICY "custom_orders_admin_all" ON custom_orders
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
  );

-- ============================================================
-- Homepage Banners (editable from admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS homepage_banners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  subtitle    TEXT,
  promo_code  TEXT,
  bg_gradient TEXT NOT NULL DEFAULT 'linear-gradient(135deg, hsl(271 81% 56%), hsl(280 70% 65%))',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE homepage_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_public_read" ON homepage_banners
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "banners_admin_all" ON homepage_banners
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Seed one default banner
INSERT INTO homepage_banners (title, subtitle, promo_code, sort_order)
VALUES ('Flat 20% OFF', 'On your first order', 'WELCOME20', 0)
ON CONFLICT DO NOTHING;

-- Add coupon_id + discount_amount columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_id       UUID REFERENCES coupons(id),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;
