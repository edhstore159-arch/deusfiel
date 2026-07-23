import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Badge } from "@/kenia/components/ui/badge";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Checkbox } from "@/kenia/components/ui/checkbox";
import { Progress } from "@/kenia/components/ui/progress";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/kenia/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/kenia/components/ui/dialog";
import {
  ClipboardCheck, Kanban, Plus, Trash2, ChevronDown, ChevronRight,
  CheckCircle2, Circle, Clock, ArrowRight, Sparkles, Eye, EyeOff,
  Scale, Printer, RefreshCcw, Loader2, Target, User, Bot, BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AreaAvatar from "@/kenia/components/AreaAvatar";
import { LAWYERS, LAWYER_COLORS } from "@/kenia/data/lawyers";

import CompetitorAnalysis from "@/kenia/pages/CompetitorAnalysis";

const AGENTS_STORAGE_KEY = "kenia_ai_agents_v1";

const readAgents = () => {
  try {
    return JSON.parse(localStorage.getItem(AGENTS_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const STORAGE_KEY = "dstboard:processes.v1";

const CHECKLIST_CATEGORIES = [
  {
    id: "comercial",
    label: "Comercial",
    color: "blue",
    items: [
      "Contrato de honorários assinado",
      "Procuração assinada",
      "Declaração de hipossuficiência (quando cabível)",
      "Contrato de êxito (se houver)",
      "Pagamento da entrada confirmado",
    ],
  },
  {
    id: "cadastro",
    label: "Cadastro do Cliente",
    color: "green",
    items: [
      "Cadastro completo no sistema",
      "CPF e RG",
      "Comprovante de endereço",
      "Estado civil",
      "Profissão",
      "Telefone",
      "E-mail",
      "Contato de emergência",
    ],
  },
  {
    id: "pasta",
    label: "Pasta do Processo",
    color: "purple",
    items: [
      "Criar pasta no computador",
      "Criar pasta no Google Drive/OneDrive",
      "Nome padronizado: ANO – Nome do Cliente – Tipo de Ação",
    ],
  },
  {
    id: "documentos",
    label: "Documentos",
    color: "orange",
    items: [
      "Conferir documentos obrigatórios",
      "Digitalizar",
      "Nomear corretamente os arquivos",
      "Verificar se falta algum documento",
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    color: "emerald",
    items: [
      "Emitir recibo",
      "Emitir nota fiscal",
      "Lançar no fluxo de caixa",
      "Agendar parcelas futuras",
      "Conferir custas",
    ],
  },
  {
    id: "planejamento",
    label: "Planejamento Jurídico",
    color: "yellow",
    items: [
      "Definir estratégia",
      "Pesquisar jurisprudência",
      "Pesquisar legislação",
      "Definir pedidos",
      "Definir provas",
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    color: "red",
    items: [
      "Agendar prazo para protocolo",
      "Agendar retorno ao cliente",
      "Agendar acompanhamento semanal",
      "Agendar audiência (quando existir)",
    ],
  },
  {
    id: "comunicacao",
    label: "Comunicação",
    color: "blue",
    items: [
      "Enviar mensagem de boas-vindas",
      "Informar próximos passos",
      "Informar prazo estimado",
      "Explicar como será a comunicação",
    ],
  },
  {
    id: "controle",
    label: "Controle Interno",
    color: "purple",
    items: [
      "Advogado responsável",
      "Assistente responsável",
      "Prazo final",
      "Checklist revisado",
    ],
  },
  {
    id: "antes_protocolo",
    label: "Antes do Protocolo",
    color: "orange",
    items: [
      "Revisão ortográfica",
      "Revisão jurídica",
      "Conferência de anexos",
      "Conferência da procuração",
      "Conferência das custas",
      "Conferência dos documentos",
    ],
  },
  {
    id: "apos_protocolo",
    label: "Após o Protocolo",
    color: "green",
    items: [
      "Enviar comprovante ao cliente",
      "Informar número do processo",
      "Explicar próximos passos",
      "Inserir acompanhamento no sistema",
      "Agendar verificação em 15 dias",
    ],
  },
];

const PIPELINE_STAGES = [
  { id: "novo_lead", label: "Novo Lead", color: "blue" },
  { id: "consulta", label: "Consulta", color: "yellow" },
  { id: "contrato", label: "Contrato", color: "green" },
  { id: "documentacao", label: "Documentação", color: "purple" },
  { id: "pesquisa_juridica", label: "Pesquisa Jurídica", color: "orange" },
  { id: "peticao_inicial", label: "Petição Inicial", color: "emerald" },
  { id: "protocolo", label: "Protocolo", color: "blue" },
  { id: "aguardando_despacho", label: "Aguardando Despacho", color: "yellow" },
  { id: "audiencia", label: "Audiência", color: "red" },
  { id: "recursos", label: "Recursos", color: "purple" },
  { id: "cumprimento_sentenca", label: "Cumprimento de Sentença", color: "green" },
  { id: "arquivamento", label: "Arquivamento", color: "nude" },
];

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-200" },
  yellow: { bg: "bg-gold-50", text: "text-gold-800", dot: "bg-gold-500", border: "border-gold-200" },
  green: { bg: "bg-gold-50", text: "text-gold-700", dot: "bg-gold-600", border: "border-gold-200" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", border: "border-purple-200" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", border: "border-orange-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200" },
  red: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-200" },
  nude: { bg: "bg-nude-50", text: "text-nude-700", dot: "bg-nude-500", border: "border-nude-200" },
};

const readProcesses = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeProcesses = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
};

const STAGE_LABELS = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.id, s.label]));

const buildDstboardJudgeText = (process) => {
  const lines = [];
  lines.push(`Cliente: ${process.client_name}`);
  lines.push(`Tipo de Ação: ${process.case_type}`);
  lines.push(`Etapa do processo: ${STAGE_LABELS[process.stage] || process.stage}`);
  if (process.description) lines.push(`Observações: ${process.description}`);

  const totalProgress = calcTotalProgress(process);
  lines.push(`\nProgresso geral do checklist: ${totalProgress}%`);

  const completedCats = [];
  const pendingCats = [];
  for (const cat of CHECKLIST_CATEGORIES) {
    const catProgress = calcCategoryProgress(process, cat.id);
    if (catProgress === 100) {
      completedCats.push(cat.label);
    } else if (catProgress > 0) {
      pendingCats.push(`${cat.label} (${catProgress}%)`);
    }
  }
  if (completedCats.length) lines.push(`Categorias concluídas: ${completedCats.join(", ")}`);
  if (pendingCats.length) lines.push(`Categorias em andamento: ${pendingCats.join(", ")}`);

  lines.push(`\nProduza o PARECER TÉCNICO completo do Juiz Virtual sobre este caso, seguindo integralmente a estrutura obrigatória.`);
  return lines.join("\n");
};

const printParecer = (process, text) => {
  const stageLabel = STAGE_LABELS[process.stage] || process.stage;
  const progress = calcTotalProgress(process);
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Parecer - ${process.client_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #1a1a1a; padding: 2cm; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px double #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    .header .subtitle { font-size: 11pt; margin-top: 4px; color: #555; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 10pt; color: #555; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 20px; font-size: 11pt; }
    .info-grid dt { font-weight: bold; color: #333; }
    .info-grid dd { color: #555; }
    .content { text-align: justify; white-space: pre-wrap; }
    .footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 12px; font-size: 9pt; color: #888; text-align: center; }
    @media print { body { padding: 1.5cm; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Parecer do Juiz Virtual</h1>
    <div class="subtitle">Kenia Garcia Advocacia</div>
  </div>
  <div class="meta">
    <span>Data: ${new Date().toLocaleDateString("pt-BR")}</span>
    <span>Documento gerado automaticamente</span>
  </div>
  <dl class="info-grid">
    <dt>Cliente</dt><dd>${process.client_name}</dd>
    <dt>Tipo de Ação</dt><dd>${process.case_type}</dd>
    <dt>Etapa</dt><dd>${stageLabel}</dd>
    <dt>Progresso</dt><dd>${progress}%</dd>
  </dl>
  <div class="content">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  <div class="footer">Kenia Garcia Advocacia — Documento gerado em ${new Date().toLocaleString("pt-BR")}</div>
</body>
</html>`;
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
};

const calcCategoryProgress = (process, categoryId) => {
  const cat = CHECKLIST_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return 0;
  const checks = process.checks?.[categoryId] || {};
  const done = cat.items.filter((_, i) => checks[i]).length;
  return Math.round((done / cat.items.length) * 100);
};

const calcTotalProgress = (process) => {
  const total = CHECKLIST_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);
  let done = 0;
  for (const cat of CHECKLIST_CATEGORIES) {
    const checks = process.checks?.[cat.id] || {};
    done += cat.items.filter((_, i) => checks[i]).length;
  }
  return Math.round((done / total) * 100);
};

const getStageProgress = (process) => {
  const idx = PIPELINE_STAGES.findIndex((s) => s.id === process.stage);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / PIPELINE_STAGES.length) * 100);
};

export default function Dstboard() {
  const [processes, setProcesses] = useState([]);
  const [activeProcess, setActiveProcess] = useState(null);
  const [view, setView] = useState("checklist");
  const [open, setOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const [form, setForm] = useState({
    client_name: "",
    case_type: "",
    description: "",
    stage: "novo_lead",
  });
  const [judgeText, setJudgeText] = useState("");
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [judgeCache, setJudgeCache] = useState({});
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "dstboard-print-styles";
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .print-area, .print-area * { visibility: visible; }
        .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const existing = document.getElementById("dstboard-print-styles");
      if (existing) existing.remove();
    };
  }, []);

  useEffect(() => {
    const loaded = readProcesses();
    setProcesses(loaded);
    if (loaded.length > 0 && !activeProcess) {
      setActiveProcess(loaded[0].id);
    }
    setAgents(readAgents());
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        const updated = readProcesses();
        setProcesses(updated);
      }
    };
    window.addEventListener("storage", handleStorage);

    const interval = setInterval(() => {
      setProcesses((prev) => {
        const stored = readProcesses();
        if (JSON.stringify(stored) !== JSON.stringify(prev)) {
          return stored;
        }
        return prev;
      });
    }, 3000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    writeProcesses(processes);
  }, [processes]);

  useEffect(() => {
    if (activeProcess) {
      setJudgeText(judgeCache[activeProcess] || "");
    }
  }, [activeProcess, judgeCache]);

  const createProcess = () => {
    if (!form.client_name || !form.case_type) {
      toast.error("Cliente e tipo de ação são obrigatórios");
      return;
    }
    const newProc = {
      id: `proc-${Date.now()}`,
      client_name: form.client_name,
      case_type: form.case_type,
      description: form.description,
      stage: form.stage,
      checks: {},
      created_at: new Date().toISOString(),
    };
    setProcesses((prev) => [newProc, ...prev]);
    setActiveProcess(newProc.id);
    setOpen(false);
    setForm({ client_name: "", case_type: "", description: "", stage: "novo_lead" });
    toast.success("Processo criado");
  };

  const removeProcess = (id) => {
    if (!confirm("Excluir este processo?")) return;
    setProcesses((prev) => prev.filter((p) => p.id !== id));
    if (activeProcess === id) {
      setActiveProcess(processes.find((p) => p.id !== id)?.id || null);
    }
    toast.success("Processo excluído");
  };

  const toggleCheck = (processId, categoryId, itemIndex) => {
    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id !== processId) return p;
        const checks = { ...p.checks };
        const catChecks = { ...(checks[categoryId] || {}) };
        catChecks[itemIndex] = !catChecks[itemIndex];
        checks[categoryId] = catChecks;
        return { ...p, checks };
      })
    );
  };

  const moveStage = (processId, newStage) => {
    setProcesses((prev) =>
      prev.map((p) => (p.id === processId ? { ...p, stage: newStage } : p))
    );
  };

  const toggleCategory = (catId) => {
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const runJudge = async (process) => {
    if (!process) return;
    setJudgeLoading(true);
    setJudgeText("");
    try {
      const caseText = buildDstboardJudgeText(process);
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const supaUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(`${supaUrl}/functions/v1/judge-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey || "",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ case: caseText, model: "gpt-4o-mini" }),
      });
      const ct = resp.headers.get("Content-Type") || "";
      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        throw new Error(errData?.error || `HTTP ${resp.status}`);
      }
      if (!ct.includes("text/event-stream")) {
        const errData = await resp.json().catch(() => null);
        if (errData?.error) throw new Error(errData.error);
        throw new Error("Resposta inesperada do servidor");
      }
      if (!resp.body) {
        throw new Error("Resposta sem conteúdo");
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith("data:")) continue;
          const payload = s.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const delta =
              j?.choices?.[0]?.delta?.content ??
              j?.choices?.[0]?.message?.content ??
              "";
            if (delta) {
              acc += delta;
              setJudgeText((prev) => prev + delta);
            }
          } catch { /* ignore keep-alive/comments */ }
        }
      }
      setJudgeCache((c) => ({ ...c, [process.id]: acc }));
    } catch (e) {
      toast.error("Juiz Virtual: " + (e?.message || "falha"));
    } finally {
      setJudgeLoading(false);
    }
  };

  const active = processes.find((p) => p.id === activeProcess);

  const allLeads = processes;

  return (
    <div className="h-screen flex flex-col bg-nude-50" data-testid="dstboard-page">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-nude-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold">Painel de Controle</div>
          <h1 className="font-serif text-3xl text-nude-900 mt-1 tracking-tight">Dstboard Jurídico</h1>
          <div className="text-xs text-nude-500 mt-0.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-gold-500" />
            {processes.length} processo(s) · checklist + pipeline integrados
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => {
              const loaded = readProcesses();
              setProcesses(loaded);
              toast.success("Dados atualizados");
            }}
            data-testid="refresh-btn"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Atualizar
          </Button>
          <div className="flex bg-nude-100 rounded-md p-0.5 overflow-x-auto">
            <button
              onClick={() => setView("checklist")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                view === "checklist" ? "bg-white text-nude-900 shadow-sm" : "text-nude-500 hover:text-nude-700"
              }`}
              data-testid="view-checklist"
            >
              <ClipboardCheck className="w-3.5 h-3.5 mr-1.5 inline" />
              Checklist
            </button>
            <button
              onClick={() => setView("pipeline")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                view === "pipeline" ? "bg-white text-nude-900 shadow-sm" : "text-nude-500 hover:text-nude-700"
              }`}
              data-testid="view-pipeline"
            >
              <Kanban className="w-3.5 h-3.5 mr-1.5 inline" />
              Pipeline
            </button>
            <button
              onClick={() => setView("competitors")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                view === "competitors" ? "bg-white text-nude-900 shadow-sm" : "text-nude-500 hover:text-nude-700"
              }`}
              data-testid="view-competitors"
            >
              <Target className="w-3.5 h-3.5 mr-1.5 inline" />
              Concorrentes
            </button>
            <button
              onClick={() => setView("agents")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                view === "agents" ? "bg-white text-nude-900 shadow-sm" : "text-nude-500 hover:text-nude-700"
              }`}
              data-testid="view-agents"
            >
              <Bot className="w-3.5 h-3.5 mr-1.5 inline" />
              Agentes
            </button>
            <button
              onClick={() => setView("lawyers")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                view === "lawyers" ? "bg-white text-nude-900 shadow-sm" : "text-nude-500 hover:text-nude-700"
              }`}
              data-testid="view-lawyers"
            >
              <User className="w-3.5 h-3.5 mr-1.5 inline" />
              Advogados
            </button>
            <button
              onClick={() => setView("analises")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                view === "analises" ? "bg-white text-nude-900 shadow-sm" : "text-nude-500 hover:text-nude-700"
              }`}
              data-testid="view-analises"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 inline" />
              Análises
            </button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-nude-900 hover:bg-nude-800" data-testid="new-process-btn">
                <Plus className="w-4 h-4 mr-2" /> Novo Processo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Processo</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Cliente</Label>
                  <Input
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    data-testid="proc-client"
                  />
                </div>
                <div>
                  <Label>Tipo de Ação</Label>
                  <Select value={form.case_type} onValueChange={(v) => setForm({ ...form, case_type: v })}>
                    <SelectTrigger data-testid="proc-type">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Família", "Sucessões", "Bancário", "Previdenciário/INSS", "Trabalhista", "Cível", "Criminal", "Consumidor", "Empresarial", "Tributário"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Etapa Inicial</Label>
                  <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                    <SelectTrigger data-testid="proc-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    data-testid="proc-desc"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createProcess} className="bg-nude-900 hover:bg-nude-800" data-testid="proc-submit">
                  Criar Processo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {view === "checklist" ? (
          <ChecklistView
            processes={processes}
            active={active}
            setActiveProcess={setActiveProcess}
            removeProcess={removeProcess}
            toggleCheck={toggleCheck}
            expandedCats={expandedCats}
            toggleCategory={toggleCategory}
            moveStage={moveStage}
            judgeText={judgeText}
            judgeLoading={judgeLoading}
            runJudge={runJudge}
          />
        ) : view === "competitors" ? (
          <CompetitorAnalysis />
        ) : view === "agents" ? (
          <AgentsView agents={agents} />
        ) : view === "lawyers" ? (
          <LawyersView />
        ) : view === "analises" ? (
          <AnalisesView />
        ) : (
          <PipelineView
            processes={allLeads}
            moveStage={moveStage}
            setActiveProcess={setActiveProcess}
            setView={setView}
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/* CHECKLIST VIEW                              */
/* ──────────────────────────────────────────── */
function ChecklistView({
  processes, active, setActiveProcess, removeProcess,
  toggleCheck, expandedCats, toggleCategory, moveStage,
  judgeText, judgeLoading, runJudge,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <>
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed bottom-4 left-4 z-50 bg-gold-600 text-white p-3 rounded-full shadow-lg"
      >
        <ClipboardCheck className="w-5 h-5" />
      </button>

      {/* Left sidebar — process list */}
      <div className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-72 shrink-0 border-r border-nude-200 bg-white flex flex-col transition-transform`}>
        <div className="p-3 border-b border-nude-200">
          <div className="text-xs font-semibold text-nude-500 uppercase tracking-wider">Processos</div>
        </div>
        <ScrollArea className="flex-1">
          {processes.map((p) => {
            const progress = calcTotalProgress(p);
            const isActive = active?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActiveProcess(p.id)}
                className={`w-full text-left px-3 py-3 border-b border-nude-100 transition-colors ${
                  isActive ? "bg-gold-50" : "hover:bg-nude-50"
                }`}
                data-testid={`process-item-${p.id}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-medium text-sm text-nude-900 truncate">{p.client_name}</div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeProcess(p.id); }}
                    className="text-nude-400 hover:text-rose-500 shrink-0"
                    data-testid={`delete-process-${p.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-xs text-nude-500 mb-1.5">{p.case_type}</div>
                <div className="flex items-center gap-2">
                  <Progress value={progress} className="h-1.5 flex-1" />
                  <span className="text-[10px] font-semibold text-nude-600">{progress}%</span>
                </div>
              </button>
            );
          })}
          {processes.length === 0 && (
            <div className="p-6 text-center text-sm text-nude-400">Nenhum processo</div>
          )}
        </ScrollArea>
      </div>

      {/* Right — checklist details */}
      <div className="flex-1 overflow-auto">
        {active ? (
          <ChecklistDetail
            process={active}
            toggleCheck={toggleCheck}
            expandedCats={expandedCats}
            toggleCategory={toggleCategory}
            moveStage={moveStage}
            judgeText={judgeText}
            judgeLoading={judgeLoading}
            runJudge={runJudge}
          />
        ) : (
          <div className="flex-1 grid place-items-center text-nude-400 text-sm h-full">
            Selecione um processo
          </div>
        )}
      </div>
    </>
  );
}

/* ──────────────────────────────────────────── */
/* AGENTS VIEW                                 */
/* ──────────────────────────────────────────── */
function AgentsView({ agents }) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="overline text-gold-600">Inteligência</div>
          <h1 className="font-serif text-2xl text-nude-900 mt-1 flex items-center gap-2">
            <Bot className="w-6 h-6 text-gold-600" /> Agentes de IA
          </h1>
          <p className="text-sm text-nude-500 mt-1">
            {agents.length} agente(s) configurado(s) · Clique em "Agentes IA" no menu lateral para editar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <Card
              key={a.id}
              className={`border-nude-200 overflow-hidden transition-all hover:shadow-md ${
                !a.active ? "opacity-60" : ""
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  {a.avatar ? (
                    <img src={a.avatar} alt={a.name} className="w-12 h-12 rounded-full object-cover border border-nude-200 shrink-0" />
                  ) : (
                    <AreaAvatar area={a.area} size="md" name={a.name} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-nude-900 text-sm truncate">{a.name || "Sem nome"}</div>
                    <div className="text-xs text-nude-500 mt-0.5">{a.area} · {a.tone}</div>
                  </div>
                  <Badge className={`text-[10px] shrink-0 ${a.active ? "bg-gold-600 text-white" : "bg-nude-200 text-nude-600"}`}>
                    {a.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                {a.greeting && (
                  <div className="text-xs text-nude-600 bg-nude-50 rounded-md p-2 mb-2 border border-nude-100">
                    "{a.greeting}"
                  </div>
                )}

                {a.goal && (
                  <div className="text-[11px] text-nude-500 mb-2 line-clamp-2">
                    <span className="font-semibold">Objetivo:</span> {a.goal}
                  </div>
                )}

                {a.instructions && (
                  <div className="text-[11px] text-nude-500 bg-gold-50 rounded-md p-2 border border-gold-100 line-clamp-3">
                    <span className="font-semibold text-gold-700">Instruções:</span> {a.instructions}
                  </div>
                )}
              </div>
            </Card>
          ))}

          {agents.length === 0 && (
            <div className="col-span-full text-center py-12 text-nude-400 text-sm">
              Nenhum agente configurado. Acesse "Agentes IA" no menu lateral para criar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/* LAWYERS VIEW                                */
/* ──────────────────────────────────────────── */
function LawyersView() {
  const LAWYER_COLORS = {
    rose: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-200", avatar: "bg-rose-100" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-200", avatar: "bg-blue-100" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200", avatar: "bg-emerald-100" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", border: "border-purple-200", avatar: "bg-purple-100" },
    gold: { bg: "bg-gold-50", text: "text-gold-700", dot: "bg-gold-500", border: "border-gold-200", avatar: "bg-gold-100" },
    orange: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", border: "border-orange-200", avatar: "bg-orange-100" },
    green: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", border: "border-green-200", avatar: "bg-green-100" },
    red: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", border: "border-red-200", avatar: "bg-red-100" },
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="overline text-gold-600">Equipe</div>
          <h1 className="font-serif text-2xl text-nude-900 mt-1 flex items-center gap-2">
            <User className="w-6 h-6 text-gold-600" /> Advogados Especializados
          </h1>
          <p className="text-sm text-nude-500 mt-1">
            {LAWYERS.length} advogado(s) · Especialistas em cada área do direito
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LAWYERS.map((lawyer) => {
            const c = LAWYER_COLORS[lawyer.color] || LAWYER_COLORS.blue;

            return (
              <Card
                key={lawyer.id}
                className="border-nude-200 overflow-hidden transition-all hover:shadow-md hover:border-gold-300"
              >
                <div className={`${c.bg} px-4 py-3 border-b ${c.border}`}>
                  <div className="flex items-center gap-3">
                    {lawyer.avatar ? (
                      <img src={lawyer.avatar} alt={lawyer.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                    ) : (
                      <AreaAvatar area={lawyer.area} size="lg" name={lawyer.name} className="border-2 border-white shadow-sm" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-nude-900 text-sm truncate">{lawyer.name}</div>
                      <div className="text-[11px] text-nude-500 mt-0.5 font-mono">{lawyer.oab}</div>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${c.bg} ${c.text} border ${c.border}`}>
                      {lawyer.area}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-nude-700 mb-1">{lawyer.specialty}</div>
                    <div className="text-[11px] text-nude-500 leading-relaxed">{lawyer.bio}</div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-nude-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-nude-400" />
                      {lawyer.experience}
                    </div>
                    <div className="flex items-center gap-1">
                      <Scale className="w-3 h-3 text-nude-400" />
                      {lawyer.cases}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {lawyer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-nude-100 text-nude-600 border border-nude-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/* ANALISES VIEW — Pareceres do Juiz Virtual   */
/* ──────────────────────────────────────────── */
function AnalisesView() {
  const [opinions, setOpinions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpinion, setSelectedOpinion] = useState(null);

  useEffect(() => {
    loadOpinions();
  }, []);

  const loadOpinions = async () => {
    setLoading(true);
    try {
      // Tentar carregar do Supabase primeiro
      const { data, error } = await supabase
        .from("case_opinions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data?.length) {
        setOpinions(data);
      } else {
        // Fallback para localStorage
        const stored = JSON.parse(localStorage.getItem("case_opinions") || "[]");
        setOpinions(stored);
      }
    } catch {
      const stored = JSON.parse(localStorage.getItem("case_opinions") || "[]");
      setOpinions(stored);
    }
    setLoading(false);
  };

  const statusColors = {
    em_analise: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Em Análise" },
    analise_advogado: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Advogado Analisando" },
    parecer_pronto: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Parecer Pronto" },
    revisao: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", label: "Em Revisão" },
  };

  const priorityColors = {
    baixa: { bg: "bg-nude-100", text: "text-nude-600", label: "Baixa" },
    normal: { bg: "bg-blue-50", text: "text-blue-600", label: "Normal" },
    alta: { bg: "bg-orange-50", text: "text-orange-600", label: "Alta" },
    urgente: { bg: "bg-red-50", text: "text-red-600", label: "Urgente" },
  };

  const areaIcons = {
    Penal: "⚖️", Cível: "📋", Trabalhista: "👷", Família: "👨‍👩‍👧",
    Previdenciário: "🏛️", Tributário: "💰", Administrativo: "📜",
    Constitucional: "📕", Empresarial: "🏢", Consumidor: "🛒",
    Ambiental: "🌿", Eleitoral: "🗳️", Internacional: "🌎", Sucessões: "📜",
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="overline text-gold-600">Pareceres</div>
          <h1 className="font-serif text-2xl text-nude-900 mt-1 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gold-600" /> Análises e Pareceres
          </h1>
          <p className="text-sm text-nude-500 mt-1">
            {opinions.length} caso(s) analisado(s) · Pareceres do Juiz Virtual
          </p>
        </div>

        {opinions.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 text-nude-300 mx-auto mb-4" />
            <div className="text-nude-500 text-sm">Nenhuma análise realizada ainda.</div>
            <div className="text-nude-400 text-xs mt-1">
              Os pareceres aparecerão aqui quando a atendente processar casos no WhatsApp.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opinions.map((op) => {
              const st = statusColors[op.status] || statusColors.em_analise;
              const pr = priorityColors[op.priority] || priorityColors.normal;

              return (
                <Card
                  key={op.id}
                  className="border-nude-200 overflow-hidden transition-all hover:shadow-md hover:border-gold-300 cursor-pointer"
                  onClick={() => setSelectedOpinion(op)}
                >
                  <div className={`${st.bg} px-4 py-2 border-b ${st.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{areaIcons[op.area] || "⚖️"}</span>
                        <span className={`text-xs font-semibold ${st.text}`}>{op.area}</span>
                      </div>
                      <Badge className={`text-[10px] ${st.bg} ${st.text} border ${st.border}`}>
                        {st.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <AreaAvatar area={op.area} size="sm" name={op.visitor_name} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-nude-900 text-sm truncate">{op.visitor_name || "Cliente"}</div>
                        <div className="text-[11px] text-nude-500 font-mono">{op.visitor_phone || "—"}</div>
                      </div>
                      <Badge className={`text-[10px] ${pr.bg} ${pr.text}`}>
                        {pr.label}
                      </Badge>
                    </div>

                    {op.lawyer_name && (
                      <div className="text-xs text-nude-600 bg-blue-50 rounded-md p-2 border border-blue-100">
                        <span className="font-semibold text-blue-700">Advogado:</span> {op.lawyer_name}
                      </div>
                    )}

                    {op.client_data?.resumo && (
                      <div className="text-[11px] text-nude-500 line-clamp-2">{op.client_data.resumo}</div>
                    )}

                    {op.judge_opinion && (
                      <div className="text-[11px] text-emerald-600 bg-emerald-50 rounded-md p-2 border border-emerald-100 line-clamp-3">
                        <span className="font-semibold">Parecer:</span> {op.judge_opinion.slice(0, 150)}...
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-nude-400">
                      <Clock className="w-3 h-3" />
                      {formatDate(op.created_at)}
                      {op.judge_opinion_at && (
                        <span className="text-emerald-500">· Parecer: {formatDate(op.judge_opinion_at)}</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail Modal */}
        {selectedOpinion && (
          <Dialog open={!!selectedOpinion} onOpenChange={() => setSelectedOpinion(null)}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{areaIcons[selectedOpinion.area] || "⚖️"}</span>
                  Parecer — {selectedOpinion.area}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-nude-100 border border-nude-200 flex items-center justify-center">
                      <span className="text-xs font-bold text-nude-600">
                        {(selectedOpinion.visitor_name || "CL").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{selectedOpinion.visitor_name || "Cliente"}</div>
                      <div className="text-xs text-nude-500">{selectedOpinion.visitor_phone}</div>
                    </div>
                  </div>
                  <Badge className={`text-xs ${statusColors[selectedOpinion.status]?.bg} ${statusColors[selectedOpinion.status]?.text}`}>
                    {statusColors[selectedOpinion.status]?.label || selectedOpinion.status}
                  </Badge>
                </div>

                {selectedOpinion.lawyer_name && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="text-xs font-semibold text-blue-700 mb-1">Análise do Advogado — {selectedOpinion.lawyer_name}</div>
                    <div className="text-xs text-blue-600">
                      Área: {selectedOpinion.lawyer_area || selectedOpinion.area}
                    </div>
                    {selectedOpinion.lawyer_analysis && typeof selectedOpinion.lawyer_analysis === "object" && (
                      <div className="text-xs text-nude-600 mt-2 space-y-1">
                        {selectedOpinion.lawyer_analysis.orientacao_juridica && (
                          <div><span className="font-semibold">Orientação:</span> {selectedOpinion.lawyer_analysis.orientacao_juridica}</div>
                        )}
                        {selectedOpinion.lawyer_analysis.avaliacao_viabilidade && (
                          <div><span className="font-semibold">Viabilidade:</span> {selectedOpinion.lawyer_analysis.avaliacao_viabilidade}</div>
                        )}
                        {selectedOpinion.lawyer_analysis.documentos_necessarios?.length > 0 && (
                          <div><span className="font-semibold">Documentos:</span> {selectedOpinion.lawyer_analysis.documentos_necessarios.join(", ")}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {selectedOpinion.judge_opinion && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4">
                    <div className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                      <Scale className="w-4 h-4" /> Parecer do Juiz Virtual
                      {selectedOpinion.judge_model && (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-600 ml-2">{selectedOpinion.judge_model}</Badge>
                      )}
                      {selectedOpinion.judge_confidence && (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-600">
                          Confiança: {selectedOpinion.judge_confidence}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-nude-700 whitespace-pre-wrap leading-relaxed">
                      {selectedOpinion.judge_opinion}
                    </div>
                  </div>
                )}

                {selectedOpinion.media_urls?.length > 0 && (
                  <div className="bg-nude-50 border border-nude-200 rounded-md p-3">
                    <div className="text-xs font-semibold text-nude-700 mb-1">Mídias Anexadas</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedOpinion.media_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] px-2 py-1 rounded bg-white border border-nude-200 text-blue-600 hover:bg-blue-50"
                        >
                          {selectedOpinion.media_types?.[i] || "Arquivo"} #{i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-[11px] text-nude-400">
                  <div>Criado: {formatDate(selectedOpinion.created_at)}</div>
                  {selectedOpinion.judge_opinion_at && <div>Parecer: {formatDate(selectedOpinion.judge_opinion_at)}</div>}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/* CHECKLIST DETAIL                            */
/* ──────────────────────────────────────────── */
function ChecklistDetail({ process, toggleCheck, expandedCats, toggleCategory, moveStage, judgeText, judgeLoading, runJudge }) {
  const totalProgress = calcTotalProgress(process);

  return (
    <div className="p-6 max-w-4xl mx-auto print-area">
      {/* Process header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="font-serif text-2xl text-nude-900">{process.client_name}</h2>
            <div className="text-sm text-nude-500 mt-0.5">{process.case_type}</div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <Select value={process.stage} onValueChange={(v) => moveStage(process.id, v)}>
              <SelectTrigger className="w-52 h-8 text-xs" data-testid="stage-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {process.description && (
          <div className="text-sm text-nude-600 bg-nude-50 border border-nude-200 rounded-md p-3 mt-2">
            {process.description}
          </div>
        )}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-nude-600 mb-1.5">
            <span className="font-semibold">Progresso Geral</span>
            <span className="font-bold text-gold-700">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-3" />
        </div>
      </div>

      {/* Juiz Virtual */}
      <div className="mb-6 border border-gold-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-gold-50 border-b border-gold-200">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-gold-700" />
            <span className="font-display font-semibold text-sm text-gold-800">Parecer do Juiz Virtual</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs"
              disabled={!judgeText}
              onClick={() => printParecer(process, judgeText)}
              data-testid="print-judge-btn"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs"
              disabled={judgeLoading}
              onClick={() => runJudge(process)}
              data-testid="run-judge-btn"
            >
              {judgeLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando…</>
              ) : (
                <><RefreshCcw className="w-3.5 h-3.5" /> {judgeText ? "Reanalisar" : "Analisar"}</>
              )}
            </Button>
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-nude-800 whitespace-pre-wrap leading-relaxed min-h-[80px] max-h-[520px] overflow-y-auto">
          {judgeText
            ? judgeText
            : judgeLoading
              ? "O Juiz Virtual está avaliando este caso conforme EC 103/2019, Lei 8.213/91 e jurisprudência…"
              : "Clique em \"Analisar\" para gerar o parecer jurídico do Juiz Virtual."}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {CHECKLIST_CATEGORIES.map((cat) => {
          const progress = calcCategoryProgress(process, cat.id);
          const isExpanded = expandedCats[cat.id];
          const c = COLOR_MAP[cat.color] || COLOR_MAP.blue;
          const checks = process.checks?.[cat.id] || {};
          const doneCount = cat.items.filter((_, i) => checks[i]).length;

          return (
            <Card key={cat.id} className="border-nude-200 overflow-hidden" data-testid={`category-${cat.id}`}>
              <button
                onClick={() => toggleCategory(cat.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 ${c.bg} transition-colors hover:opacity-90`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-nude-600 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-nude-600 shrink-0" />
                )}
                <span className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                <span className={`font-display font-semibold text-sm ${c.text} flex-1 text-left`}>{cat.label}</span>
                <span className="text-xs text-nude-500 mr-2">{doneCount}/{cat.items.length}</span>
                <div className="w-24">
                  <Progress value={progress} className="h-1.5" />
                </div>
                {progress === 100 && <CheckCircle2 className="w-4 h-4 text-gold-600 shrink-0" />}
              </button>
              {isExpanded && (
                <div className="px-4 py-3 space-y-2 bg-white border-t border-nude-100">
                  {cat.items.map((item, idx) => (
                    <label
                      key={idx}
                      className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-nude-50 cursor-pointer transition-colors"
                      data-testid={`check-${cat.id}-${idx}`}
                    >
                      <Checkbox
                        checked={Boolean(checks[idx])}
                        onCheckedChange={() => toggleCheck(process.id, cat.id, idx)}
                      />
                      <span className={`text-sm ${checks[idx] ? "text-nude-400 line-through" : "text-nude-700"}`}>
                        {item}
                      </span>
                      {checks[idx] ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold-500 ml-auto shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-nude-300 ml-auto shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/* PIPELINE VIEW (KANBAN)                      */
/* ──────────────────────────────────────────── */
function PipelineView({ processes, moveStage, setActiveProcess, setView }) {
  return (
    <div className="flex-1 overflow-x-auto p-4">
      <div className="flex gap-3 min-w-max h-full">
        {PIPELINE_STAGES.map((stage) => {
          const stageProcesses = processes.filter((p) => p.stage === stage.id);
          const c = COLOR_MAP[stage.color] || COLOR_MAP.blue;
          return (
            <div
              key={stage.id}
              className="w-64 sm:w-72 shrink-0 flex flex-col rounded-md"
              data-testid={`pipeline-column-${stage.id}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("ring-2", "ring-gold-400");
              }}
              onDragLeave={(e) => e.currentTarget.classList.remove("ring-2", "ring-gold-400")}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("ring-2", "ring-gold-400");
                const id = e.dataTransfer.getData("text/process-id");
                if (id) moveStage(id, stage.id);
              }}
            >
              <div className={`${c.bg} rounded-md border ${c.border} px-3 py-2.5 flex items-center justify-between mb-2`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className={`font-display font-semibold text-sm ${c.text}`}>{stage.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs h-5 bg-white">{stageProcesses.length}</Badge>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto pb-4 pr-1">
                {stageProcesses.map((proc) => {
                  const progress = calcTotalProgress(proc);
                  return (
                    <Card
                      key={proc.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/process-id", proc.id)}
                      className="p-3 border-nude-200 hover:shadow-sm hover:border-nude-300 transition-all cursor-grab active:cursor-grabbing"
                      data-testid={`pipeline-card-${proc.id}`}
                    >
                      <div className="font-medium text-sm text-nude-900 mb-1">{proc.client_name}</div>
                      <div className="text-xs text-nude-500 mb-2">{proc.case_type}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-semibold text-nude-600">{progress}%</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs h-7 text-gold-700 hover:text-gold-800 hover:bg-gold-50"
                        onClick={() => {
                          setActiveProcess(proc.id);
                          setView("checklist");
                        }}
                        data-testid={`view-checklist-${proc.id}`}
                      >
                        <ClipboardCheck className="w-3 h-3 mr-1" /> Abrir Checklist
                      </Button>
                    </Card>
                  );
                })}
                {stageProcesses.length === 0 && (
                  <div className="text-xs text-nude-400 text-center py-6 border border-dashed border-nude-200 rounded-md">
                    Arraste processos para cá
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
