DROP TRIGGER IF EXISTS trg_create_appointment_from_whatsapp ON public.whatsapp_messages;

CREATE TRIGGER trg_create_appointment_from_whatsapp
AFTER INSERT OR UPDATE OF text, contact_id, contact_name, contact_phone, user_id, from_me, created_at
ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_appointment_from_whatsapp();