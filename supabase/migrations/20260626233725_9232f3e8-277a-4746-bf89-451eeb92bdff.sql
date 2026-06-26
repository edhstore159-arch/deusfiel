REVOKE EXECUTE ON FUNCTION public.create_appointment_from_whatsapp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_appointment_from_whatsapp() TO service_role;