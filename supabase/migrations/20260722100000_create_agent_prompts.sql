-- Migration: create agent_prompts table for evolved prompts from training

CREATE TABLE IF NOT EXISTS public.agent_prompts (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('lawyer', 'judge', 'secretary')),
  area TEXT,
  prompt TEXT NOT NULL,
  score NUMERIC DEFAULT 0,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  source TEXT DEFAULT 'training',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_prompts_lookup ON public.agent_prompts (agent_type, area, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_prompts_version ON public.agent_prompts (agent_type, area, version DESC);

ALTER TABLE public.agent_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Edge functions can manage agent_prompts"
  ON public.agent_prompts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read active agent_prompts"
  ON public.agent_prompts FOR SELECT
  USING (is_active = true);
