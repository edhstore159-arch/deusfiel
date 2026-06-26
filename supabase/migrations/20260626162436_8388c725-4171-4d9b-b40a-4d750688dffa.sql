GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

DROP POLICY IF EXISTS "Users view own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users view own whatsapp messages"
ON public.whatsapp_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users insert own whatsapp messages"
ON public.whatsapp_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users update own whatsapp messages"
ON public.whatsapp_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users delete own whatsapp messages"
ON public.whatsapp_messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);