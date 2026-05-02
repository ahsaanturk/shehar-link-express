ALTER TABLE homepage_banners ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Banner Images Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('banner-images', 'banner-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public reads banner images" ON storage.objects
  FOR SELECT USING (bucket_id = 'banner-images');
CREATE POLICY "Admins upload banner images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'banner-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update banner images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'banner-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete banner images" ON storage.objects
  FOR DELETE USING (bucket_id = 'banner-images' AND public.has_role(auth.uid(), 'admin'));
