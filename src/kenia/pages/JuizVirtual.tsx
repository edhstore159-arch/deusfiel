import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Gavel, Loader2, Send } from "lucide-react";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Card } from "@/kenia/components/ui/card";
import { toast } from "sonner";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/judge-ai`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Msg = { role: "user" | "assistant"; content: string };

const AGENTS = [
  { id: "openai/gpt-5.5", label: "GPT-5.5", desc: "Máximo rigor técnico" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", desc: "Raciocínio previdenciário avançado" },
  { id: "openai/gpt-5.2", label: "GPT-5.2", desc: "Análise complexa" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Rápido e econômico" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Análise jurídica detalhada" },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", desc: "Gemini moderno e eficiente" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", desc: "Raciocínio Gemini premium" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini", desc: "Equilibrado" },
  { id: "openai/gpt-5", label: "GPT-5", desc: "Máxima qualidade OpenAI" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", desc: "Raciocínio jurídico premium" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", desc: "Claude rápido e barato" },
] as const;

export default function JuizVirtual() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>(() => {
    const stored = localStorage.getItem("juiz_model") || "";
    const valid = AGENTS.some((a) => a.id === stored);
    return valid ? stored : "openai/gpt-5.5";
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const changeModel = (m: string) => {
    setModel(m);
    localStorage.setItem("juiz_model", m);
  };



  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }, { role: "assistant", content: "" }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON}`,
          apikey: ANON,
        },
        body: JSON.stringify({ messages: next.slice(0, -1), model }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        throw new Error(`Juiz Virtual falhou (${res.status}): ${body || "sem detalhes"}`);
      }
      // Se o backend retornou JSON (erro amigável 200), mostra toast e sai sem crashar.
      if (contentType.includes("application/json")) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Falha ao consultar o Juiz Virtual.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistant = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const payload = l.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
              queueMicrotask(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <Gavel className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Juiz Virtual</h1>
          <p className="text-sm text-muted-foreground">
            Descreva o caso. O agente emite um parecer imparcial fundamentado no direito brasileiro.
          </p>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">Agentes Virtuais</div>
        <div className="flex flex-wrap gap-2">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => changeModel(a.id)}
              className={`px-3 py-2 rounded-lg border text-left text-xs transition ${
                model === a.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:bg-muted"
              }`}
            >
              <div className="font-semibold">{a.label}</div>
              <div className={model === a.id ? "opacity-80" : "text-muted-foreground"}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>



      <Card
        ref={scrollRef}
        className="p-4 h-[55vh] overflow-y-auto space-y-4 bg-card"
      >
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Exemplo: "Trabalhei 3 anos sem carteira assinada, fui demitido sem aviso. Tenho conversas de WhatsApp com o patrão confirmando o contrato. Quais direitos posso cobrar?"
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          </div>
        ))}
      </Card>

      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Descreva os fatos, provas e o que se pretende (Ctrl/Cmd+Enter envia)"
          className="min-h-[90px]"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()} className="h-[90px] px-5">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
