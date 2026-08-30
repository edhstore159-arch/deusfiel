import { useEffect, useRef, useState } from "react";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Label } from "@/kenia/components/ui/label";
import { toast } from "sonner";
import { Send, Loader2, Bot, Trash2, Server, Sparkles, Brain, Zap, Image } from "lucide-react";

// Modelos oferecidos: Nemotron (NVIDIA, gratuito), Claude FCC, Emergent, Ollama local, OpenCode Zen.
const MODELS = [
  {
    id: "nemotron",
    label: "NEM",
    provider: "nemotron",
    icon: Zap,
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "claude-fcc",
    label: "CLF",
    provider: "claude-fcc",
    icon: Bot,
    color: "from-yellow-500 to-orange-600",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "GEM",
    provider: "gateway",
    icon: Sparkles,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT",
    provider: "gateway",
    icon: Brain,
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "anthropic/claude-sonnet-4-20250514",
    label: "CLD",
    provider: "gateway",
    icon: Bot,
    color: "from-orange-500 to-amber-600",
  },
  {
    id: "ollama:local",
    label: "OLL",
    provider: "ollama",
    icon: Server,
    color: "from-purple-500 to-fuchsia-600",
  },
  {
    id: "big-pickle",
    label: "ZEN",
    provider: "zen",
    icon: Zap,
    color: "from-cyan-500 to-blue-600",
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
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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
        if (s.image) setImage(s.image);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ollamaUrl, ollamaModel, system, messages, selectedId: selected.id, image })
      );
    } catch {}
  }, [ollamaUrl, ollamaModel, system, messages, selected.id, image]);

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
      let msg = `HTTP ${res.status}`;
      try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("text/event-stream")) {
          const text = await res.text();
          const m = text.match(/data:\s*({[^}]*"error"[^}]*})/);
          if (m) msg = JSON.parse(m[1]).error || msg;
        } else {
          const err = await res.json();
          msg = err.error || msg;
        }
      } catch {}
      throw new Error(msg);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";
    const setStreamingResponse = (text: string) => {
      appendAssistantChunk(text);
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      for (const line of lines.slice(0, -1)) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            const chunk = data.choices?.[0]?.delta?.content || "";
            if (chunk) {
              fullResponse += chunk;
              setStreamingResponse(fullResponse);
            }
          } catch {}
        }
      }
      buffer = lines[lines.length - 1];
    }
    if (buffer.startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.slice(6));
        const chunk = data.choices?.[0]?.delta?.content || "";
        if (chunk) {
          fullResponse += chunk;
          setStreamingResponse(fullResponse);
        }
      } catch {}
    }
    return fullResponse;
  };

  const streamOllama = async (allMessages) => {
    const url = `${ollamaUrl}/api/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: allMessages,
        stream: true,
      }),
      signal: abortRef.current?.signal,
    });
    if (!res.ok || !res.body) throw new Error(`Ollama HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";
    const setStreamingResponse = (text: string) => {
      appendAssistantChunk(text);
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      for (const line of lines.slice(0, -1)) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            const chunk = data.message?.content || "";
            if (chunk) {
              fullResponse += chunk;
              setStreamingResponse(fullResponse);
            }
          } catch {}
        }
      }
      buffer = lines[lines.length - 1];
    }
    return fullResponse;
  };

  const streamClaudeFCC = async (allMessages) => {
    const fccUrl = `${import.meta.env.VITE_FCC_URL || "http://localhost:11111"}/v1/messages`;
    const res = await fetch(fccUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "freecc",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        stream: true,
        system,
        messages: allMessages.filter((m) => m.role !== "system"),
      }),
      signal: abortRef.current?.signal,
    });
    if (!res.ok || !res.body) throw new Error(`FCC HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";
    const setStreamingResponse = (text: string) => {
      appendAssistantChunk(text);
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      for (const line of lines.slice(0, -1)) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            const chunk = data.delta?.text || "";
            if (chunk) {
              fullResponse += chunk;
              setStreamingResponse(fullResponse);
            }
          } catch {}
        }
      }
      buffer = lines[lines.length - 1];
    }
    return fullResponse;
  };

  const streamNemotron = async (allMessages) => {
    const res = await fetch("https://api.z.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_NEMOTRON_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model: "GLM-4.5",
        messages: allMessages,
        stream: true,
      }),
      signal: abortRef.current?.signal,
    });
    if (!res.ok || !res.body) throw new Error(`Nemotron HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";
    const setStreamingResponse = (text: string) => {
      appendAssistantChunk(text);
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      for (const line of lines.slice(0, -1)) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            const chunk = data.choices?.[0]?.delta?.content || "";
            if (chunk) {
              fullResponse += chunk;
              setStreamingResponse(fullResponse);
            }
          } catch {}
        }
      }
      buffer = lines[lines.length - 1];
    }
    return fullResponse;
  };

  const streamZen = async (allMessages) => {
    const res = await fetch("https://opencode.ai/zen/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_ZEN_API_KEY || "sk-xxtVUim9LH01AvL5ZYfecVTWXP9IbHLLrowGXrCTlQMwf5fndFqq5bsFeHURbNl8"}`,
      },
      body: JSON.stringify({
        model: "big-pickle",
        messages: allMessages,
        stream: true,
      }),
      signal: abortRef.current?.signal,
    });
    if (!res.ok || !res.body) throw new Error(`Zen HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";
    const setStreamingResponse = (text: string) => {
      appendAssistantChunk(text);
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      for (const line of lines.slice(0, -1)) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            const chunk = data.choices?.[0]?.delta?.content || "";
            if (chunk) {
              fullResponse += chunk;
              setStreamingResponse(fullResponse);
            }
          } catch {}
        }
      }
      buffer = lines[lines.length - 1];
    }
    return fullResponse;
  };

  const sendMessage = async () => {
    if (!input.trim() && !imageFile) return;
    abortRef.current = new AbortController();
    setLoading(true);
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setImageFile(null);
    setImage(null);

    const allMessages = [
      { role: "system", content: system },
      ...messages,
      userMessage,
    ];

    try {
      let response = "";
      if (selected.provider === "gateway") {
        response = await streamGateway(allMessages);
      } else if (selected.provider === "ollama") {
        response = await streamOllama(allMessages);
      } else if (selected.provider === "claude-fcc") {
        response = await streamClaudeFCC(allMessages);
      } else if (selected.provider === "nemotron") {
        response = await streamNemotron(allMessages);
      } else if (selected.provider === "zen") {
        response = await streamZen(allMessages);
      }
      finalizeAssistant();
    } catch (e) {
      toast.error((e as Error).message);
      setMessages((prev) => [...prev, { role: "assistant", content: `Erro: ${(e as Error).message}` }]);
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
      </div>

      <ScrollArea className="flex-1 p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
            <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
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
          <Button onClick={sendMessage} disabled={loading || (!input.trim() && !imageFile)}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}