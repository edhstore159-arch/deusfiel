-- Create the generated_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT,
  prompt TEXT,
  kind TEXT DEFAULT 'creative',
  paid BOOLEAN DEFAULT false,
  title TEXT,
  network TEXT,
  format TEXT,
  caption TEXT,
  tone TEXT,
  case_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated_images"
  ON public.generated_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated_images"
  ON public.generated_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated_images"
  ON public.generated_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated_images"
  ON public.generated_images FOR DELETE
  USING (auth.uid() = user_id);

-- Create the scheduled_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creative_id TEXT,
  title TEXT,
  caption TEXT,
  hashtags TEXT,
  image_b64 TEXT,
  platforms JSONB DEFAULT '[]',
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled_posts"
  ON public.scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled_posts"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled_posts"
  ON public.scheduled_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled_posts"
  ON public.scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON public.generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON public.scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON public.scheduled_posts(scheduled_for);

-- Create storage bucket for creative assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('creative-assets', 'creative-assets', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for creative-assets
CREATE POLICY "Users can view their own creative assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own creative assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own creative assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own creative assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'creative-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
