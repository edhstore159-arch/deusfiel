
-- 1) Storage: lock down debug-large-attachments to authenticated + folder-scoped
DROP POLICY IF EXISTS "debug-large-attachments read" ON storage.objects;
DROP POLICY IF EXISTS "debug-large-attachments upload" ON storage.objects;

CREATE POLICY "debug-large-attachments owner read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'debug-large-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "debug-large-attachments owner upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'debug-large-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "debug-large-attachments owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'debug-large-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 2) Payments: ensure inserted payments correspond to a session owned by the patient
DROP POLICY IF EXISTS "System can create payments" ON public.payments;
CREATE POLICY "Patients create payments for own sessions"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = patient_id
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = payments.session_id
      AND s.patient_id = auth.uid()
  )
);

-- 3) Sessions: ensure target therapist_id actually has a therapist_profile
DROP POLICY IF EXISTS "Patients can create sessions" ON public.sessions;
CREATE POLICY "Patients can create sessions"
ON public.sessions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = patient_id
  AND EXISTS (
    SELECT 1 FROM public.therapist_profiles tp
    WHERE tp.user_id = sessions.therapist_id
  )
);
