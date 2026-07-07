
-- Revoke anon privileges on sensitive tables
REVOKE ALL ON public.appointments FROM anon;
REVOKE ALL ON public.case_analyses FROM anon;
REVOKE ALL ON public.case_transcripts FROM anon;
REVOKE ALL ON public.instagram_accounts FROM anon;
REVOKE ALL ON public.cloud_sites FROM anon;

-- Ensure authenticated + service_role still have needed grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_transcripts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_sites TO authenticated;
GRANT ALL ON public.appointments TO service_role;
GRANT ALL ON public.case_analyses TO service_role;
GRANT ALL ON public.case_transcripts TO service_role;
GRANT ALL ON public.instagram_accounts TO service_role;
GRANT ALL ON public.cloud_sites TO service_role;

-- Tighten cloud_sites: drop public-role policies, restrict to authenticated
DROP POLICY IF EXISTS "Public sites readable by anyone" ON public.cloud_sites;
DROP POLICY IF EXISTS "Owner manages sites" ON public.cloud_sites;

CREATE POLICY "Authenticated can read public sites"
  ON public.cloud_sites FOR SELECT
  TO authenticated
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Owner manages own sites"
  ON public.cloud_sites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tighten instagram_accounts policy roles (currently uses public role via ALL)
DROP POLICY IF EXISTS "own ig accounts" ON public.instagram_accounts;
CREATE POLICY "own ig accounts"
  ON public.instagram_accounts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
