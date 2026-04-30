-- This script can be run directly in Supabase SQL Editor
-- to give super admin access to phone number 03443625744

-- Step 1: Create or update the user role table entry when user signs up with that phone
-- (This is handled by trigger in 20260430120000_super_admin_setup.sql)

-- Step 2: For any existing profile with that phone, assign super_admin role:
DO $$
DECLARE
  profile_id uuid;
BEGIN
  SELECT id INTO profile_id FROM public.profiles 
  WHERE phone = '03443625744' LIMIT 1;
  
  IF profile_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = profile_id;
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (profile_id, 'super_admin');
  END IF;
END $$;
