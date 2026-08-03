import { useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Badge } from "@/kenia/components/ui/badge";
import { FileText, ChevronDown, ChevronUp, Settings, Zap } from "lucide-react";

const AI_PROVIDERS = [
  {
    id: "fcc",
    name: "Claude FCC (Principal)",
    icon: "💻",
    description: "Claude FCC via OpenCode nemotron-3-ultra-free - provedor principal 24/7 via nuvem",
    color: "#f59e0b",
    models: ["Nemotron 3 Ultra (Free)", "Gemini 2.5 Flash", "OpenCode"],
    status: "ativo",
  },
  {
    id: "zen",
    name: "OpenCode Zen (Fallback)",
    icon: "⚡",
    description: "OpenCode Zen - Modelos otimizados (big-pickle, Claude, GPT, Gemini)",
    color: "#00d9ff",
    models: ["Big Pickle (Free)", "Claude Sonnet 4", "GPT-5.5", "Gemini 3.5 Flash", "DeepSeek V4 (Free)"],
    status: "ativo",
  },
  {
    id: "openrouter",
    name: "OpenRouter (Fallback)",
    icon: "🌐",
    description: "Fallback automatico quando FCC/Zen falharem",
    color: "#6366f1",
    models: ["Hermes 4 70B", "Nemotron (Free)", "Gemma 4 26B (Free)"],
    status: "configurado",
  },
  {
    id: "emergent",
    name: "Emergent (Ultimo Recurso)",
    icon: "🔑",
    description: "Multi-modelo: GPT, Claude, Gemini via API Emergent - so quando habilitado no painel",
    color: "#10b981",
    models: ["GPT-5.5", "GPT-5 Mini", "Claude Sonnet 4", "Gemini 2.5 Pro", "Gemini 2.5 Flash"],
    status: "opcional",
  },
];

const FALLBACK_ORDER = ["Claude FCC (Principal)", "OpenCode Zen (Fallback)", "OpenRouter (Fallback)", "Emergent (Ultimo Recurso)"];

const EMERGENT_STORAGE_KEY = "kenia:use_emergent";

const SECTIONS = [
  {
    title: "Secretaria Virtual (WhatsApp)",
    stack: "Claude FCC (nemotron-3-ultra-free) + Supabase Edge Functions",
    items: [
      "Recepcao 24/7 de mensagens no WhatsApp.",
      "Persona fixa: Kenia Garcia — nunca revela ser IA.",
      "Fallback automatico: FCC → Zen → OpenRouter → Emergent (opcional).",
      "Roteamento por modelo: big-pickle, GPT, Claude, Gemini.",
    ],
  },
  {
    title: "Chaves Configuradas",
    stack: "Supabase Secrets + Dashboard Local",
    items: [
      "ZEN_API_KEY — configurada",
      "Claude FCC — via ngrok/proxy combinado (FCC + Ollama)",
      "EMERGENT_API_KEY — opcional, so ativado no painel abaixo",
    ],
  },
];

export default function SystemReportCard() {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("report");
  const [useEmergent, setUseEmergent] = useState(
    () => localStorage.getItem(EMERGENT_STORAGE_KEY) === "true"
  );

  const toggleEmergent = () => {
    const next = !useEmergent;
    setUseEmergent(next);
    localStorage.setItem(EMERGENT_STORAGE_KEY, String(next));
  };

  return (
    <Card className="mx-4 mt-4 p-4 border-nude-200">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-gold-600" />
        <h3 className="font-display font-semibold text-sm">Painel Administrativo</h3>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Ativo</Badge>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveTab("report")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeTab === "report" ? "bg-gold-100 text-gold-800" : "bg-nude-100 text-nude-600 hover:bg-nude-200"}`}
        >
          <FileText className="w-3 h-3 inline mr-1" /> Relatorio
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${activeTab === "config" ? "bg-violet-100 text-violet-800" : "bg-nude-100 text-nude-600 hover:bg-nude-200"}`}
        >
          <Zap className="w-3 h-3 inline mr-1" /> Configuracoes IA
        </button>
      </div>

      {open && activeTab === "report" && (
        <div className="grid md:grid-cols-2 gap-3">
          {SECTIONS.map((s) => (
            <div key={s.title} className="border border-nude-200 rounded-md p-3 bg-nude-50/40">
              <div className="font-semibold text-sm text-nude-900">{s.title}</div>
              <div className="text-[11px] text-gold-700 font-mono mb-2">{s.stack}</div>
              <ul className="list-disc list-inside space-y-1 text-xs text-nude-700">
                {s.items.map((it, i) => <li key={i}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {open && activeTab === "config" && (
        <div className="space-y-3">
          <div className="border border-nude-200 rounded-md p-3 bg-nude-50/40">
            <div className="font-semibold text-sm text-nude-900 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold-600" /> Fallback Automatico
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {FALLBACK_ORDER.map((step, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="bg-violet-100 text-violet-800 px-2 py-1 rounded font-medium">{i + 1}. {step}</span>
                  {i < FALLBACK_ORDER.length - 1 && <span className="text-nude-400">→</span>}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-nude-500 mt-2">Claude FCC e o provedor principal (nemotron-3-ultra-free). Se falhar, muda para Zen → OpenRouter. Emergent e o ultimo recurso, so quando habilitado abaixo.</p>
          </div>

          <div className="border border-nude-200 rounded-md p-3 bg-nude-50/40">
            <div className="font-semibold text-sm text-nude-900 mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold-600" /> Emergent (Ultimo Recurso)
            </div>
            <p className="text-[11px] text-nude-500 mb-2">Ative apenas se quiser usar a API Emergent como ultimo recurso apos FCC/Zen/OpenRouter falharem. Desligado por padrao.</p>
            <button
              type="button"
              onClick={toggleEmergent}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${useEmergent ? "bg-emerald-500" : "bg-nude-300"}`}
              aria-pressed={useEmergent}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${useEmergent ? "translate-x-[18px]" : "translate-x-0.5"}`}
              />
            </button>
            <span className="ml-2 text-xs font-medium text-nude-800">
              {useEmergent ? "Emergent habilitado" : "Emergent desabilitado"}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-2">
            {AI_PROVIDERS.map((p) => (
              <div key={p.id} className="border rounded-md p-3 bg-white" style={{ borderColor: p.color + "40" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{p.icon}</span>
                  <span className="font-semibold text-xs text-nude-900">{p.name}</span>
                </div>
                <p className="text-[11px] text-nude-600 mb-2">{p.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {p.models.map((m) => (
                    <span key={m} className="text-[10px] bg-nude-100 text-nude-700 px-1.5 py-0.5 rounded">{m}</span>
                  ))}
                </div>
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: p.color, color: p.color }}>
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
