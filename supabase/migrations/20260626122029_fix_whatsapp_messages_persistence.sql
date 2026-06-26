DROP POLICY IF EXISTS "Users view own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users view own whatsapp messages"
ON public.whatsapp_messages FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users insert own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users insert own whatsapp messages"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users update own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users update own whatsapp messages"
ON public.whatsapp_messages FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users delete own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users delete own whatsapp messages"
ON public.whatsapp_messages FOR DELETE
USING (auth.uid() = user_id OR user_id IS NULL);

DROP INDEX IF EXISTS public.idx_whatsapp_messages_unique_provider;
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_unique_provider
ON public.whatsapp_messages(user_id, contact_id, provider_message_id);
