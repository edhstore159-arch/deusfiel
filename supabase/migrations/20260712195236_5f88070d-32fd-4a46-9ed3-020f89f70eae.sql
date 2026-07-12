DROP TRIGGER IF EXISTS whatsapp_messages_appointment_trigger ON public.whatsapp_messages;
DROP TRIGGER IF EXISTS trg_create_appointment_from_whatsapp ON public.whatsapp_messages;
DROP TRIGGER IF EXISTS create_appointment_from_whatsapp_trigger ON public.whatsapp_messages;

CREATE TRIGGER whatsapp_messages_appointment_trigger
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_appointment_from_whatsapp();