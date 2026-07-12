DROP TRIGGER IF EXISTS trg_whatsapp_appointment ON public.whatsapp_messages;
CREATE TRIGGER trg_whatsapp_appointment
AFTER INSERT OR UPDATE OF text, contact_id, contact_phone, contact_name
ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_appointment_from_whatsapp();