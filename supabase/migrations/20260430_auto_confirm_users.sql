-- Auto-confirm users on signup (phone-based auth, no email verification needed)
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{phone_verified}',
        'true'::jsonb
      )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (to avoid errors on rerun)
DROP TRIGGER IF EXISTS trg_auto_confirm_user ON auth.users;

-- Create trigger that runs on new user creation
CREATE TRIGGER trg_auto_confirm_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_user();
