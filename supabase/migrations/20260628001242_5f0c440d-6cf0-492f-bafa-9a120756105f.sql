
CREATE TABLE IF NOT EXISTS public.cloud_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  html TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cloud_sites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_sites TO authenticated;
GRANT ALL ON public.cloud_sites TO service_role;
ALTER TABLE public.cloud_sites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Public sites readable by anyone" ON public.cloud_sites FOR SELECT USING (is_public = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Owner manages sites" ON public.cloud_sites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.cloud_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  mime TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_objects TO authenticated;
GRANT ALL ON public.cloud_objects TO service_role;
ALTER TABLE public.cloud_objects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Owner manages objects" ON public.cloud_objects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
