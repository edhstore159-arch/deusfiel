import { useEffect, useRef, useState } from "react";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Label } from "@/kenia/components/ui/label";
import { toast } from "sonner";
import { Send, Loader2, Bot, Trash2, Server, Sparkles, Brain, Zap } from "lucide-react";

// Modelos oferecidos: Nemotron, Claude FCC, gateway (Gemini/GPT/Claude), Ollama local e OpenCode Zen.
const MODELS = [
  {
    id: "nemotron",
    label: "NEM",
    provider: "nemotron",
    model: "nemotron",
    icon: Zap,
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "claude-fcc",
    label: "CLF",
    provider: "claude-fcc",
    model: "claude-fcc",
    icon: Bot,
    color: "from-yellow-500 to-orange-600",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "GEM",
    provider: "gateway",
    model: "google/gemini-2.5-pro",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT",
    provider: "gateway",
    model: "openai/gpt-5.5",
    icon: Brain,
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "anthropic/claude-sonnet-4-20250514",
    label: "CLD",
    provider: "gateway",
    model: "anthropic/claude-sonnet-4-20250514",
    icon: Bot,
    color: "from-orange-500 to-amber-600",
  },
  {
    id: "ollama:local",
    label: "OLL",
    provider: "ollama",
    model: "qwen2.5:3b-instruct",
    icon: Server,
    color: "from-purple-500 to-fuchsia-600",
  },
  {
    id: "big-pickle",
    label: "ZEN",
    provider: "zen",
    model: "big-pickle",
    icon: Zap,
    color: "from-cyan-500 to-blue-600",
  },
  {
    id: "deepseek-v4-flash-free",
    label: "DSK",
    provider: "zen",
    model: "deepseek-v4-flash-free",
    icon: Zap,
    color: "from-violet-500 to-purple-600",
  },
  {
    id: "nemotron-3-ultra-free",
    label: "N3U",
    provider: "zen",
    model: "nemotron-3-ultra-free",
    icon: Zap,
    color: "from-green-500 to-lime-600",
  },
];

const DEFAULT_SYSTEM =
  "Você é um assistente prestativo. Responda com clareza, em português quando o usuário escrever em português.";

const STORAGE_KEY = "kenia:chat-multi-modelo:v1";

// Chave pública (anon) do projeto Supabase — pode ficar no frontend.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://uzzbgjwpfxokagrvmdoa.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6emJnandwZnhva2FncnZtZG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNDk2NzgsImV4cCI6MjA5OTgyNTY3OH0.4lX8OydcmKTx_U2A0MvMCs1-ZBKpQUcKFjSFsNfBttc";

const MULTI_MODEL_FN = `${SUPABASE_URL}/functions/v1/multi-model-chat`;
const CHAT_AI_FN = `${SUPABASE_URL}/functions/v1/chat-ai`;

// O proxy local (FCC + Ollama) é exposto pelo ngrok na porta 11111.
// NUNCA aponte o túnel direto para a 11434: o Ollama bloqueia Host/Origin externos.
const DEFAULT_OLLAMA_URL =
  import.meta.env.VITE_OLLAMA_URL || "https://october-detached-tipped.ngrok-free.dev";
const DEFAULT_OLLAMA_MODEL =
  import.meta.env.VITE_OLLAMA_MODEL || "qwen2.5:3b-instruct";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
});

const readJsonReply = (data) =>
  String(
    data?.response ??
      data?.choices?.[0]?.message?.content ??
      data?.content?.[0]?.text ??
      ""
  ).trim();

export default function ChatMultiModelo() {
  const [selected, setSelected] = useState(MODELS[0]);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Olá! Escolha um modelo acima e comece a conversar." },
  ]);
  const [input, setInput] = useState("");
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [loading, setLoading] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState(DEFAULT_OLLAMA_URL);
  const [ollamaModel, setOllamaModel] = useState(DEFAULT_OLLAMA_MODEL);
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

  const dropStreamingAssistant = () => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant" && last.streaming) copy.pop();
      return copy;
    });
  };

  const userAborted = () => Boolean(abortRef.current?.signal?.aborted);

  const friendlyError = (msg) => {
    if (/failed to fetch|networkerror|load failed|fetch failed/i.test(msg)) {
      return "Não foi possível conectar ao serviço de IA. Verifique sua internet e tente novamente.";
    }
    return msg;
  };

  const readSse = async (res, onDelta) => {
    if (!res.body) throw new Error("Resposta sem corpo");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";
    const handleLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") return;
      try {
        const data = JSON.parse(payload);
        if (data?.error) throw new Error(data.error);
        const delta =
          data?.choices?.[0]?.delta?.content ??
          data?.choices?.[0]?.message?.content ??
          data?.delta?.text ??
          data?.response ??
          "";
        if (typeof delta === "string" && delta) {
          fullResponse += delta;
          onDelta(delta);
        }
      } catch (e) {
        if (e instanceof Error && e.message && !/JSON/i.test(e.message)) throw e;
      }
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) handleLine(line);
    }
    if (buffer) handleLine(buffer);
    return fullResponse;
  };

  const streamGateway = async (allMessages) => {
    const res = await fetch(CHAT_AI_FN, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        message: allMessages[allMessages.length - 1]?.content || "",
        history: allMessages.slice(0, -1).filter((m) => m.role !== "system"),
        system_prompt: system,
        model: selected.model || selected.id,
        stream: true,
      }),
      signal: abortRef.current?.signal,
    });
    if (!res.ok) {
      let msg = `Gateway HTTP ${res.status}`;
      try {
        const err = await res.json();
        msg = err?.error || msg;
      } catch {}
      throw new Error(msg);
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      const reply = readJsonReply(data);
      if (!reply) throw new Error(data?.error || "O gateway retornou uma resposta vazia.");
      appendAssistantChunk(reply);
      return reply;
    }
    return readSse(res, appendAssistantChunk);
  };

  const streamMultiModel = async (modelId, allMessages) => {
    try {
      const res = await fetch(MULTI_MODEL_FN, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          messages: allMessages.filter((m) => m.role !== "system"),
          system,
          model: modelId,
        }),
        signal: abortRef.current?.signal,
      });
      if (!res.ok) {
        let msg = `Multi-modelo HTTP ${res.status}`;
        try {
          const err = await res.json();
          msg = err?.error || msg;
        } catch {}
        throw new Error(msg);
      }
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        const reply = readJsonReply(data);
        if (!reply) throw new Error(data?.error || "Resposta vazia do multi-modelo.");
        appendAssistantChunk(reply);
        return reply;
      }
      return await readSse(res, appendAssistantChunk);
    } catch (e) {
      if (userAborted()) throw e;
      console.warn("[ChatMultiModelo] multi-modelo falhou, usando chat-ai:", (e as Error)?.message);
      dropStreamingAssistant();
      toast.warning("Modelo indisponível — usando o gateway como alternativa.");
      return streamGateway(allMessages);
    }
  };

  const streamOllama = async (allMessages) => {
    const base = (ollamaUrl || DEFAULT_OLLAMA_URL).trim().replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          model: ollamaModel || DEFAULT_OLLAMA_MODEL,
          messages: allMessages,
          stream: true,
        }),
        signal: abortRef.current?.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Ollama HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
      }
      if (!res.body) throw new Error("Ollama não retornou corpo");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            const chunk = data?.message?.content || "";
            if (chunk) {
              fullResponse += chunk;
              appendAssistantChunk(chunk);
            }
          } catch {}
        }
      }
      if (!fullResponse) throw new Error("Ollama retornou resposta vazia");
      return fullResponse;
    } catch (e) {
      if (userAborted()) throw e;
      console.warn("[ChatMultiModelo] Ollama indisponível, usando gateway:", (e as Error)?.message);
      dropStreamingAssistant();
      toast.warning("Ollama indisponível — usando o gateway como alternativa.");
      return streamGateway(allMessages);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    abortRef.current = new AbortController();
    setLoading(true);
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const allMessages = [
      { role: "system", content: system },
      ...messages,
      userMessage,
    ];

    try {
      let response = "";
      if (selected.provider === "ollama") {
        response = await streamOllama(allMessages);
      } else if (selected.provider === "claude-fcc") {
        response = await streamMultiModel("claude-fcc", allMessages);
      } else if (selected.provider === "nemotron") {
        response = await streamMultiModel("nemotron", allMessages);
      } else if (selected.provider === "zen") {
        response = await streamMultiModel(selected.model || selected.id, allMessages);
      } else {
        response = await streamMultiModel(selected.model || selected.id, allMessages);
      }
      if (!response.trim()) {
        dropStreamingAssistant();
        response = await streamGateway(allMessages);
      }
      finalizeAssistant();
    } catch (e) {
      if (userAborted()) {
        finalizeAssistant();
        return;
      }
      const errorMsg = friendlyError((e as Error)?.message || String(e));
      console.error("Chat error:", errorMsg, e);
      toast.error(errorMsg);
      setMessages((prev) => [...prev, { role: "assistant", content: `Erro: ${errorMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-nude-50">
      <div className="flex items-center gap-2 p-3 border-b bg-white">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {MODELS.map((m) => (
            <Button
              key={m.id}
              variant={selected.id === m.id ? "default" : "outline"}
              size="sm"
              className={`bg-gradient-to-r ${m.color} text-white border-0 hover:opacity-90 transition-all`}
              onClick={() => pickModel(m)}
            >
              <m.icon className="w-4 h-4 mr-1" />
              {m.label}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="ml-auto shrink-0" onClick={clearChat} title="Limpar conversa">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {selected.provider === "ollama" && (
        <div className="px-3 py-2 border-b bg-white space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-nude-600">URL do Ollama</Label>
            <Input
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder={DEFAULT_OLLAMA_URL}
              className="h-8 max-w-[340px] text-xs"
            />
            <Label className="text-xs text-nude-600">Modelo</Label>
            <Input
              value={ollamaModel}
              onChange={(e) => setOllamaModel(e.target.value)}
              placeholder={DEFAULT_OLLAMA_MODEL}
              className="h-8 max-w-[200px] text-xs"
            />
          </div>
          <p className="text-[11px] text-nude-500">
            Use o túnel do proxy (porta 11111), nunca direto a 11434. O proxy libera CORS e reescreve o Host.
          </p>
        </div>
      )}

      <ScrollArea className="flex-1 p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
            <div className={`max-w-[75%] px-4 py-2 rounded-2xl whitespace-pre-wrap ${
              msg.role === "assistant"
                ? "bg-white border border-nude-200"
                : "bg-gold-500 text-white"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-gold-500 mt-1" />
            <div className="px-4 py-2 bg-white border border-nude-200 rounded-2xl">
              <span className="animate-pulse">Digitando...</span>
            </div>
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Digite sua mensagem..."
            className="flex-1"
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
