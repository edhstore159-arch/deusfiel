import { useEffect, useRef, useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Input } from "@/kenia/components/ui/input";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Label } from "@/kenia/components/ui/label";
import { toast } from "sonner";
import { Send, Loader2, Bot, Trash2, Server, Sparkles, Brain, Zap } from "lucide-react";

// Modelos oferecidos: rodam via Emergent API; Ollama roda local no navegador do usuário.
const MODELS = [
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini",
    provider: "gateway",
    tag: "Google · 2.5 Pro",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-500",
    desc: "Multimodal forte, contexto longo.",
  },
  {
    id: "openai/gpt-5.5",
    label: "ChatGPT",
    provider: "gateway",
    tag: "OpenAI · GPT-5.5",
    icon: Brain,
    color: "from-emerald-500 to-teal-600",
    desc: "Raciocínio e instrução top de linha.",
  },
  {
    id: "anthropic/claude-sonnet-4-20250514",
    label: "Claude",
    provider: "gateway",
    tag: "Anthropic · Claude Sonnet 4",
    icon: Bot,
    color: "from-orange-500 to-amber-600",
    desc: "Análise profunda e raciocínio avançado.",
  },
  {
    id: "ollama:local",
    label: "Ollama",
    provider: "ollama",
    tag: "Local · sua máquina",
    icon: Server,
    color: "from-purple-500 to-fuchsia-600",
    desc: "Roda modelos locais (llama3, mistral, etc).",
  },
];

const DEFAULT_SYSTEM =
  "Você é um assistente prestativo. Responda com clareza, em português quando o usuário escrever em português.";

const STORAGE_KEY = "kenia:chat-multi-modelo:v1";

export default function ChatMultiModelo() {
  const [selected, setSelected] = useState(MODELS[0]);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Olá! Escolha um modelo acima e comece a conversar." },
  ]);
  const [input, setInput] = useState("");
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [loading, setLoading] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.ollamaUrl) setOllamaUrl(s.ollamaUrl);
        if (s.ollamaModel) setOllamaModel(s.ollamaModel);
        if (s.system) setSystem(s.system);
        if (Array.isArray(s.messages) && s.messages.length) setMessages(s.messages);
        if (s.selectedId) {
          const m = MODELS.find((x) => x.id === s.selectedId);
          if (m) setSelected(m);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ollamaUrl, ollamaModel, system, messages, selectedId: selected.id })
      );
    } catch {}
  }, [ollamaUrl, ollamaModel, system, messages, selected.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const clearChat = () => {
    setMessages([{ role: "assistant", content: "Conversa limpa. Como posso ajudar?" }]);
  };

  const pickModel = (m) => {
    setSelected(m);
  };

  const appendAssistantChunk = (delta) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant" && last.streaming) {
        copy[copy.length - 1] = { ...last, content: last.content + delta };
      } else {
        copy.push({ role: "assistant", content: delta, streaming: true });
      }
      return copy;
    });
  };

  const finalizeAssistant = () => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant" && last.streaming) {
        copy[copy.length - 1] = { role: "assistant", content: last.content };
      }
      return copy;
    });
  };

  const streamGateway = async (allMessages) => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/multi-model-chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ model: selected.id, system, messages: allMessages }),
      signal: abortRef.current?.signal,
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) appendAssistantChunk(delta);
        } catch {}
      }
    }
    finalizeAssistant();
  };

  const streamOllama = async (allMessages) => {
    const base = ollamaUrl.replace(/\/+$/, "");
    let res;
    try {
      res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          stream: true,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            ...allMessages,
          ],
        }),
        signal: abortRef.current?.signal,
      });
    } catch (e) {
      if (e.name === "AbortError") throw e;
      throw new Error(
        `Não consegui conectar ao Ollama em ${base}. ` +
        `Verifique: (1) o Ollama está rodando na sua máquina (ollama serve); ` +
        `(2) libere CORS iniciando com OLLAMA_ORIGINS="*" ollama serve; ` +
        `(3) se o preview estiver em HTTPS, o navegador bloqueia http://localhost — abra a app em http://localhost ou use um túnel https (ngrok).`
      );
    }
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      throw new Error(`Ollama HTTP ${res.status}: ${t || "sem corpo"}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const delta = json?.message?.content;
          if (delta) appendAssistantChunk(delta);
        } catch {}
      }
    }
    finalizeAssistant();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    abortRef.current = new AbortController();
    try {
      const modelMessages = nextMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));
      if (selected.provider === "ollama") {
        await streamOllama(modelMessages);
      } else {
        await streamGateway(modelMessages);
      }
    } catch (e) {
      if (e.name === "AbortError") {
        finalizeAssistant();
      } else {
        toast.error(e.message || "Falha ao gerar resposta");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ Erro: ${e.message || e}` },
        ]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-nude-200 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold">
              Chat Multi-Modelo
            </div>
            <h1 className="font-display font-bold text-2xl">Converse com várias IAs</h1>
          </div>
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="w-4 h-4 mr-2" /> Limpar
          </Button>
        </div>
      </div>

      {/* Seletor de modelo */}
      <div className="px-6 py-4 bg-white border-b border-nude-200 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODELS.map((m) => {
            const Icon = m.icon;
            const active = selected.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => pickModel(m)}
                data-testid={`model-${m.label.toLowerCase()}`}
                className={`relative text-left rounded-xl border-2 p-3 transition-all ${
                  active
                    ? "border-gold-500 bg-gold-50 shadow-md"
                    : "border-nude-200 bg-white hover:border-nude-400 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-white shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{m.label}</div>
                    <div className="text-[10px] text-nude-500 truncate">{m.tag}</div>
                  </div>
                </div>
                <div className="text-[11px] text-nude-600 mt-2 line-clamp-2">{m.desc}</div>
                {active && (
                  <Badge className="absolute top-2 right-2 bg-gold-600 text-white text-[9px] px-1.5 py-0">
                    ATIVO
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {selected.provider === "ollama" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div>
              <Label className="text-xs">URL do Ollama</Label>
              <Input
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Modelo local</Label>
              <Input
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="llama3.2"
                className="mt-1 text-sm"
              />
            </div>
            <div className="md:col-span-2 text-[11px] text-purple-800">
              💡 Rode <code className="bg-white px-1 rounded">ollama serve</code> na sua máquina.
              Pode ser preciso liberar CORS com <code className="bg-white px-1 rounded">OLLAMA_ORIGINS="*"</code>.
            </div>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="max-w-3xl mx-auto p-6 space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap text-sm ${
                    m.role === "user"
                      ? "bg-gold-600 text-white rounded-br-sm"
                      : "bg-white border border-nude-200 text-nude-900 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                  {m.streaming && <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />}
                </div>
              </div>
            ))}
            {loading && !messages.some((m) => m.streaming) && (
              <div className="flex justify-start">
                <div className="bg-white border border-nude-200 rounded-2xl px-4 py-2.5 text-sm text-nude-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> {selected.label} pensando…
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Composer */}
      <div className="p-4 bg-white border-t border-nude-200 shrink-0">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Fale com ${selected.label}…`}
            rows={2}
            className="resize-none"
            data-testid="chat-input"
          />
          {loading ? (
            <Button onClick={stop} variant="outline" className="h-full">
              Parar
            </Button>
          ) : (
            <Button onClick={send} disabled={!input.trim()} className="bg-gold-600 hover:bg-gold-700 text-white h-full">
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="max-w-3xl mx-auto mt-2 text-[10px] text-nude-400 text-center">
          Enter para enviar · Shift+Enter para nova linha · Modelo atual: <b>{selected.tag}</b>
        </div>
      </div>
    </div>
  );
}
