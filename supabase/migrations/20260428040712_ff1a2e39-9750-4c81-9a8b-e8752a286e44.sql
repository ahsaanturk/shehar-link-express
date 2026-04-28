-- Allow super_admin to manage user_roles via existing has_role check
-- (existing policy already covers admin; add explicit super_admin too)
CREATE POLICY "Super admins manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Allow super_admin to view all profiles (for the user-management UI)
CREATE POLICY "Super admins view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed super_admin role for the user with phone 03443625744 (if exists)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM public.profiles
WHERE phone = '03443625744'
ON CONFLICT DO NOTHING;

-- Also grant admin role for full app access
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE phone = '03443625744'
ON CONFLICT DO NOTHING;
