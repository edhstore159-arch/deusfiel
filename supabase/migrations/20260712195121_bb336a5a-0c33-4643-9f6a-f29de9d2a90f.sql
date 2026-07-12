DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
      AND policyname = 'Admins can manage all appointments'
  ) THEN
    CREATE POLICY "Admins can manage all appointments"
    ON public.appointments
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_create_appointment_from_whatsapp ON public.whatsapp_messages;
CREATE TRIGGER trg_create_appointment_from_whatsapp
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_appointment_from_whatsapp();