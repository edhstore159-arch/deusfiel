import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STRATEGIES = [
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

const DEMO_CONVERSATIONS = [
  {
    id: "demo-conv-1",
    phone: "+5511999887766",
    member_name: "Maria Silva",
    status: "active",
    current_strategy: "diagnostico",
    updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    messages: [
      { direction: "incoming", content: "Olá, boa tarde! Vim à igreja no domingo e gostaria de saber mais sobre os ministérios.", strategy_name: "saudacao", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "Olá Maria! Que bom ter você conosco! Seja muito bem-vinda! 😊 Posso te ajudar a conhecer nossos ministérios. Me conta, qual sua idade?", strategy_name: "saudacao", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString() },
      { direction: "incoming", content: "Tenho 28 anos, sou professora.", strategy_name: "identificacao", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "Que lindo! Profissão tão bonita! Maria, você tem filhos? E como foi sua experiência no domingo?", strategy_name: "identificacao", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 7 * 60 * 1000).toISOString() },
      { direction: "incoming", content: "Não tenho filhos ainda. Achei a igreja muito acolhedora, a música me emocionou muito.", strategy_name: "diagnostico", created_at: new Date(Date.now() - 60 * 60 * 1000 - 50 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "Fico muito feliz em ouvir isso! Parece que o coração de Deus tocou o seu. Você tem algum ministério que te desperta interesse? Temos jovens, louvor, infantil...", strategy_name: "diagnostico", created_at: new Date(Date.now() - 60 * 60 * 1000 - 48 * 60 * 1000).toISOString() },
      { direction: "incoming", content: "Adoraria participar do ministério de louvor! Canto na escola.", strategy_name: "direcionamento", created_at: new Date(Date.now() - 60 * 60 * 1000 - 35 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "Perfeito, Maria! Vou direcionar você para nosso coordenador de louvor. Ele faz uma avaliação musical toda quinta às 19h. Pode vir?", strategy_name: "agendamento", created_at: new Date(Date.now() - 60 * 60 * 1000 - 33 * 60 * 1000).toISOString() },
      { direction: "incoming", content: "Sim, posso! Muito obrigada pela atenção!", strategy_name: "encerramento", created_at: new Date(Date.now() - 60 * 60 * 1000 - 25 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "Tudo bem, Maria! Vou te mandar o endereço e o contato do coordenador. Que Deus te abençoe! 🙏", strategy_name: "encerramento", created_at: new Date(Date.now() - 60 * 60 * 1000 - 23 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: "demo-conv-2",
    phone: "+5521988776655",
    member_name: "João Santos",
    status: "active",
    current_strategy: "urgencia",
    updated_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    messages: [
      { direction: "incoming", content: "Preciso de ajuda. Meu casamento está desmoronando. Minha esposa quer separar.", strategy_name: "urgencia", created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "João, sinto muito pelo que está passando. Quero que saiba que Deus pode restaurar tudo. Você e sua esposa são da igreja?", strategy_name: "saudacao", created_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 1 * 60 * 1000).toISOString() },
      { direction: "incoming", content: "Sim, frequentamos há 5 anos. Mas nos afastamos nos últimos meses.", strategy_name: "identificacao", created_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "Entendo. Às vezes a distância nos afasta. João, posso orar por você agora mesmo? A oração pode ser o primeiro passo para a restauração.", strategy_name: "oracao", created_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString() },
      { direction: "incoming", content: "Sim, por favor. Preciso muito de oração.", strategy_name: "oracao", created_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 12 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "🙏 Pai celestial, que restauras o que está quebrado... abençoa o casamento de João. Dá sabedoria e reconciliação. Amém.\n\nJoão, temos um ministério de casais muito forte. Posso marcar uma conversa com o pastor? É sigiloso e gratuito.", strategy_name: "agendamento", created_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString() },
      { direction: "incoming", content: "Isso seria ótimo. Obrigado, de verdade.", strategy_name: "encerramento", created_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: "demo-conv-3",
    phone: "+5531977665544",
    member_name: "Ana Oliveira",
    status: "active",
    current_strategy: "oracao",
    updated_at: new Date(Date.now() - 33 * 60 * 1000).toISOString(),
    messages: [
      { direction: "incoming", content: "Igreja, minha filha de 7 anos está no hospital. Pedi oração no grupo mas queria falar com alguém.", strategy_name: "urgencia", created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "Ana, estamos contigo! Qual o nome da sua filha e o que aconteceu?", strategy_name: "saudacao", created_at: new Date(Date.now() - 43 * 60 * 1000).toISOString() },
      { direction: "incoming", content: "Elena. Ela teve uma crise de asma forte. Está internada desde ontem.", strategy_name: "identificacao", created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "Vamos orar pela Elena agora! 🙏\n\nAna, nossos líderes de intercessão já foram acionados. Você gostaria que alguém fosse ao hospital para orar presencialmente com vocês?", strategy_name: "oracao", created_at: new Date(Date.now() - 38 * 60 * 1000).toISOString() },
      { direction: "incoming", content: "Sim, por favor! Estamos no Hospital São Lucas, quarto 204.", strategy_name: "agendamento", created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString() },
      { direction: "outgoing", content: "Anotado! Vou acionar a equipe de visitação. Ana, fique firme na fé — Deus é fiel! Vamos te atualizar em breve. ❤️", strategy_name: "encerramento", created_at: new Date(Date.now() - 33 * 60 * 1000).toISOString() },
    ],
  },
];

function getStrategyColor(name) {
  if (!name) return "#64748b";
  const s = STRATEGIES.find((st) => st.name === name);
  return s ? s.color : "#64748b";
}

function getStrategyLabel(name) {
  if (!name) return "Sem estratégia";
  const s = STRATEGIES.find((st) => st.name === name);
  return s ? s.label : name;
}

function formatPhone(phone) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return phone;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminSecretaria() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("loading"); // loading | supabase | demo
  const [seeding, setSeeding] = useState(false);
  const messagesEndRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [convRes, stratRes] = await Promise.all([
        supabase.from("wa_conversations").select("*").order("updated_at", { ascending: false }),
        supabase.from("wa_strategies").select("*"),
      ]);

      if (convRes.error || stratRes.error || !convRes.data?.length) {
        setConversations(DEMO_CONVERSATIONS);
        setDataSource("demo");
      } else {
        setConversations(convRes.data);
        setDataSource("supabase");
      }
    } catch {
      setConversations(DEMO_CONVERSATIONS);
      setDataSource("demo");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (dataSource !== "supabase") return;

    const channel = supabase
      .channel("wa-messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wa_messages" },
        (payload) => {
          const newMsg = payload.new;
          if (newMsg.conversation_id === selectedId) {
            setMessages((prev) => [...prev, newMsg]);
          }
          setConversations((prev) =>
            prev.map((c) =>
              c.id === newMsg.conversation_id ? { ...c, updated_at: newMsg.created_at } : c
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedId, dataSource]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages(conversationId) {
    setSelectedId(conversationId);

    const conv = conversations.find((c) => c.id === conversationId);
    if (conv?.messages) {
      setMessages(conv.messages.map((m, i) => ({ ...m, id: `demo-${i}` })));
      return;
    }

    if (dataSource === "supabase") {
      const { data } = await supabase
        .from("wa_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    }
  }

  async function seedDemoData() {
    setSeeding(true);
    try {
      const { data: existingConv } = await supabase.from("wa_conversations").select("id").limit(1);
      if (existingConv && existingConv.length > 0) {
        loadData();
        setSeeding(false);
        return;
      }

      for (const conv of DEMO_CONVERSATIONS) {
        const { data: newConv, error: convErr } = await supabase
          .from("wa_conversations")
          .insert({
            phone: conv.phone,
            member_name: conv.member_name,
            status: conv.status,
            current_strategy: conv.current_strategy,
          })
          .select()
          .single();

        if (convErr || !newConv) continue;

        const msgs = conv.messages.map((m) => ({
          conversation_id: newConv.id,
          direction: m.direction,
          content: m.content,
          strategy_name: m.strategy_name,
          message_type: "text",
        }));

        await supabase.from("wa_messages").insert(msgs);
      }

      await loadData();
    } catch (e) {
      console.error("Seed error:", e);
    }
    setSeeding(false);
  }

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-[1400px] px-6 h-14 flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-semibold">Secretaria — Treinamento</h1>
            <p className="text-xs text-muted-foreground">
              Conversas WhatsApp em tempo real • Estratégias coloridas
              {dataSource === "demo" && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/15 text-amber-600 px-2 py-0.5 text-[10px] font-semibold">
                  DADOS DE DEMONSTRAÇÃO
                </span>
              )}
              {dataSource === "supabase" && (
                <span className="ml-2 inline-flex items-center rounded-full bg-green-500/15 text-green-600 px-2 py-0.5 text-[10px] font-semibold">
                  ● AO VIVO
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {dataSource === "demo" && (
              <button
                onClick={seedDemoData}
                disabled={seeding}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {seeding ? "Salvando..." : "Salvar no Supabase"}
              </button>
            )}
            <div className="flex flex-wrap gap-1.5">
              {STRATEGIES.map((s) => (
                <span
                  key={s.name}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: s.color + "22", color: s.color, border: `1px solid ${s.color}44` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 flex gap-4" style={{ height: "calc(100vh - 56px)" }}>
        <div className="w-[320px] shrink-0 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Conversas ({conversations.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground text-center">Carregando...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">Nenhuma conversa ainda</p>
                <button
                  onClick={seedDemoData}
                  disabled={seeding}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {seeding ? "Criando..." : "Carregar dados de demonstração"}
                </button>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadMessages(conv.id)}
                  className={`w-full text-left p-3 border-b border-border transition-colors hover:bg-accent ${
                    selectedId === conv.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {conv.member_name || formatPhone(conv.phone)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{conv.phone}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: getStrategyColor(conv.current_strategy) }}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatTime(conv.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: getStrategyColor(conv.current_strategy) + "22",
                        color: getStrategyColor(conv.current_strategy),
                      }}
                    >
                      {getStrategyLabel(conv.current_strategy)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
          {selected ? (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {selected.member_name || formatPhone(selected.phone)}
                  </p>
                  <p className="text-xs text-muted-foreground">{selected.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: getStrategyColor(selected.current_strategy) + "22",
                      color: getStrategyColor(selected.current_strategy),
                      border: `1px solid ${getStrategyColor(selected.current_strategy)}44`,
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full animate-pulse"
                      style={{ backgroundColor: getStrategyColor(selected.current_strategy) }}
                    />
                    {getStrategyLabel(selected.current_strategy)}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">Clique em uma conversa para ver as mensagens</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const color = getStrategyColor(msg.strategy_name);
                  const isOut = msg.direction === "outgoing";
                  return (
                    <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[70%] rounded-xl px-4 py-2.5 shadow-sm"
                        style={{
                          backgroundColor: color + "18",
                          border: `1px solid ${color}33`,
                          borderLeft: isOut ? undefined : `3px solid ${color}`,
                          borderRight: isOut ? `3px solid ${color}` : undefined,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: color, color: "#fff" }}
                          >
                            {getStrategyLabel(msg.strategy_name)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            {isOut ? "↗ Enviado" : "↘ Recebido"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-lg font-semibold">Selecione uma conversa</p>
                <p className="text-sm mt-1 max-w-sm">
                  As mensagens aparecem com cores por estratégia de treinamento. Cada cor representa uma etapa do atendimento.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
                  {STRATEGIES.slice(0, 6).map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
