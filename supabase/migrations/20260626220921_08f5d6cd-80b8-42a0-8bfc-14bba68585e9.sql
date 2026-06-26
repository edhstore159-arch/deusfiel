CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.case_analyses (
  id TEXT PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  visitor_name TEXT,
  visitor_phone TEXT,
  area TEXT NOT NULL DEFAULT 'Em análise jurídica',
  qualificacao TEXT NOT NULL DEFAULT 'necessita_mais_info'
    CHECK (qualificacao IN ('qualificado', 'necessita_mais_info', 'nao_qualificado')),
  acertividade INTEGER NOT NULL DEFAULT 40 CHECK (acertividade >= 0 AND acertividade <= 100),
  chance_exito INTEGER NOT NULL DEFAULT 35 CHECK (chance_exito >= 0 AND chance_exito <= 100),
  resumo TEXT,
  motivo TEXT,
  proxima_pergunta TEXT,
  fundamentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_analyses TO authenticated;
GRANT SELECT, INSERT ON public.case_analyses TO anon;
GRANT ALL ON public.case_analyses TO service_role;

ALTER TABLE public.case_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own case analyses" ON public.case_analyses;
CREATE POLICY "Users view own case analyses"
ON public.case_analyses FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users insert own case analyses" ON public.case_analyses;
CREATE POLICY "Users insert own case analyses"
ON public.case_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users update own case analyses" ON public.case_analyses;
CREATE POLICY "Users update own case analyses"
ON public.case_analyses FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users delete own case analyses" ON public.case_analyses;
CREATE POLICY "Users delete own case analyses"
ON public.case_analyses FOR DELETE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_case_analyses_user_updated
ON public.case_analyses(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_analyses_session
ON public.case_analyses(session_id);

CREATE INDEX IF NOT EXISTS idx_case_analyses_phone
ON public.case_analyses(visitor_phone);

DROP TRIGGER IF EXISTS update_case_analyses_updated_at ON public.case_analyses;
CREATE TRIGGER update_case_analyses_updated_at
BEFORE UPDATE ON public.case_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.case_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  analysis_id TEXT REFERENCES public.case_analyses(id) ON DELETE CASCADE,
  session_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_transcripts TO authenticated;
GRANT SELECT, INSERT ON public.case_transcripts TO anon;
GRANT ALL ON public.case_transcripts TO service_role;

ALTER TABLE public.case_transcripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own case transcripts" ON public.case_transcripts;
CREATE POLICY "Users view own case transcripts"
ON public.case_transcripts FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users insert own case transcripts" ON public.case_transcripts;
CREATE POLICY "Users insert own case transcripts"
ON public.case_transcripts FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users update own case transcripts" ON public.case_transcripts;
CREATE POLICY "Users update own case transcripts"
ON public.case_transcripts FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users delete own case transcripts" ON public.case_transcripts;
CREATE POLICY "Users delete own case transcripts"
ON public.case_transcripts FOR DELETE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_case_transcripts_analysis_created
ON public.case_transcripts(analysis_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_case_transcripts_session_created
ON public.case_transcripts(session_id, created_at ASC);