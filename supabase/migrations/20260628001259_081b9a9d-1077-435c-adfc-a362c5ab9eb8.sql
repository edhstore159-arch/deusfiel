
DO $$ BEGIN
  CREATE POLICY "cloud-objects owner read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'cloud-objects' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cloud-objects owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cloud-objects' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cloud-objects owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'cloud-objects' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "cloud-objects owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cloud-objects' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
