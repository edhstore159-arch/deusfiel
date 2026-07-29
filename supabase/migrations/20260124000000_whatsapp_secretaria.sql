-- Migration: WhatsApp Secretaria Tables
-- Creates tables for WhatsApp conversations, messages, and strategy tracking

-- Strategy definitions (each training strategy gets a unique color)
CREATE TABLE IF NOT EXISTS public.wa_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Predefined training strategies for secretaria
INSERT INTO public.wa_strategies (name, label, color, description) VALUES
  ('saudacao', 'Saudação', '#22c55e', 'Abertura e boas-vindas ao contato'),
  ('identificacao', 'Identificação', '#3b82f6', 'Coleta de dados pessoais do membro'),
  ('diagnostico', 'Diagnóstico', '#f59e0b', 'Identificação do problema ou necessidade'),
  ('direcionamento', 'Direcionamento', '#8b5cf6', 'Encaminhamento para o ministério adequado'),
  ('encerramento', 'Encerramento', '#06b6d4', 'Finalização e follow-up'),
  ('urgencia', 'Urgência', '#ef4444', 'Situação que precisa de atendimento imediato'),
  ('oracao', 'Oração', '#ec4899', 'Momento de oração e acolhimento espiritual'),
  ('agendamento', 'Agendamento', '#14b8a6', 'Marcação de reunião ou compromisso'),
  ('pos_atendimento', 'Pós-Atendimento', '#6366f1', 'Verificação e acompanhamento');
ON CONFLICT (name) DO NOTHING;

-- WhatsApp conversations (one per phone number interaction)
CREATE TABLE IF NOT EXISTS public.wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  member_name text,
  status text NOT NULL DEFAULT 'active',
  current_strategy text DEFAULT 'saudacao',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for quick lookup by phone
CREATE INDEX IF NOT EXISTS idx_wa_conversations_phone ON public.wa_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_updated ON public.wa_conversations(updated_at DESC);

-- WhatsApp messages (each message tagged with a strategy)
CREATE TABLE IF NOT EXISTS public.wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content text NOT NULL,
  strategy_id uuid REFERENCES public.wa_strategies(id),
  strategy_name text,
  message_type text DEFAULT 'text',
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for messages by conversation (chronological order)
CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation ON public.wa_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_strategy ON public.wa_messages(strategy_name);

-- Enable RLS
ALTER TABLE public.wa_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: team members can read all, admins can manage
CREATE POLICY "Team can read strategies" ON public.wa_strategies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team can read conversations" ON public.wa_conversations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team can insert conversations" ON public.wa_conversations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Team can update conversations" ON public.wa_conversations
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Team can read messages" ON public.wa_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team can insert messages" ON public.wa_messages
  FOR INSERT TO authenticated WITH CHECK (true);

-- Function to auto-update updated_at on conversation
CREATE OR REPLACE FUNCTION public.handle_wa_conversation_update()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wa_conversation_updated
  BEFORE UPDATE ON public.wa_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_wa_conversation_update();
