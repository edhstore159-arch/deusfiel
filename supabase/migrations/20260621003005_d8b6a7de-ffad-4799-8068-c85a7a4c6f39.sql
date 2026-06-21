
-- Creative assets library: user-uploaded reference images for creatives
CREATE TABLE public.creative_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creative_assets TO authenticated;
GRANT ALL ON public.creative_assets TO service_role;

ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own creative assets"
  ON public.creative_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_creative_assets_updated_at
  BEFORE UPDATE ON public.creative_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX creative_assets_user_id_created_at_idx
  ON public.creative_assets (user_id, created_at DESC);

-- Storage policies: each user can only access objects under their own folder {user_id}/...
CREATE POLICY "Users can read their own creative-assets files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own creative-assets files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own creative-assets files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own creative-assets files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
