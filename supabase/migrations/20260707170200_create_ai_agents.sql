-- Migration: create ai_agents table and seed Juiz Virtual

CREATE TABLE IF NOT EXISTS public.ai_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT,
  tone TEXT,
  model TEXT,
  greeting TEXT,
  goal TEXT,
  instructions TEXT,
  avatar TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ensure Juiz Virtual seed exists (id = 'agent-juiz-virtual')
INSERT INTO public.ai_agents (id, name, area, tone, model, greeting, goal, instructions, avatar, active, created_at, updated_at)
SELECT 'agent-juiz-virtual', 'Juiz Virtual — Em Build', 'Cível', 'Formal', 'google/gemini-3-flash-preview',
  'Olá, sou o Juiz Virtual — Em Build. Posso ajudar com orientações iniciais e simulações de decisões.',
  'Atender usuários, qualificar solicitações e fornecer orientações jurídicas básicas.',
  'Responda com cuidado, evite emitir pareceres definitivos; sempre recomende consulta com advogado quando necessário.',
  '', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM public.ai_agents WHERE id = 'agent-juiz-virtual');
