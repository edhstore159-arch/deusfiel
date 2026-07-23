import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const OLLAMA_URL = (
  import.meta.env.VITE_OLLAMA_URL ||
  "https://unabashed-vertical-crispness.ngrok-free.dev/api/generate"
).replace(/\/$/, "");
const OLLAMA_MODEL = "qwen2.5:3b-instruct";

const callOllama = async (msg: string, history: { role: string; content: string }[]): Promise<string> => {
  const systemPrompt = "Voce e um assistente juridico inteligente. Responda de forma clara, objetiva e profissional em portugues do Brasil.";
  const conversation = history
    .map((m) => `${m.role === "user" ? "Cliente" : "Assistente"}: ${m.content}`)
    .join("\n");
  const prompt = `${systemPrompt}\n\n${conversation}\nCliente: ${msg}\nAssistente:`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: systemPrompt,
        prompt,
        stream: false,
        think: false,
        keep_alive: "10m",
        options: { num_ctx: 4096, num_predict: 300, temperature: 0.3 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    const text = (data?.response || "").replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
    return text || "Sem resposta do Ollama.";
  } catch (e: any) {
    throw new Error(e?.name === "AbortError" ? "Timeout Ollama" : e?.message || "Erro Ollama");
  } finally {
    clearTimeout(timeout);
  }
};

const callGeminiFree = async (msg: string): Promise<string> => {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: msg }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.4 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta do Gemini.";
  } catch (e: any) {
    throw new Error(e?.message || "Erro Gemini");
  }
};

const callGroqFree = async (msg: string, history: { role: string; content: string }[]): Promise<string> => {
  const messages = [
    { role: "system", content: "Voce e um assistente juridico. Responda em portugues do Brasil de forma clara e profissional." },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: msg },
  ];
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages, max_tokens: 500, temperature: 0.4 }),
    });
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "Sem resposta do Groq.";
  } catch (e: any) {
    throw new Error(e?.message || "Erro Groq");
  }
};

const callOpenRouterFree = async (msg: string, history: { role: string; content: string }[]): Promise<string> => {
  const messages = [
    { role: "system", content: "Voce e um assistente juridico. Responda em portugues do Brasil." },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: msg },
  ];
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " },
      body: JSON.stringify({ model: "mistralai/mistral-7b-instruct:free", messages, max_tokens: 500, temperature: 0.4 }),
    });
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "Sem resposta do OpenRouter.";
  } catch (e: any) {
    throw new Error(e?.message || "Erro OpenRouter");
  }
};

interface AIProv {
  id: string;
  name: string;
  icon: string;
  color: string;
  border: string;
  send: (msg: string, history: { role: string; content: string }[]) => Promise<string>;
}

const PROVIDERS: AIProv[] = [
  { id: "ollama", name: "Ollama Local", icon: "\u{1F3E0}", color: "#10b981", border: "#059669", send: callOllama },
  { id: "gemini", name: "Gemini", icon: "\u2728", color: "#3b82f6", border: "#2563eb", send: callGeminiFree },
  { id: "groq", name: "Groq/Llama", icon: "\u26A1", color: "#f97316", border: "#ea580c", send: callGroqFree },
  { id: "openrouter", name: "OpenRouter", icon: "\u{1F310}", color: "#8b5cf6", border: "#7c3aed", send: callOpenRouterFree },
];

const Panel = ({ onClose }: { onClose: () => void }) => {
  const [input, setInput] = useState("");
  const [histories, setHistories] = useState<Record<string, { role: string; content: string }[]>>(() => {
    const h: Record<string, { role: string; content: string }[]> = {};
    PROVIDERS.forEach((p) => (h[p.id] = []));
    return h;
  });
  const [loading, setLoading] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {};
    PROVIDERS.forEach((p) => (s[p.id] = false));
    return s;
  });
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const e: Record<string, boolean> = {};
    PROVIDERS.forEach((p) => (e[p.id] = true));
    return e;
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    Object.keys(scrollRefs.current).forEach((id) => {
      scrollRefs.current[id]?.scrollTo(0, scrollRefs.current[id]?.scrollHeight || 0);
    });
  }, [histories]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg = { role: "user", content: text };

    const newHistories = { ...histories };
    Object.keys(newHistories).forEach((k) => { newHistories[k] = [...newHistories[k], userMsg]; });
    setHistories(newHistories);

    PROVIDERS.filter((p) => enabled[p.id]).forEach((prov) => {
      setLoading((prev) => ({ ...prev, [prov.id]: true }));
      const h = histories[prov.id] || [];
      prov.send(text, h)
        .then((reply) => {
          setHistories((prev) => ({ ...prev, [prov.id]: [...(prev[prov.id] || []), { role: "assistant", content: reply }] }));
        })
        .catch((err) => {
          setHistories((prev) => ({ ...prev, [prov.id]: [...(prev[prov.id] || []), { role: "assistant", content: "Erro: " + (err?.message || "falha") }] }));
        })
        .finally(() => setLoading((prev) => ({ ...prev, [prov.id]: false })));
    });
  }, [input, histories, enabled]);

  const toggleAI = (id: string) => setEnabled((p) => ({ ...p, [id]: !p[id] }));
  const clearAll = () => {
    const h: Record<string, { role: string; content: string }[]> = {};
    PROVIDERS.forEach((p) => (h[p.id] = []));
    setHistories(h);
  };
  const activeCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(95vw, 900px)", zIndex: 9999, display: "flex", flexDirection: "column", background: "#1a1614", borderLeft: "1px solid #3E362A", boxShadow: "-8px 0 30px rgba(0,0,0,0.5)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#2B2624", borderBottom: "1px solid #3E362A", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>&#x1F916;</span>
          <span style={{ color: "#F4F0EA", fontWeight: 600, fontSize: 14 }}>Conversa com todas as IAs</span>
          <span style={{ fontSize: 10, background: "rgba(59,130,246,0.3)", color: "#93c5fd", padding: "2px 8px", borderRadius: 12 }}>{activeCount} ativas</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={clearAll} style={{ padding: 6, borderRadius: 6, background: "none", border: "none", color: "#A4927A", cursor: "pointer", fontSize: 14 }} title="Limpar">&#x1F5D1;</button>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 6, background: "none", border: "none", color: "#A4927A", cursor: "pointer", fontSize: 16 }}>&#x2715;</button>
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: "flex", gap: 6, padding: "6px 12px", background: "rgba(43,38,36,0.5)", borderBottom: "1px solid rgba(62,54,42,0.5)", flexShrink: 0, overflowX: "auto" }}>
        {PROVIDERS.map((p) => (
          <button key={p.id} onClick={() => toggleAI(p.id)}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              background: enabled[p.id] ? p.color : "#5E5241", color: enabled[p.id] ? "#fff" : "#A4927A" }}>
            <span>{p.icon}</span> {p.name}
          </button>
        ))}
      </div>

      {/* Columns */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {PROVIDERS.map((p) => (
          <div key={p.id} style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            {/* Column header */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: p.color, color: "#fff", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              <span>{p.icon}</span>
              <span>{p.name}</span>
              {loading[p.id] && <span style={{ marginLeft: "auto" }}>&#x23F3;</span>}
            </div>
            {/* Messages */}
            <div ref={(el) => { scrollRefs.current[p.id] = el; }} style={{ flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6, background: "rgba(26,22,20,0.5)" }}>
              {(histories[p.id] || []).length === 0 && !loading[p.id] && (
                <div style={{ color: "#A4927A", fontSize: 11, textAlign: "center", marginTop: 32, fontStyle: "italic" }}>Envie uma mensagem para comparar</div>
              )}
              {(histories[p.id] || []).map((m, i) => (
                <div key={i} style={{
                  fontSize: 12, lineHeight: 1.5, borderRadius: 8, padding: "6px 10px", maxWidth: "100%", whiteSpace: "pre-wrap", wordBreak: "break-word",
                  background: m.role === "user" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                  color: m.role === "user" ? "#93c5fd" : "#E8E2D9",
                  marginLeft: m.role === "user" ? 16 : 0, marginRight: m.role === "assistant" ? 16 : 0,
                }}>{m.content}</div>
              ))}
              {loading[p.id] && (
                <div style={{ color: "#A4927A", fontSize: 11, fontStyle: "italic" }}>&#x23F3; Pensando...</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", background: "#2B2624", borderTop: "1px solid #3E362A", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Digite para todas as IAs..."
            rows={1}
            style={{ flex: 1, background: "#5E5241", color: "#F4F0EA", fontSize: 13, borderRadius: 8, padding: "8px 10px", border: "1px solid #81715A", resize: "none", outline: "none", minHeight: 38, fontFamily: "inherit" }} />
          <button onClick={send} disabled={!input.trim() || Object.values(loading).some(Boolean)}
            style={{ width: 38, height: 38, borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: (!input.trim() || Object.values(loading).some(Boolean)) ? 0.4 : 1 }}>
            &#x27A4;
          </button>
        </div>
        <div style={{ fontSize: 10, color: "#A4927A", marginTop: 4, textAlign: "center" }}>
          Envia para {activeCount} IA{activeCount !== 1 ? "s" : ""} ao mesmo tempo
        </div>
      </div>
    </div>
  );
};

export const MultiAISidePanel = () => {
  const [open, setOpen] = useState(false);
  const activeCount = 4;

  const bubble = (
    <button
      onClick={() => setOpen(true)}
      aria-label="Abrir conversa com todas as IAs"
      data-testid="multi-ai-bubble"
      style={{
        position: "fixed", left: 20, bottom: 80, zIndex: 9998,
        width: 56, height: 56, borderRadius: "50%",
        background: "#2563eb", color: "#fff", border: "none", cursor: "pointer",
        boxShadow: "0 4px 20px rgba(37,99,235,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <span style={{ fontSize: 24 }}>&#x1F916;</span>
      <span style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#34d399", color: "#1a1614", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {activeCount}
      </span>
    </button>
  );

  return createPortal(
    <>
      {bubble}
      {open && <Panel onClose={() => setOpen(false)} />}
    </>,
    document.body
  );
};

export default MultiAISidePanel;
