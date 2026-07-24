// Edge function: seed-secretaria
// Seeds strategies + demo conversations using service_role (bypasses RLS)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Seed strategies
    const strategies = [
      { name: "saudacao", label: "Saudação", color: "#22c55e", description: "Abertura e boas-vindas ao contato" },
      { name: "identificacao", label: "Identificação", color: "#3b82f6", description: "Coleta de dados pessoais do membro" },
      { name: "diagnostico", label: "Diagnóstico", color: "#f59e0b", description: "Identificação do problema ou necessidade" },
      { name: "direcionamento", label: "Direcionamento", color: "#8b5cf6", description: "Encaminhamento para o ministério adequado" },
      { name: "encerramento", label: "Encerramento", color: "#06b6d4", description: "Finalização e follow-up" },
      { name: "urgencia", label: "Urgência", color: "#ef4444", description: "Situação que precisa de atendimento imediato" },
      { name: "oracao", label: "Oração", color: "#ec4899", description: "Momento de oração e acolhimento espiritual" },
      { name: "agendamento", label: "Agendamento", color: "#14b8a6", description: "Marcação de reunião ou compromisso" },
      { name: "pos_atendimento", label: "Pós-Atendimento", color: "#6366f1", description: "Verificação e acompanhamento" },
    ];

    const { data: existingStrats } = await admin.from("wa_strategies").select("name");
    const existingNames = new Set((existingStrats || []).map((s: any) => s.name));
    const newStrats = strategies.filter((s) => !existingNames.has(s.name));

    if (newStrats.length > 0) {
      await admin.from("wa_strategies").insert(newStrats);
    }

    // 2. Check if conversations exist
    const { count } = await admin.from("wa_conversations").select("*", { count: "exact", head: true });
    if (count && count > 0) {
      return new Response(
        JSON.stringify({ seeded: false, message: "Data already exists", strategies: strategies.length, conversations: count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get strategy IDs
    const { data: allStrats } = await admin.from("wa_strategies").select("id, name");
    const stratMap: Record<string, string> = {};
    (allStrats || []).forEach((s: any) => { stratMap[s.name] = s.id; });

    // 4. Seed demo conversations
    const conv1Id = crypto.randomUUID();
    const conv2Id = crypto.randomUUID();
    const conv3Id = crypto.randomUUID();

    await admin.from("wa_conversations").insert([
      { id: conv1Id, phone: "+5511999887766", member_name: "Maria Silva", status: "active", current_strategy: "diagnostico" },
      { id: conv2Id, phone: "+5521988776655", member_name: "João Santos", status: "active", current_strategy: "urgencia" },
      { id: conv3Id, phone: "+5531977665544", member_name: "Ana Oliveira", status: "active", current_strategy: "oracao" },
    ]);

    // 5. Seed messages
    const now = Date.now();
    const min = 60 * 1000;
    const hr = 60 * min;

    const messages = [
      // Conv1: Maria
      { conversation_id: conv1Id, direction: "incoming", content: "Olá, boa tarde! Vim à igreja no domingo e gostaria de saber mais sobre os ministérios.", strategy_name: "saudacao", strategy_id: stratMap["saudacao"], created_at: new Date(now - 2 * hr).toISOString() },
      { conversation_id: conv1Id, direction: "outgoing", content: "Olá Maria! Que bom ter você conosco! Seja muito bem-vinda! 😊 Posso te ajudar a conhecer nossos ministérios. Me conta, qual sua idade?", strategy_name: "saudacao", strategy_id: stratMap["saudacao"], created_at: new Date(now - 2 * hr + 2 * min).toISOString() },
      { conversation_id: conv1Id, direction: "incoming", content: "Tenho 28 anos, sou professora.", strategy_name: "identificacao", strategy_id: stratMap["identificacao"], created_at: new Date(now - 2 * hr + 5 * min).toISOString() },
      { conversation_id: conv1Id, direction: "outgoing", content: "Que lindo! Profissão tão bonita! Maria, você tem filhos? E como foi sua experiência no domingo?", strategy_name: "identificacao", strategy_id: stratMap["identificacao"], created_at: new Date(now - 2 * hr + 7 * min).toISOString() },
      { conversation_id: conv1Id, direction: "incoming", content: "Não tenho filhos ainda. Achei a igreja muito acolhedora, a música me emocionou muito.", strategy_name: "diagnostico", strategy_id: stratMap["diagnostico"], created_at: new Date(now - 1 * hr - 50 * min).toISOString() },
      { conversation_id: conv1Id, direction: "outgoing", content: "Fico muito feliz em ouvir isso! Parece que o coração de Deus tocou o seu. Você tem algum ministério que te desperta interesse? Temos jovens, louvor, infantil...", strategy_name: "diagnostico", strategy_id: stratMap["diagnostico"], created_at: new Date(now - 1 * hr - 48 * min).toISOString() },
      { conversation_id: conv1Id, direction: "incoming", content: "Adoraria participar do ministério de louvor! Canto na escola.", strategy_name: "direcionamento", strategy_id: stratMap["direcionamento"], created_at: new Date(now - 1 * hr - 35 * min).toISOString() },
      { conversation_id: conv1Id, direction: "outgoing", content: "Perfeito, Maria! Vou direcionar você para nosso coordenador de louvor. Ele faz uma avaliação musical toda quinta às 19h. Pode vir?", strategy_name: "agendamento", strategy_id: stratMap["agendamento"], created_at: new Date(now - 1 * hr - 33 * min).toISOString() },
      { conversation_id: conv1Id, direction: "incoming", content: "Sim, posso! Muito obrigada pela atenção!", strategy_name: "encerramento", strategy_id: stratMap["encerramento"], created_at: new Date(now - 1 * hr - 25 * min).toISOString() },
      { conversation_id: conv1Id, direction: "outgoing", content: "Tudo bem, Maria! Vou te mandar o endereço e o contato do coordenador. Que Deus te abençoe! 🙏", strategy_name: "encerramento", strategy_id: stratMap["encerramento"], created_at: new Date(now - 1 * hr - 23 * min).toISOString() },

      // Conv2: João
      { conversation_id: conv2Id, direction: "incoming", content: "Preciso de ajuda. Meu casamento está desmoronando. Minha esposa quer separar.", strategy_name: "urgencia", strategy_id: stratMap["urgencia"], created_at: new Date(now - 3 * hr).toISOString() },
      { conversation_id: conv2Id, direction: "outgoing", content: "João, sinto muito pelo que está passando. Quero que saiba que Deus pode restaurar tudo. Você e sua esposa são da igreja?", strategy_name: "saudacao", strategy_id: stratMap["saudacao"], created_at: new Date(now - 3 * hr + 1 * min).toISOString() },
      { conversation_id: conv2Id, direction: "incoming", content: "Sim, frequentamos há 5 anos. Mas nos afastamos nos últimos meses.", strategy_name: "identificacao", strategy_id: stratMap["identificacao"], created_at: new Date(now - 3 * hr + 5 * min).toISOString() },
      { conversation_id: conv2Id, direction: "outgoing", content: "Entendo. Às vezes a distância nos afasta. João, posso orar por você agora mesmo? A oração pode ser o primeiro passo para a restauração.", strategy_name: "oracao", strategy_id: stratMap["oracao"], created_at: new Date(now - 3 * hr + 10 * min).toISOString() },
      { conversation_id: conv2Id, direction: "incoming", content: "Sim, por favor. Preciso muito de oração.", strategy_name: "oracao", strategy_id: stratMap["oracao"], created_at: new Date(now - 3 * hr + 12 * min).toISOString() },
      { conversation_id: conv2Id, direction: "outgoing", content: "🙏 Pai celestial, que restauras o que está quebrado... abençoa o casamento de João. Dá sabedoria e reconciliação. Amém.\n\nJoão, temos um ministério de casais muito forte. Posso marcar uma conversa com o pastor? É sigiloso e gratuito.", strategy_name: "agendamento", strategy_id: stratMap["agendamento"], created_at: new Date(now - 3 * hr + 15 * min).toISOString() },
      { conversation_id: conv2Id, direction: "incoming", content: "Isso seria ótimo. Obrigado, de verdade.", strategy_name: "encerramento", strategy_id: stratMap["encerramento"], created_at: new Date(now - 2 * hr - 30 * min).toISOString() },

      // Conv3: Ana
      { conversation_id: conv3Id, direction: "incoming", content: "Igreja, minha filha de 7 anos está no hospital. Pedi oração no grupo mas queria falar com alguém.", strategy_name: "urgencia", strategy_id: stratMap["urgencia"], created_at: new Date(now - 45 * min).toISOString() },
      { conversation_id: conv3Id, direction: "outgoing", content: "Ana, estamos contigo! Qual o nome da sua filha e o que aconteceu?", strategy_name: "saudacao", strategy_id: stratMap["saudacao"], created_at: new Date(now - 43 * min).toISOString() },
      { conversation_id: conv3Id, direction: "incoming", content: "Elena. Ela teve uma crise de asma forte. Está internada depuis ontem.", strategy_name: "identificacao", strategy_id: stratMap["identificacao"], created_at: new Date(now - 40 * min).toISOString() },
      { conversation_id: conv3Id, direction: "outgoing", content: "Vamos orar pela Elena agora! 🙏\n\nAna, nossos líderes de intercessão já foram acionados. Você gostaria que alguém fosse ao hospital para orar presencialmente com vocês?", strategy_name: "oracao", strategy_id: stratMap["oracao"], created_at: new Date(now - 38 * min).toISOString() },
      { conversation_id: conv3Id, direction: "incoming", content: "Sim, por favor! Estamos no Hospital São Lucas, quarto 204.", strategy_name: "agendamento", strategy_id: stratMap["agendamento"], created_at: new Date(now - 35 * min).toISOString() },
      { conversation_id: conv3Id, direction: "outgoing", content: "Anotado! Vou acionar a equipe de visitação. Ana, fique firme na fé — Deus é fiel! Vamos te atualizar em breve. ❤️", strategy_name: "encerramento", strategy_id: stratMap["encerramento"], created_at: new Date(now - 33 * min).toISOString() },
    ];

    await admin.from("wa_messages").insert(messages);

    return new Response(
      JSON.stringify({ seeded: true, strategies: strategies.length, conversations: 3, messages: messages.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
