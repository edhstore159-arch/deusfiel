import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const STRATEGY_COLORS = {
  saudacao: "#22c55e",
  identificacao: "#3b82f6",
  diagnostico: "#f59e0b",
  direcionamento: "#8b5cf6",
  encerramento: "#06b6d4",
  urgencia: "#ef4444",
  oracao: "#ec4899",
  agendamento: "#14b8a6",
  pos_atendimento: "#6366f1",
};

const STRATEGY_LABELS = {
  saudacao: "Saudação",
  identificacao: "Identificação",
  diagnostico: "Diagnóstico",
  direcionamento: "Direcionamento",
  encerramento: "Encerramento",
  urgencia: "Urgência",
  oracao: "Oração",
  agendamento: "Agendamento",
  pos_atendimento: "Pós-Atendimento",
};

export default function AdminSecretaria() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
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
              c.id === newMsg.conversation_id
                ? { ...c, updated_at: newMsg.created_at }
                : c
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadData() {
    setLoading(true);
    const [convRes, stratRes] = await Promise.all([
      supabase
        .from("wa_conversations")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase.from("wa_strategies").select("*"),
    ]);

    setConversations(convRes.data || []);
    setStrategies(stratRes.data || []);
    setLoading(false);
  }

  async function loadMessages(conversationId) {
    setSelectedId(conversationId);
    const { data } = await supabase
      .from("wa_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  }

  function getStrategyColor(name) {
    if (!name) return "#64748b";
    return STRATEGY_COLORS[name] || "#64748b";
  }

  function getStrategyLabel(name) {
    if (!name) return "Sem estratégia";
    return STRATEGY_LABELS[name] || name;
  }

  function formatPhone(phone) {
    const d = phone.replace(/\D/g, "");
    if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return phone;
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {strategies.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: s.color + "22", color: s.color, border: `1px solid ${s.color}44` }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 flex gap-4" style={{ height: "calc(100vh - 56px)" }}>
        {/* Sidebar: Conversations */}
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
              <div className="p-4 text-sm text-muted-foreground text-center">
                Nenhuma conversa ainda
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
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: getStrategyColor(conv.current_strategy),
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatTime(conv.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5">
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

        {/* Main: Messages */}
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
                {messages.map((msg) => {
                  const color = getStrategyColor(msg.strategy_name);
                  const isOut = msg.direction === "outgoing";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOut ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-xl px-4 py-2.5 shadow-sm`}
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
                            style={{
                              backgroundColor: color,
                              color: "#fff",
                            }}
                          >
                            {getStrategyLabel(msg.strategy_name)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
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
                <p className="text-lg font-semibold">Selecione uma conversa</p>
                <p className="text-sm mt-1">
                  As mensagens aparecem com cores por estratégia de treinamento
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
