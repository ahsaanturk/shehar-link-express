-- Add super admin access to phone number 03466090106
CREATE OR REPLACE FUNCTION public.auto_assign_super_admin_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IN ('03443625744', '03455957281', '03466090106') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
