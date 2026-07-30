CREATE TABLE IF NOT EXISTS public.wa_auth_state (
    id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.wa_auth_state ENABLE ROW LEVEL SECURITY;

-- Allow backend operations (uses service_role in prod, anon in dev)
CREATE POLICY "Backend can manage wa_auth_state"
    ON public.wa_auth_state
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
