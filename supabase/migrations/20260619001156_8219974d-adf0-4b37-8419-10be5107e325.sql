
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "Users delete own scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users insert own scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users update own scheduled posts" ON public.scheduled_posts;
DROP POLICY IF EXISTS "Users view own scheduled posts"   ON public.scheduled_posts;

CREATE POLICY "Users view own scheduled posts"
  ON public.scheduled_posts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own scheduled posts"
  ON public.scheduled_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own scheduled posts"
  ON public.scheduled_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own scheduled posts"
  ON public.scheduled_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "debug-attachments upload only" ON storage.objects;

CREATE POLICY "debug-attachments authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'debug-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "debug-attachments owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'debug-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "debug-attachments owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'debug-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
