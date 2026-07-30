-- Migration: Judge Reports Table
-- Stores judicial analysis reports generated at the end of WhatsApp conversations

CREATE TABLE IF NOT EXISTS public.judge_reports (
  jid text PRIMARY KEY,
  client_name text NOT NULL DEFAULT 'Cliente',
  titulo text NOT NULL DEFAULT 'Análise Judicial',
  data_analise timestamp with time zone NOT NULL DEFAULT now(),
  area_juridica text NOT NULL DEFAULT 'Não identificada',
  relatorio text NOT NULL DEFAULT '',
  fundamentacao text NOT NULL DEFAULT '',
  dispositivo text NOT NULL DEFAULT '',
  pontos_fortes jsonb DEFAULT '[]',
  pontos_fracos jsonb DEFAULT '[]',
  probabilidade text NOT NULL DEFAULT 'Não foi possível determinar',
  recomendacao text NOT NULL DEFAULT '',
  full_conversation text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_judge_reports_created ON public.judge_reports(created_at DESC);

ALTER TABLE public.judge_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can read judge reports" ON public.judge_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team can insert judge reports" ON public.judge_reports
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Team can update judge reports" ON public.judge_reports
  FOR UPDATE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.handle_judge_report_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER judge_report_updated
  BEFORE UPDATE ON public.judge_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_judge_report_update();
