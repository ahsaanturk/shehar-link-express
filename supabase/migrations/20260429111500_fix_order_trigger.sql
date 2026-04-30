
-- 1. Add missing values to the enum to prevent casting errors in triggers
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready';

-- 2. Update the trigger function to use the correct statuses
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
    -- cancelled after pickup or while preparing
    ELSIF NEW.status = 'cancelled' AND OLD.status IN ('picked_up', 'preparing', 'ready', 'out_for_delivery') THEN
      UPDATE public.profiles
        SET credit_score = credit_score - 200
        WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
