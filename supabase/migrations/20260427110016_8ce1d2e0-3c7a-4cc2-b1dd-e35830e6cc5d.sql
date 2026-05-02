
-- 1. Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS credit_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. Password reset OTPs
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  user_id uuid,
  otp text NOT NULL,
  new_password_hash text,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX IF NOT EXISTS idx_otps_phone ON public.password_reset_otps(phone);

ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request OTP"
  ON public.password_reset_otps FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view OTPs"
  ON public.password_reset_otps FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage OTPs"
  ON public.password_reset_otps FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete OTPs"
  ON public.password_reset_otps FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Update handle_new_user to save whatsapp + address
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, whatsapp, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    whatsapp = EXCLUDED.whatsapp,
    address = EXCLUDED.address;

  INSERT INTO public.user_roles (user_id, role) 
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Credit-score trigger on orders
CREATE OR REPLACE FUNCTION public.adjust_credit_on_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delivered_count int;
  user_phone text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- delivered
    IF NEW.status = 'delivered' THEN
      SELECT COUNT(*) INTO delivered_count
        FROM public.orders
        WHERE customer_id = NEW.customer_id AND status = 'delivered' AND id <> NEW.id;
      IF delivered_count = 0 THEN
        UPDATE public.profiles
          SET credit_score = GREATEST(credit_score, 0) + 150,
              is_verified = true,
              phone_verified_at = COALESCE(phone_verified_at, now())
          WHERE id = NEW.customer_id;
        -- delete fake unverified accounts sharing same phone
        SELECT phone INTO user_phone FROM public.profiles WHERE id = NEW.customer_id;
        IF user_phone IS NOT NULL AND length(user_phone) > 0 THEN
          DELETE FROM auth.users
            WHERE id IN (
              SELECT id FROM public.profiles
              WHERE phone = user_phone AND is_verified = false AND id <> NEW.customer_id
            );
        END IF;
      ELSE
        UPDATE public.profiles
          SET credit_score = credit_score + 20
          WHERE id = NEW.customer_id;
      END IF;
    -- cancelled after pickup
    ELSIF NEW.status = 'cancelled' AND OLD.status IN ('picked_up','out_for_delivery','ready') THEN
      UPDATE public.profiles
        SET credit_score = credit_score - 200
        WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_adjust_credit_on_order_change ON public.orders;
CREATE TRIGGER trg_adjust_credit_on_order_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.adjust_credit_on_order_change();
