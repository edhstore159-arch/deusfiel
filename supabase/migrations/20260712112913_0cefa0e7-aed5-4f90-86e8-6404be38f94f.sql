DROP POLICY IF EXISTS "Admins update all case analyses" ON public.case_analyses;
DROP POLICY IF EXISTS "Admins view all case analyses" ON public.case_analyses;
DROP POLICY IF EXISTS "Users delete own case analyses" ON public.case_analyses;
DROP POLICY IF EXISTS "Users update own case analyses" ON public.case_analyses;
DROP POLICY IF EXISTS "Users view own case analyses" ON public.case_analyses;
DROP POLICY IF EXISTS "Admins view all case transcripts" ON public.case_transcripts;
DROP POLICY IF EXISTS "Users delete own case transcripts" ON public.case_transcripts;
DROP POLICY IF EXISTS "Users update own case transcripts" ON public.case_transcripts;
DROP POLICY IF EXISTS "Users view own case transcripts" ON public.case_transcripts;

CREATE POLICY "Admins update all case analyses"
ON public.case_analyses
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins view all case analyses"
ON public.case_analyses
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users delete own case analyses"
ON public.case_analyses
FOR DELETE
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users update own case analyses"
ON public.case_analyses
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users view own case analyses"
ON public.case_analyses
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins view all case transcripts"
ON public.case_transcripts
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users delete own case transcripts"
ON public.case_transcripts
FOR DELETE
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users update own case transcripts"
ON public.case_transcripts
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users view own case transcripts"
ON public.case_transcripts
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;