CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  session_id text,
  message text NOT NULL,
  response text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own conversations" ON public.conversations;
CREATE POLICY "Users view own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON public.conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  session_id text,
  client_name text NOT NULL,
  phone text,
  email text,
  city text,
  legal_area text,
  case_summary text,
  appointment_date date NOT NULL,
  appointment_time time without time zone NOT NULL,
  source text NOT NULL DEFAULT 'chat_ai',
  status text NOT NULL DEFAULT 'scheduled',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own appointments" ON public.appointments;
CREATE POLICY "Users manage own appointments"
ON public.appointments
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_session ON public.appointments(session_id);

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.debug_instructions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  instruction text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debug_instructions TO authenticated;
GRANT ALL ON public.debug_instructions TO service_role;

ALTER TABLE public.debug_instructions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own debug instructions" ON public.debug_instructions;
CREATE POLICY "Users manage own debug instructions"
ON public.debug_instructions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_debug_instructions_user_id ON public.debug_instructions(user_id);
CREATE INDEX IF NOT EXISTS idx_debug_instructions_created_at ON public.debug_instructions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_instructions_status ON public.debug_instructions(status);

DROP TRIGGER IF EXISTS update_debug_instructions_updated_at ON public.debug_instructions;
CREATE TRIGGER update_debug_instructions_updated_at
BEFORE UPDATE ON public.debug_instructions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();