-- Function to assign super admin role to a specific phone
CREATE OR REPLACE FUNCTION public.assign_super_admin_role(phone_number text)
RETURNS void AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Find user by phone
  SELECT id INTO user_id FROM auth.users
  WHERE email = phone_number || '@sheharlink.local'
  LIMIT 1;
  
  IF user_id IS NOT NULL THEN
    -- Delete existing roles for this user
    DELETE FROM public.user_roles WHERE user_id = user_id;
    
    -- Insert super_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-assign super_admin to specific phone on profile creation
CREATE OR REPLACE FUNCTION public.auto_assign_super_admin_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone = '03443625744' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_assign_super_admin ON public.profiles;

CREATE TRIGGER trg_auto_assign_super_admin
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_super_admin_trigger();
