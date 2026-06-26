DROP POLICY IF EXISTS "Users view own case analyses" ON public.case_analyses;
CREATE POLICY "Users view own case analyses"
ON public.case_analyses FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users insert own case analyses" ON public.case_analyses;
CREATE POLICY "Users insert own case analyses"
ON public.case_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users update own case analyses" ON public.case_analyses;
CREATE POLICY "Users update own case analyses"
ON public.case_analyses FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users delete own case analyses" ON public.case_analyses;
CREATE POLICY "Users delete own case analyses"
ON public.case_analyses FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users view own case transcripts" ON public.case_transcripts;
CREATE POLICY "Users view own case transcripts"
ON public.case_transcripts FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users insert own case transcripts" ON public.case_transcripts;
CREATE POLICY "Users insert own case transcripts"
ON public.case_transcripts FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users update own case transcripts" ON public.case_transcripts;
CREATE POLICY "Users update own case transcripts"
ON public.case_transcripts FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users delete own case transcripts" ON public.case_transcripts;
CREATE POLICY "Users delete own case transcripts"
ON public.case_transcripts FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);