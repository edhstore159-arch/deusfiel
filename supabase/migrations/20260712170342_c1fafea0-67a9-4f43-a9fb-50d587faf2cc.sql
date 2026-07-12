CREATE OR REPLACE FUNCTION public.create_appointment_from_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t text;
  context_text text;
  source_text text;
  hh int; mm int; d int; mo int; y int;
  appt_date date; appt_time time;
  ref_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  m text[]; assignee uuid;
  weekday_target int;
  weekday_current int;
  days_ahead int;
BEGIN
  t := lower(coalesce(NEW.text, ''));
  IF t = '' THEN RETURN NEW; END IF;

  SELECT lower(string_agg(coalesce(x.text, ''), ' ' ORDER BY x.created_at DESC))
    INTO context_text
  FROM (
    SELECT wm.text, wm.created_at
    FROM public.whatsapp_messages wm
    WHERE wm.contact_id = NEW.contact_id
      AND (NEW.user_id IS NULL OR wm.user_id = NEW.user_id)
      AND wm.created_at >= NEW.created_at - interval '2 hours'
      AND wm.created_at <= NEW.created_at + interval '1 minute'
    ORDER BY wm.created_at DESC
    LIMIT 16
  ) x;

  context_text := trim(coalesce(context_text, '') || ' ' || t);

  IF context_text !~ '(agend|reagend|marc|consulta|reuni[aã]o|atendimento|hor[aá]rio|confirmad)' THEN
    RETURN NEW;
  END IF;

  m := regexp_match(context_text, '(?:[aà]s|as|das|hor[aá]rio\s*)\s*(\d{1,2})(?:[:h](\d{1,2}))?\s*(?:h|hs|horas)?');
  IF m IS NULL THEN
    m := regexp_match(context_text, '(^|\s)(\d{1,2})(?:[:h](\d{1,2}))\s*(?:h|hs|horas)?');
    IF m IS NOT NULL THEN
      hh := m[2]::int; mm := coalesce(m[3], '0')::int;
    END IF;
  ELSE
    hh := m[1]::int; mm := coalesce(m[2], '0')::int;
  END IF;

  IF hh IS NULL OR hh < 0 OR hh > 23 OR mm < 0 OR mm > 59 THEN
    RETURN NEW;
  END IF;

  IF position('amanhã' in context_text) > 0 OR position('amanha' in context_text) > 0 THEN
    appt_date := ref_today + 1;
  ELSIF position('hoje' in context_text) > 0 THEN
    appt_date := ref_today;
  ELSE
    m := regexp_match(context_text, '(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?');
    IF m IS NOT NULL THEN
      d := m[1]::int; mo := m[2]::int;
      IF m[3] IS NOT NULL THEN
        y := m[3]::int;
        IF y < 100 THEN y := y + 2000; END IF;
      ELSE
        y := extract(year from ref_today)::int;
      END IF;
    ELSE
      m := regexp_match(context_text, 'dia\s+(\d{1,2})(?:\s+de)?(?:\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))?(?:\s+de\s+(\d{2,4}))?');
      IF m IS NOT NULL THEN
        d := m[1]::int;
        mo := CASE
          WHEN m[2] ~ 'janeiro' THEN 1
          WHEN m[2] ~ 'fevereiro' THEN 2
          WHEN m[2] ~ 'mar' THEN 3
          WHEN m[2] ~ 'abril' THEN 4
          WHEN m[2] ~ 'maio' THEN 5
          WHEN m[2] ~ 'junho' THEN 6
          WHEN m[2] ~ 'julho' THEN 7
          WHEN m[2] ~ 'agosto' THEN 8
          WHEN m[2] ~ 'setembro' THEN 9
          WHEN m[2] ~ 'outubro' THEN 10
          WHEN m[2] ~ 'novembro' THEN 11
          WHEN m[2] ~ 'dezembro' THEN 12
          ELSE extract(month from ref_today)::int
        END;
        IF m[3] IS NOT NULL THEN
          y := m[3]::int;
          IF y < 100 THEN y := y + 2000; END IF;
        ELSE
          y := extract(year from ref_today)::int;
        END IF;
      ELSE
        weekday_target := CASE
          WHEN context_text ~ 'segunda' THEN 1
          WHEN context_text ~ 'ter[cç]a' THEN 2
          WHEN context_text ~ 'quarta' THEN 3
          WHEN context_text ~ 'quinta' THEN 4
          WHEN context_text ~ 'sexta' THEN 5
          WHEN context_text ~ 's[aá]bado' THEN 6
          WHEN context_text ~ 'domingo' THEN 0
          ELSE NULL
        END;
        IF weekday_target IS NULL THEN RETURN NEW; END IF;
        weekday_current := extract(dow from ref_today)::int;
        days_ahead := (weekday_target - weekday_current + 7) % 7;
        IF days_ahead = 0 THEN days_ahead := 7; END IF;
        appt_date := ref_today + days_ahead;
      END IF;
    END IF;

    IF appt_date IS NULL THEN
      BEGIN
        appt_date := make_date(y, mo, d);
        IF m IS NOT NULL AND m[2] IS NULL AND appt_date < ref_today THEN
          appt_date := (appt_date + interval '1 month')::date;
        ELSIF appt_date < ref_today THEN
          appt_date := make_date(y + 1, mo, d);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RETURN NEW;
      END;
    END IF;
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

  source_text := left(coalesce(NEW.text, context_text), 240);

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
    jsonb_build_object('source','whatsapp_trigger','message_id', NEW.id, 'from_me', NEW.from_me, 'context_window', left(context_text, 1000))
  );

  RETURN NEW;
END;
$function$;