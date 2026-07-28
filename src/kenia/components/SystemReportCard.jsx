import { useState } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Badge } from "@/kenia/components/ui/badge";
import { FileText, ChevronDown, ChevronUp, Settings, Zap } from "lucide-react";

const AI_PROVIDERS = [
  {
    id: "zen",
    name: "OpenCode Zen (Principal)",
    icon: "⚡",
    description: "OpenCode Zen - Modelos otimizados (big-pickle, Claude, GPT, Gemini)",
    color: "#00d9ff",
    models: ["Big Pickle (Free)", "Claude Sonnet 4", "GPT-5.5", "Gemini 3.5 Flash", "DeepSeek V4 (Free)"],
    status: "ativo",
  },
  {
    id: "emergent",
    name: "Emergent (Fallback)",
    icon: "🔑",
    description: "Multi-modelo: GPT, Claude, Gemini via API Emergent",
    color: "#10b981",
    models: ["GPT-5.5", "GPT-5 Mini", "Claude Sonnet 4", "Gemini 2.5 Pro", "Gemini 2.5 Flash"],
    status: "configurado",
  },
  {
    id: "openrouter",
    name: "OpenRouter (Fallback)",
    icon: "🌐",
    description: "Quando Emergent acabar credito, usa OpenRouter automaticamente",
    color: "#6366f1",
    models: ["Hermes 4 70B", "Nemotron (Free)", "Gemma 4 26B (Free)"],
    status: "configurado",
  },
  {
    id: "fcc",
    name: "Claude FCC (Local)",
    icon: "💻",
    description: "Servidor local - funciona quando PC estiver ligado",
    color: "#f59e0b",
    models: ["Claude Sonnet 4", "Nemotron 120B"],
    status: "rodando",
  },
];

const FALLBACK_ORDER = ["OpenCode Zen (Principal)", "Emergent (Fallback)", "OpenRouter (Fallback)", "Claude FCC (Local)"];

const SECTIONS = [
  {
    title: "Secretaria Virtual (WhatsApp)",
    stack: "OpenCode Zen (big-pickle) + Supabase Edge Functions",
    items: [
      "Recepcao 24/7 de mensagens no WhatsApp.",
      "Persona fixa: Kenia Garcia — nunca revela ser IA.",
      "Fallback automatico: Zen → Emergent → OpenRouter → FCC.",
      "Roteamento por modelo: big-pickle, GPT, Claude, Gemini.",
    ],
  },
  {
    title: "Chaves Configuradas",
    stack: "Supabase Secrets + Dashboard Local",
    items: [
      "ZEN_API_KEY — sk-xxtVUim9LH01AvL5ZYfecVTWXP9IbHLLrowGXrCTlQMwf5fndFqq5bsFeHURbNl8",
      "EMERGENT_API_KEY — sk-emergent-e69E465EfCaEa16C2A",
      "Claude FCC — localhost:8082 (auto-start no boot)",
    ],
  },
];

export default function SystemReportCard() {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("report");

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
            <p className="text-[11px] text-nude-500 mt-2">OpenCode Zen e o provedor principal (big-pickle, gratuito). Se falhar, muda para Emergent → OpenRouter → Claude FCC local.</p>
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
