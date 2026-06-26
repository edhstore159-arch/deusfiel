CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  contact_id TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  text TEXT NOT NULL,
  from_me BOOLEAN NOT NULL DEFAULT false,
  provider_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_contact_created
ON public.whatsapp_messages(user_id, contact_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_unique_provider
ON public.whatsapp_messages(user_id, contact_id, provider_message_id)
WHERE provider_message_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT SELECT, INSERT ON public.whatsapp_messages TO anon;
GRANT ALL ON public.whatsapp_messages TO service_role;

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users view own whatsapp messages"
ON public.whatsapp_messages FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users insert own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users insert own whatsapp messages"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users update own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users update own whatsapp messages"
ON public.whatsapp_messages FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users delete own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users delete own whatsapp messages"
ON public.whatsapp_messages FOR DELETE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at ON public.whatsapp_messages;
CREATE TRIGGER update_whatsapp_messages_updated_at
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();