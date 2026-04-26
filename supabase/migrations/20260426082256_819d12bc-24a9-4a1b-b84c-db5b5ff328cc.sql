
-- Restrict bucket LISTING while keeping individual files publicly readable by URL.
-- Public read happens via the storage CDN endpoint regardless of these policies for files;
-- the LIST operation is what the linter flags.

DROP POLICY IF EXISTS "Public reads store images" ON storage.objects;
DROP POLICY IF EXISTS "Public reads product images" ON storage.objects;

-- Allow reads only when fetching by exact object name (no broad listing).
-- The Supabase public CDN endpoint (`/storage/v1/object/public/...`) bypasses these
-- policies for objects in public buckets, so images still load in the app.
-- Admins retain full read for management UI.
CREATE POLICY "Admins read store images" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
