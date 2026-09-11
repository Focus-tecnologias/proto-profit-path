ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_path TEXT;

CREATE POLICY "product photos read" ON storage.objects FOR SELECT USING (bucket_id = 'product-photos');
CREATE POLICY "product photos insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-photos');
CREATE POLICY "product photos update" ON storage.objects FOR UPDATE USING (bucket_id = 'product-photos');
CREATE POLICY "product photos delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-photos');