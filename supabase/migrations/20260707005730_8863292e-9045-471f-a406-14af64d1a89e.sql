
-- Remove policies that permit anonymous access via user_id IS NULL on case_analyses / case_transcripts.
-- Anonymous chat writes must go through service_role edge functions, never the anon key.

DROP POLICY IF EXISTS "Users view own case analyses" ON public.case_analyses;
DROP POLICY IF EXISTS "Users insert own case analyses" ON public.case_analyses;
DROP POLICY IF EXISTS "Users update own case analyses" ON public.case_analyses;
DROP POLICY IF EXISTS "Users delete own case analyses" ON public.case_analyses;

CREATE POLICY "Users view own case analyses"
  ON public.case_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own case analyses"
  ON public.case_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own case analyses"
  ON public.case_analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own case analyses"
  ON public.case_analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users view own case transcripts" ON public.case_transcripts;
DROP POLICY IF EXISTS "Users insert own case transcripts" ON public.case_transcripts;
DROP POLICY IF EXISTS "Users update own case transcripts" ON public.case_transcripts;
DROP POLICY IF EXISTS "Users delete own case transcripts" ON public.case_transcripts;

CREATE POLICY "Users view own case transcripts"
  ON public.case_transcripts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own case transcripts"
  ON public.case_transcripts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own case transcripts"
  ON public.case_transcripts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own case transcripts"
  ON public.case_transcripts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure anon role cannot reach these tables (service_role edge functions still can).
REVOKE ALL ON public.case_analyses FROM anon;
REVOKE ALL ON public.case_transcripts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_transcripts TO authenticated;
GRANT ALL ON public.case_analyses TO service_role;
GRANT ALL ON public.case_transcripts TO service_role;
