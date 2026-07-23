import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Gavel,
  Loader2,
  Paperclip,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Scale,
  Shield,
  Building2,
  Users,
  Landmark,
  Briefcase,
  Home,
  Zap,
  TreePine,
  Globe,
  Heart,
  FileCheck,
  Banknote,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Card } from "@/kenia/components/ui/card";
import { Badge } from "@/kenia/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/kenia/components/ui/tabs";
import { toast } from "sonner";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/judge-ai`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Attachment = { name: string; mime: string; dataUrl: string; kind: "image" | "pdf" };
type Msg = { role: "user" | "assistant"; content: string; attachments?: Attachment[] };

const MAX_FILE_MB = 15;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-emerald-50 text-emerald-700 border-emerald-200",
  google: "bg-blue-50 text-blue-700 border-blue-200",
  anthropic: "bg-violet-50 text-violet-700 border-violet-200",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
};

const AGENTS = [
  { id: "openai/gpt-5.5", label: "GPT-5.5", desc: "Máximo rigor técnico", provider: "openai" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", desc: "Raciocínio previdenciário avançado", provider: "openai" },
  { id: "openai/gpt-5.2", label: "GPT-5.2", desc: "Análise complexa", provider: "openai" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini", desc: "Equilibrado", provider: "openai" },
  { id: "openai/gpt-5", label: "GPT-5", desc: "Máxima qualidade OpenAI", provider: "openai" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Rápido e econômico", provider: "google" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Análise jurídica detalhada", provider: "google" },
  { id: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", desc: "Gemini moderno e eficiente", provider: "google" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", desc: "Raciocínio Gemini premium", provider: "google" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", desc: "Raciocínio jurídico premium", provider: "anthropic" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", desc: "Claude rápido e barato", provider: "anthropic" },
] as const;

const AREAS = [
  { id: "", label: "Geral", desc: "Todas as áreas do direito", icon: Scale },
  { id: "penal", label: "Penal", desc: "CP, CPP, crimes e dosimetria", icon: Shield },
  { id: "civel", label: "Cível", desc: "CC, CPC, contratos e responsabilidade", icon: FileCheck },
  { id: "trabalhista", label: "Trabalhista", desc: "CLT, vínculo e verbas rescisórias", icon: Briefcase },
  { id: "familia", label: "Família", desc: "Divórcio, guarda, pensão e inventário", icon: Heart },
  { id: "previdenciario", label: "Previdenciário", desc: "Aposentadoria, benefícios e EC 103", icon: Landmark },
  { id: "tributario", label: "Tributário", desc: "CTN, tributos e execução fiscal", icon: Banknote },
  { id: "administrativo", label: "Administrativo", desc: "Servidores, licitação e improbidade", icon: Building2 },
  { id: "constitucional", label: "Constitucional", desc: "CF/88, direitos fundamentais e STF", icon: GraduationCap },
  { id: "empresarial", label: "Empresarial", desc: "Sociedades, falência e recuperação", icon: Briefcase },
  { id: "consumidor", label: "Consumidor", desc: "CDC, vícios e cláusulas abusivas", icon: Users },
  { id: "ambiental", label: "Ambiental", desc: "Licenciamento, APP e crimes ambientais", icon: TreePine },
  { id: "eleitoral", label: "Eleitoral", desc: "Candidatura, propaganda e Ficha Limpa", icon: Vote },
  { id: "internacional", label: "Internacional", desc: "Tratados, extradição e cooperação", icon: Globe },
  { id: "sucessoes", label: "Sucessões", desc: "Inventário, testamento e partilha", icon: Home },
] as const;

function Vote(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function getProviderFromId(id: string): string {
  if (id.startsWith("openai/")) return "openai";
  if (id.startsWith("google/")) return "google";
  return "anthropic";
}

function groupBy<T>(arr: T[], key: (item: T) => string): { label: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export default function JuizVirtual() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [model, setModel] = useState<string>(() => {
    const stored = localStorage.getItem("juiz_model") || "";
    const valid = AGENTS.some((a) => a.id === stored);
    return valid ? stored : "openai/gpt-5.5";
  });
  const [area, setArea] = useState<string>(() => {
    const stored = localStorage.getItem("juiz_area") || "";
    return stored;
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const changeModel = (m: string) => {
    setModel(m);
    localStorage.setItem("juiz_model", m);
  };

  const changeArea = (a: string) => {
    setArea(a);
    localStorage.setItem("juiz_area", a);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: Attachment[] = [];
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!isImage && !isPdf) {
        toast.error(`${file.name}: apenas imagens ou PDF são aceitos.`);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${file.name}: excede ${MAX_FILE_MB}MB.`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        added.push({
          name: file.name,
          mime: isPdf ? "application/pdf" : file.type,
          dataUrl,
          kind: isPdf ? "pdf" : "image",
        });
      } catch {
        toast.error(`Falha ao ler ${file.name}.`);
      }
    }
    if (added.length) setAttachments((prev) => [...prev, ...added]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx));

  const buildOutgoingMessages = (history: Msg[]) =>
    history.map((m) => {
      if (m.role !== "user" || !m.attachments?.length) {
        return { role: m.role, content: m.content };
      }
      const parts: any[] = [{ type: "text", text: m.content || "Analise os documentos anexados." }];
      for (const a of m.attachments) {
        if (a.kind === "image") {
          parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
        } else {
          parts.push({ type: "file", file: { filename: a.name, file_data: a.dataUrl } });
        }
      }
      return { role: "user", content: parts };
    });

  const send = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading) return;
    const userMsg: Msg = { role: "user", content: text, attachments: attachments.length ? attachments : undefined };
    const next: Msg[] = [...messages, userMsg, { role: "assistant", content: "" }];
    setMessages(next);
    setInput("");
    setAttachments([]);
    setLoading(true);

    try {
      const outgoing = buildOutgoingMessages(next.slice(0, -1));
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON}`,
          apikey: ANON,
        },
        body: JSON.stringify({ messages: outgoing, model, area }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        throw new Error(`Juiz Virtual falhou (${res.status}): ${body || "sem detalhes"}`);
      }
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

  const selectedAgent = AGENTS.find((a) => a.id === model);
  const selectedArea = AREAS.find((a) => a.id === area);
  const agentGroups = groupBy([...AGENTS], (a) => a.provider);

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Gavel className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Juiz Virtual</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Descreva o caso. O agente emite um parecer imparcial fundamentado no direito brasileiro.
          </p>
        </div>
      </div>

      {/* Config Panel — collapsible */}
      <div className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 ease-in-out">
        <button
          type="button"
          onClick={() => setConfigOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${configOpen ? "rotate-180" : ""}`} />
            <span className="text-muted-foreground">Configuração</span>
            <Badge variant="secondary" className="text-[10px] font-normal gap-1">
              {selectedAgent?.label || "GPT-5.5"}
              <span className="text-muted-foreground">·</span>
              {selectedArea?.label || "Geral"}
            </Badge>
          </div>
        </button>

        <div
          className="grid transition-all duration-300 ease-in-out"
          style={{
            gridTemplateRows: configOpen ? "1fr" : "0fr",
            opacity: configOpen ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-border">
              <Tabs defaultValue="agents" className="mt-3">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="agents">Agentes Virtuais</TabsTrigger>
                  <TabsTrigger value="areas">Área de Especialização</TabsTrigger>
                </TabsList>

                <TabsContent value="agents" className="mt-3 space-y-4">
                  {agentGroups.map(({ label, items }) => (
                    <div key={label}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider ${PROVIDER_COLORS[label] || ""}`}>
                          {PROVIDER_LABELS[label] || label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {items.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => changeModel(a.id)}
                            className={`text-left rounded-lg border p-2.5 transition-all ${
                              model === a.id
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-card border-border hover:border-primary/40 hover:bg-muted/50"
                            }`}
                          >
                            <div className="text-xs font-semibold leading-tight">{a.label}</div>
                            <div className={`text-[11px] mt-0.5 leading-snug ${model === a.id ? "opacity-80" : "text-muted-foreground"}`}>
                              {a.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="areas" className="mt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {AREAS.map((a) => {
                      const Icon = a.icon;
                      const isActive = area === a.id;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => changeArea(a.id)}
                          className={`text-left rounded-lg border p-2.5 transition-all group ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-card border-border hover:border-primary/40 hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"}`} />
                            <div className="text-xs font-semibold leading-tight">{a.label}</div>
                          </div>
                          <div className={`text-[11px] mt-1 leading-snug ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                            {a.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <Card
        ref={scrollRef}
        className="p-3 sm:p-4 h-[50vh] sm:h-[55vh] overflow-y-auto space-y-4 bg-card"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Scale className="h-8 w-8 text-primary/60" />
            </div>
            <div className="space-y-2 max-w-md">
              <p className="text-sm font-medium text-foreground">Descreva seu caso jurídico</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Anexe documentos (PDF ou imagens) e descreva os fatos. O agente selecionado emitirá um parecer fundamentado no direito brasileiro.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg px-4 py-3 max-w-sm text-xs text-muted-foreground italic">
              "Trabalhei 3 anos sem carteira assinada, fui demitido sem aviso prévio. Tenho conversas de WhatsApp com o patrão confirmando o contrato. Quais direitos posso cobrar?"
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`rounded-xl px-3 py-2 max-w-[85%] text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground border border-border"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-2">
                  {m.content && <div className="whitespace-pre-wrap">{m.content}</div>}
                  {m.attachments?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {m.attachments.map((a, k) =>
                        a.kind === "image" ? (
                          <img key={k} src={a.dataUrl} alt={a.name} className="max-h-32 rounded border border-primary-foreground/20" />
                        ) : (
                          <div key={k} className="flex items-center gap-1 rounded bg-primary-foreground/10 px-2 py-1 text-xs">
                            <FileText className="h-3 w-3" /> {a.name}
                          </div>
                        )
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ))}
      </Card>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2 py-1 text-xs">
              {a.kind === "image" ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              <span className="max-w-[160px] truncate">{a.name}</span>
              <button type="button" onClick={() => removeAttachment(i)} className="opacity-60 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Input row */}
      <div className="flex gap-2 items-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="h-[90px] px-4 shrink-0"
          title="Anexar PDF ou imagem"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Descreva os fatos, provas e anexe PDF/imagens (Ctrl/Cmd+Enter envia)"
          className="min-h-[60px] sm:min-h-[90px]"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || (!input.trim() && attachments.length === 0)} className="h-[90px] px-5 shrink-0">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
