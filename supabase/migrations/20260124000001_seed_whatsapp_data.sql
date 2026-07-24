-- Fix: Add INSERT policy for strategies + seed demo data

-- Allow authenticated users to insert strategies (for auto-seed)
CREATE POLICY "Team can insert strategies" ON public.wa_strategies
  FOR INSERT TO authenticated WITH CHECK (true);

-- Seed strategies (in case the original INSERT was blocked)
INSERT INTO public.wa_strategies (name, label, color, description) VALUES
  ('saudacao', 'Saudação', '#22c55e', 'Abertura e boas-vindas ao contato'),
  ('identificacao', 'Identificação', '#3b82f6', 'Coleta de dados pessoais do membro'),
  ('diagnostico', 'Diagnóstico', '#f59e0b', 'Identificação do problema ou necessidade'),
  ('direcionamento', 'Direcionamento', '#8b5cf6', 'Encaminhamento para o ministério adequado'),
  ('encerramento', 'Encerramento', '#06b6d4', 'Finalização e follow-up'),
  ('urgencia', 'Urgência', '#ef4444', 'Situação que precisa de atendimento imediato'),
  ('oracao', 'Oração', '#ec4899', 'Momento de oração e acolhimento espiritual'),
  ('agendamento', 'Agendamento', '#14b8a6', 'Marcação de reunião ou compromisso'),
  ('pos_atendimento', 'Pós-Atendimento', '#6366f1', 'Verificação e acompanhamento')
ON CONFLICT (name) DO UPDATE SET
  label = EXCLUDED.label,
  color = EXCLUDED.color,
  description = EXCLUDED.description;

-- Seed demo conversations with messages
DO $$
DECLARE
  conv1 uuid;
  conv2 uuid;
  conv3 uuid;
  strat_saudacao uuid;
  strat_ident uuid;
  strat_diag uuid;
  strat_direc uuid;
  strat_oracao uuid;
  strat_agend uuid;
  strat_encerr uuid;
BEGIN
  -- Get strategy IDs
  SELECT id INTO strat_saudacao FROM wa_strategies WHERE name = 'saudacao';
  SELECT id INTO strat_ident FROM wa_strategies WHERE name = 'identificacao';
  SELECT id INTO strat_diag FROM wa_strategies WHERE name = 'diagnostico';
  SELECT id INTO strat_direc FROM wa_strategies WHERE name = 'direcionamento';
  SELECT id INTO strat_oracao FROM wa_strategies WHERE name = 'oracao';
  SELECT id INTO strat_agend FROM wa_strategies WHERE name = 'agendamento';
  SELECT id INTO strat_encerr FROM wa_strategies WHERE name = 'encerramento';

  -- Conversation 1: Maria - Novo membro interessado
  INSERT INTO wa_conversations (id, phone, member_name, status, current_strategy)
  VALUES (gen_random_uuid(), '+5511999887766', 'Maria Silva', 'active', 'diagnostico')
  RETURNING id INTO conv1;

  INSERT INTO wa_messages (conversation_id, direction, content, strategy_name, strategy_id, created_at) VALUES
    (conv1, 'incoming', 'Olá, boa tarde! Vim à igreja no domingo e gostaria de saber mais sobre os ministérios.', 'saudacao', strat_saudacao, now() - interval '2 hours'),
    (conv1, 'outgoing', 'Olá Maria! Que bom ter você conosco! Seja muito bem-vinda! 😊 Posso te ajudar a conhecer nossos ministérios. Me conta, qual sua idade?', 'saudacao', strat_saudacao, now() - interval '2 hours' + interval '2 min'),
    (conv1, 'incoming', 'Tenho 28 anos, sou professora.', 'identificacao', strat_ident, now() - interval '1 hour 55 min'),
    (conv1, 'outgoing', 'Que lindo! Profissão tão bonita! Maria, você tem filhos? E como foi sua experiência no domingo?', 'identificacao', strat_ident, now() - interval '1 hour 53 min'),
    (conv1, 'incoming', 'Não tenho filhos ainda. Achei a igreja muito acolhedora, a música me emocionou muito.', 'diagnostico', strat_diag, now() - interval '1 hour 45 min'),
    (conv1, 'outgoing', 'Fico muito feliz em ouvir isso! Parece que o coração de Deus tocou o seu. Você tem algum ministério que te desperta interesse? Temos jovens, louvor, infantil...', 'diagnostico', strat_diag, now() - interval '1 hour 43 min'),
    (conv1, 'incoming', 'Adoraria participar do ministério de louvor! Canto na escola.', 'direcionamento', strat_direc, now() - interval '1 hour 30 min'),
    (conv1, 'outgoing', 'Perfeito, Maria! Vou direcionar você para nosso coordenador de louvor. Ele faz uma avaliação musical toda quinta às 19h. Pode vir?', 'agendamento', strat_agend, now() - interval '1 hour 28 min'),
    (conv1, 'incoming', 'Sim, posso! Muito obrigada pela atenção!', 'encerramento', strat_encerr, now() - interval '1 hour 20 min'),
    (conv1, 'outgoing', 'Tudo bem, Maria! Vou te mandar o endereço e o contato do coordenador. Que Deus te abençoe! 🙏', 'encerramento', strat_encerr, now() - interval '1 hour 18 min');

  -- Conversation 2: João - Casamento em crise
  INSERT INTO wa_conversations (id, phone, member_name, status, current_strategy)
  VALUES (gen_random_uuid(), '+5521988776655', 'João Santos', 'active', 'urgencia')
  RETURNING id INTO conv2;

  INSERT INTO wa_messages (conversation_id, direction, content, strategy_name, strategy_id, created_at) VALUES
    (conv2, 'incoming', 'Preciso de ajuda. Meu casamento está desmoronando. Minha esposa quer separar.', 'urgencia', strat_saudacao, now() - interval '3 hours'),
    (conv2, 'outgoing', 'João, sinto muito pelo que está passando. Quero que saiba que Deus pode restaurar tudo. Você e sua esposa são da igreja?', 'saudacao', strat_saudacao, now() - interval '3 hours' + interval '1 min'),
    (conv2, 'incoming', 'Sim, frequentamos há 5 anos. Mas nos afastamos nos últimos meses.', 'identificacao', strat_ident, now() - interval '2 hours 55 min'),
    (conv2, 'outgoing', 'Entendo. Às vezes a distância nos afasta. João, posso orar por você agora mesmo? A oração pode ser o primeiro passo para a restauração.', 'oracao', strat_oracao, now() - interval '2 hours 50 min'),
    (conv2, 'incoming', 'Sim, por favor. Preciso muito de oração.', 'oracao', strat_oracao, now() - interval '2 hours 48 min'),
    (conv2, 'outgoing', '🙏 Pai celestial, que restauras o que está quebrado... abençoa o casamento de João. Dá sabedoria e reconciliação. Amém.\n\nJoão, temos um ministério de casais muito forte. Posso marcar uma conversa com o pastor Responsável? É sigiloso e gratuito.', 'agendamento', strat_agend, now() - interval '2 hours 45 min'),
    (conv2, 'incoming', 'Isso seria ótimo. Obrigado, de verdade.', 'encerramento', strat_encerr, now() - interval '2 hours 30 min');

  -- Conversation 3: Ana - Criança com problema de saúde
  INSERT INTO wa_conversations (id, phone, member_name, status, current_strategy)
  VALUES (gen_random_uuid(), '+5531977665544', 'Ana Oliveira', 'active', 'oracao')
  RETURNING id INTO conv3;

  INSERT INTO wa_messages (conversation_id, direction, content, strategy_name, strategy_id, created_at) VALUES
    (conv3, 'incoming', 'Igreja, minha filha de 7 anos está no hospital. Pedi oração no grupo mas queria falar com alguém.', 'urgencia', strat_saudacao, now() - interval '45 min'),
    (conv3, 'outgoing', 'Ana, estamos contigo! Qual o nome da sua filha e o que aconteceu?', 'saudacao', strat_saudacao, now() - interval '43 min'),
    (conv3, 'incoming', 'Elena. Ela teve uma crise de asma forte. Está internada depuis ontem.', 'identificacao', strat_ident, now() - interval '40 min'),
    (conv3, 'outgoing', 'Vamos orar pela Elena agora! 🙏\n\nAna, nossos líderes de intercessão já foram acionados. Você gostaria que alguém fosse ao hospital para orar presencialmente com vocês?', 'oracao', strat_oracao, now() - interval '38 min'),
    (conv3, 'incoming', 'Sim, por favor! Estamos no Hospital São Lucas, quarto 204.', 'agendamento', strat_agend, now() - interval '35 min'),
    (conv3, 'outgoing', 'Anotado! Vou acionar a equipe de visitação. Ana, fique firme na fé — Deus é fiel! Vamos te atualizar em breve. ❤️', 'encerramento', strat_encerr, now() - interval '33 min');

END $$;
