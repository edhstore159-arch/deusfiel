import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Badge } from "@/kenia/components/ui/badge";
import { Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "claude_chat_v1";
const INITIAL = [
  {
    role: "assistant",
    content:
      "Olá! Sou **Claude**, seu assistente de IA gratuito integrado ao dashboard. Como posso ajudar hoje?",
    provider: "sistema",
  },
];

const providerLabel = (provider) => {
  const normalized = String(provider || "").toLowerCase();
  if (normalized === "ollama") return "Cloud Ollama";
  if (normalized === "lovable") return "Lovable Cloud";
  if (normalized === "gemini") return "Gemini";
  if (normalized === "emergent") return "Emergent";
  if (normalized === "anthropic") return "Anthropic Claude";
  if (normalized === "sistema") return "Sistema";
  return provider || "IA";
};

export default function ClaudeChat() {
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr) && arr.length ? arr : INITIAL;
    } catch {
      return INITIAL;
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {}
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("claude-chat", {
        body: { messages: next.filter((m) => m.role !== "system") },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const content = data?.content || "Sem resposta.";
      setMessages((m) => [...m, { role: "assistant", content, provider: data?.provider || "IA" }]);
    } catch (e) {
      toast.error("Erro ao falar com Claude: " + (e?.message || e));
      setMessages((m) => [...m, { role: "assistant", content: "_Erro temporário. Tente novamente em instantes._" }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function clearChat() {
    setMessages(INITIAL);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 grid place-items-center text-white shadow">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Claude — Assistente IA Grátis</h1>
            <p className="text-xs text-muted-foreground">
              Chat livre integrado ao dashboard (alimentado pelo Lovable Cloud / Ollama / Gemini).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-emerald-600 border-emerald-300">Online</Badge>
          <Button variant="ghost" size="sm" onClick={clearChat} title="Limpar conversa">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.role === "assistant" && m.provider && (
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Respondido por: {providerLabel(m.provider)}
                  </div>
                )}
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-pre:my-2">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Claude está pensando…
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-2 items-end">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Pergunte qualquer coisa ao Claude…  (Enter envia, Shift+Enter quebra linha)"
          rows={2}
          className="resize-none"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()} className="h-full">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
