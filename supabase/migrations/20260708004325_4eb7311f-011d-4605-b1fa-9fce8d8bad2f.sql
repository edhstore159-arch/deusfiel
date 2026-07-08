CREATE OR REPLACE FUNCTION public.create_appointment_from_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text;
  source_text text;
  hh int; mm int; d int; mo int; y int;
  appt_date date; appt_time time;
  ref_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  m text[]; assignee uuid;
BEGIN
  t := lower(coalesce(NEW.text, ''));
  IF t = '' THEN RETURN NEW; END IF;

  IF t !~ '(agend|marc|consulta|reuni[aã]o|atendimento|hor[aá]rio|confirmad)' THEN
    RETURN NEW;
  END IF;

  m := regexp_match(t, '(?:[aà]s|as|hor[aá]rio\s*)?\s*(\d{1,2})(?:[:h](\d{2}))\s*(?:h|hs|horas)?');
  IF m IS NOT NULL THEN
    hh := m[1]::int; mm := coalesce(m[2], '0')::int;
  ELSE
    m := regexp_match(t, '(?:[aà]s|as|hor[aá]rio\s*)\s*(\d{1,2})\s*(?:h|hs|horas)?|(^|\s)(\d{1,2})\s*(?:h|hs|horas)');
    IF m IS NOT NULL THEN
      hh := coalesce(m[1], m[3])::int; mm := 0;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  IF hh < 0 OR hh > 23 OR mm < 0 OR mm > 59 THEN RETURN NEW; END IF;

  IF position('amanhã' in t) > 0 OR position('amanha' in t) > 0 THEN
    appt_date := ref_today + 1;
  ELSIF position('hoje' in t) > 0 THEN
    appt_date := ref_today;
  ELSE
    m := regexp_match(t, '(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?');
    IF m IS NULL THEN RETURN NEW; END IF;
    d := m[1]::int; mo := m[2]::int;
    IF m[3] IS NOT NULL THEN
      y := m[3]::int;
      IF y < 100 THEN y := y + 2000; END IF;
    ELSE
      y := extract(year from ref_today)::int;
    END IF;
    BEGIN
      appt_date := make_date(y, mo, d);
    EXCEPTION WHEN OTHERS THEN
      RETURN NEW;
    END;
  END IF;
  appt_time := make_time(hh, mm, 0);

  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE coalesce(session_id, '') = coalesce(NEW.contact_id, '')
      AND appointment_date = appt_date
      AND appointment_time = appt_time
  ) THEN
    RETURN NEW;
  END IF;

  assignee := NEW.user_id;
  IF assignee IS NULL THEN
    SELECT user_id INTO assignee FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1;
  END IF;

  source_text := left(NEW.text, 240);

  INSERT INTO public.appointments (
    user_id, session_id, client_name, phone, legal_area, case_summary,
    appointment_date, appointment_time, source, status, raw_payload
  ) VALUES (
    assignee,
    NEW.contact_id,
    coalesce(nullif(NEW.contact_name, ''), 'Cliente do WhatsApp'),
    NEW.contact_phone,
    'Atendimento jurídico',
    source_text,
    appt_date,
    appt_time,
    'whatsapp_trigger',
    'scheduled',
    jsonb_build_object('source','whatsapp_trigger','message_id', NEW.id, 'from_me', NEW.from_me)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whatsapp_appointment ON public.whatsapp_messages;
DROP TRIGGER IF EXISTS trg_create_appointment_from_whatsapp ON public.whatsapp_messages;
CREATE TRIGGER trg_create_appointment_from_whatsapp
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.create_appointment_from_whatsapp();