-- ========== SLUGS + SEO on stores/products/categories ==========
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text,
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text,
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text;

-- backfill slugs from name
UPDATE public.stores SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) WHERE slug IS NULL;
UPDATE public.products SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) WHERE slug IS NULL;

-- unique constraints (store slug global, product slug per-store)
CREATE UNIQUE INDEX IF NOT EXISTS stores_slug_unique ON public.stores(slug);
CREATE UNIQUE INDEX IF NOT EXISTS products_store_slug_unique ON public.products(store_id, slug);

ALTER TABLE public.stores ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;

-- reserved slugs table
CREATE TABLE IF NOT EXISTS public.reserved_slugs (
  slug text PRIMARY KEY
);
INSERT INTO public.reserved_slugs(slug) VALUES
 ('admin'),('auth'),('cart'),('orders'),('order'),('profile'),('favorites'),
 ('notifications'),('collections'),('category'),('categories'),('store'),
 ('stores'),('product'),('products'),('search'),('settings'),('login'),
 ('signup'),('logout'),('api'),('public'),('assets'),('static')
ON CONFLICT DO NOTHING;
ALTER TABLE public.reserved_slugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads reserved slugs" ON public.reserved_slugs FOR SELECT USING (true);

-- ========== STORE <-> CATEGORIES many-to-many ==========
CREATE TABLE IF NOT EXISTS public.store_categories (
  store_id uuid NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, category_id)
);
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views store categories" ON public.store_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage store categories" ON public.store_categories FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- migrate existing single category_id into the M2M
INSERT INTO public.store_categories(store_id, category_id)
SELECT id, category_id FROM public.stores WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ========== DELIVERY TIERS ==========
CREATE TABLE IF NOT EXISTS public.delivery_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  near_count int NOT NULL DEFAULT 0,
  away_count int NOT NULL DEFAULT 0,
  price numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(near_count, away_count)
);
ALTER TABLE public.delivery_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active tiers" ON public.delivery_tiers FOR SELECT
  USING (is_active = true OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage tiers" ON public.delivery_tiers FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.delivery_tiers(label, near_count, away_count, price, sort_order) VALUES
 ('1 near store', 1, 0, 100, 1),
 ('2 near stores', 2, 0, 150, 2),
 ('3+ near stores', 3, 0, 200, 3),
 ('1 away store', 0, 1, 150, 4),
 ('1 near + 1 away', 1, 1, 200, 5)
ON CONFLICT DO NOTHING;

CREATE TRIGGER trg_delivery_tiers_updated
  BEFORE UPDATE ON public.delivery_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== ORDERS: cancel reason + tier ==========
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS delivery_tier_label text;

-- allow customers to update their own pending orders (for cancellation)
DROP POLICY IF EXISTS "Customers cancel own pending" ON public.orders;
CREATE POLICY "Customers cancel own pending" ON public.orders FOR UPDATE
  USING (auth.uid() = customer_id AND status = 'pending')
  WITH CHECK (auth.uid() = customer_id);

-- ========== OTP throttle: function returns existing OTP if within 2 min window ==========
CREATE OR REPLACE FUNCTION public.request_otp(_phone text)
RETURNS TABLE(otp text, expires_at timestamptz, throttled boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid;
  existing record;
  new_otp text;
BEGIN
  SELECT id INTO uid FROM public.profiles WHERE phone = _phone LIMIT 1;
  IF uid IS NULL THEN RAISE EXCEPTION 'no_account'; END IF;

  -- find unexpired unused OTP
  SELECT * INTO existing FROM public.password_reset_otps
   WHERE user_id = uid AND used = false AND expires_at > now()
   ORDER BY created_at DESC LIMIT 1;

  IF existing.id IS NOT NULL THEN
    RETURN QUERY SELECT existing.otp, existing.expires_at, true;
    RETURN;
  END IF;

  -- check 2-min throttle on any OTP creation (even expired)
  IF EXISTS (
    SELECT 1 FROM public.password_reset_otps
     WHERE user_id = uid AND created_at > now() - interval '2 minutes'
  ) THEN
    SELECT * INTO existing FROM public.password_reset_otps
     WHERE user_id = uid ORDER BY created_at DESC LIMIT 1;
    RETURN QUERY SELECT existing.otp, existing.expires_at, true;
    RETURN;
  END IF;

  new_otp := lpad((floor(random()*1000000))::int::text, 6, '0');
  INSERT INTO public.password_reset_otps(phone, user_id, otp, expires_at)
   VALUES (_phone, uid, new_otp, now() + interval '10 minutes');
  RETURN QUERY SELECT new_otp, now() + interval '10 minutes', false;
END;
$$;

-- ========== PROFILES: prevent phone change after verification ==========
CREATE OR REPLACE FUNCTION public.enforce_phone_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.is_verified = true AND OLD.phone IS DISTINCT FROM NEW.phone THEN
    -- only admins may change a verified phone
    IF NOT has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'phone_locked: verified phone cannot be changed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_phone_lock ON public.profiles;
CREATE TRIGGER trg_phone_lock BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_phone_lock();

-- ========== Helper: slug availability check ==========
CREATE OR REPLACE FUNCTION public.is_slug_available(_slug text, _exclude_store_id uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS(SELECT 1 FROM public.reserved_slugs WHERE slug = lower(_slug))
     AND NOT EXISTS(SELECT 1 FROM public.stores WHERE slug = lower(_slug) AND (_exclude_store_id IS NULL OR id <> _exclude_store_id));
$$;