DROP POLICY IF EXISTS "Admins view all case analyses" ON public.case_analyses;
CREATE POLICY "Admins view all case analyses"
ON public.case_analyses FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update all case analyses" ON public.case_analyses;
CREATE POLICY "Admins update all case analyses"
ON public.case_analyses FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view all case transcripts" ON public.case_transcripts;
CREATE POLICY "Admins view all case transcripts"
ON public.case_transcripts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));