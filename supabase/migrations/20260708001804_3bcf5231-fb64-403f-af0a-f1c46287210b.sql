DROP TRIGGER IF EXISTS trg_create_appointment_from_whatsapp ON public.whatsapp_messages;
CREATE TRIGGER trg_create_appointment_from_whatsapp
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.create_appointment_from_whatsapp();