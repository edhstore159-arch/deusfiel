import { useState, useRef, useEffect, useCallback, Component } from "react";
import { supabase } from "@/integrations/supabase/client";
import { API, HAS_BACKEND } from "@/kenia/lib/api";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/kenia/components/ui/tabs";
import {
  Send, Loader2, GraduationCap, Scale, MessageSquare,
  Trophy, Target, BookOpen, RefreshCw, ChevronDown, ChevronUp, Star,
  Sparkles, Lightbulb, CheckCircle2, ArrowRight, Phone, Users,
  Copy, Printer, FileDown, Zap
} from "lucide-react";
import { toast } from "sonner";
import { CHAT_DEFAULT_PROMPT, loadChatConfig, saveChatConfig } from "@/kenia/storage/chatSecretary";
import { jsPDF } from "jspdf";

const STORAGE_KEY = "legal-training:state";

const WA_STRATEGIES = [
  { name: "abordagem_inicial", label: "Abordagem Inicial", color: "#22c55e", group: "captação", description: "Primeira impressão e quebra de gelo" },
  { name: "identificacao_dor", label: "Identificação de Dor", color: "#3b82f6", group: "captação", description: "Mapear a necessidade real do cliente" },
  { name: "demonstracao_valor", label: "Demonstração de Valor", color: "#8b5cf6", group: "captação", description: "Mostrar diferenciais do escritório" },
  { name: "tratamento_objecao", label: "Tratamento de Objeções", color: "#f59e0b", group: "captação", description: "Superar resistências comuns" },
  { name: "fechamento", label: "Fechamento", color: "#06b6d4", group: "captação", description: "Conversão do lead em cliente" },
  { name: "follow_up", label: "Follow-up Estratégico", color: "#ec4899", group: "captação", description: "Manter contato após primeira interação" },
  { name: "captura_whatsapp", label: "Captação via WhatsApp", color: "#14b8a6", group: "captação", description: "Estratégias específicas para WhatsApp" },
  { name: "indicacao", label: "Captação por Indicação", color: "#6366f1", group: "captação", description: "Como pedir e receber indicações" },
  { name: "escuta_ativa", label: "Escuta Ativa com Perguntas", color: "#ef4444", group: "captação", description: "Coletar dados com perguntas estratégicas" },
  { name: "urgencia_etica", label: "Criação de Urgência", color: "#f97316", group: "captação", description: "Motivar ação imediata de forma ética" },
  { name: "gatilhos_psicologicos", label: "Gatilhos Psicológicos", color: "#a855f7", group: "captação", description: "Reciprocidade, prova social, escassez" },
  { name: "pos_duvida_juridica", label: "Após Dúvida Jurídica", color: "#059669", group: "captação", description: "Converter orientação em contrato" },
  { name: "lead_divorcio", label: "Lead — Divórcio", color: "#e11d48", group: "leads", description: "Atendimento para casos de família" },
  { name: "lead_previdenciario", label: "Lead — Previdenciário", color: "#0891b2", group: "leads", description: "Atendimento para aposentadorias e INSS" },
  { name: "lead_bancario", label: "Lead — Direito Bancário", color: "#4f46e5", group: "leads", description: "Atendimento para questões bancárias" },
  { name: "lead_hesitante", label: "Lead Hesitante", color: "#ca8a04", group: "leads", description: "Cliente indeciso que precisa de incentivo" },
  { name: "lead_urgencia", label: "Lead com Urgência", color: "#dc2626", group: "leads", description: "Cliente em situação urgente" },
  { name: "saudacao", label: "Saudação", color: "#10b981", group: "atendimento", description: "Abertura e boas-vindas" },
];

const LEGAL_AREAS = [
  { value: "penal", label: "Penal", icon: "⚖️" },
  { value: "civel", label: "Cível", icon: "📜" },
  { value: "trabalhista", label: "Trabalhista", icon: "👷" },
  { value: "familia", label: "Família", icon: "👨‍👩‍👧" },
  { value: "previdenciario", label: "Previdenciário", icon: "🏛️" },
  { value: "tributario", label: "Tributário", icon: "💰" },
  { value: "administrativo", label: "Administrativo", icon: "📋" },
  { value: "constitucional", label: "Constitucional", icon: "📖" },
  { value: "consumidor", label: "Consumidor", icon: "🛒" },
  { value: "ambiental", label: "Ambiental", icon: "🌿" },
];

const DIFFICULTY_LEVELS = [
  { value: "facil", label: "Fácil", desc: "Casos simples e diretos" },
  { value: "medio", label: "Médio", desc: "Casos com complexidade moderada" },
  { value: "dificil", label: "Difícil", desc: "Casos complexos com múltiplas teses" },
];

const SECRETARY_STRATEGY_COLORS = {
  abordagem_inicial: { color: "#22c55e", label: "Abordagem Inicial" },
  identificacao_dor: { color: "#3b82f6", label: "Identificação de Dor" },
  demonstracao_valor: { color: "#8b5cf6", label: "Demonstração de Valor" },
  tratamento_objecao: { color: "#f59e0b", label: "Tratamento de Objeções" },
  fechamento: { color: "#06b6d4", label: "Fechamento" },
  follow_up: { color: "#ec4899", label: "Follow-up" },
  captura_whatsapp: { color: "#14b8a6", label: "Captação WhatsApp" },
  indicacao: { color: "#6366f1", label: "Indicação" },
  escuta_ativa: { color: "#ef4444", label: "Escuta Ativa" },
  urgencia_etica: { color: "#f97316", label: "Urgência" },
  gatilhos_psicologicos: { color: "#a855f7", label: "Gatilhos Psicológicos" },
  pos_duvida_juridica: { color: "#059669", label: "Pós-Dúvida" },
  lead_divorcio: { color: "#e11d48", label: "Lead Divórcio" },
  lead_previdenciario: { color: "#0891b2", label: "Lead Previdenciário" },
  lead_bancario: { color: "#4f46e5", label: "Lead Bancário" },
  lead_hesitante: { color: "#ca8a04", label: "Lead Hesitante" },
  lead_urgencia: { color: "#dc2626", label: "Lead Urgência" },
  saudacao: { color: "#10b981", label: "Saudação" },
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      stats: parsed.stats || { lawyer: { total: 0, passed: 0 }, judge: { total: 0, passed: 0 }, secretary: { total: 0, passed: 0 } },
    };
  } catch {
    return { sessions: [], stats: { lawyer: { total: 0, passed: 0 }, judge: { total: 0, passed: 0 }, secretary: { total: 0, passed: 0 } } };
  }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function loadEvolvedLegalPrompt(mode) {
  try { return localStorage.getItem(`legal-training:evolved-prompt:${mode}`) || ""; } catch { return ""; }
}

function saveEvolvedLegalPrompt(mode, prompt) {
  try { localStorage.setItem(`legal-training:evolved-prompt:${mode}`, String(prompt || "")); } catch {}
}

function ScoreGauge({ score, label }) {
  const color = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";
  const bg = score >= 80 ? "bg-green-100" : score >= 60 ? "bg-yellow-100" : "bg-red-100";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative w-16 h-16 rounded-full ${bg} flex items-center justify-center`}>
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
          <path className="text-gray-200" stroke="currentColor" strokeWidth="3" fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path className={color} stroke="currentColor" strokeWidth="3" fill="none"
            strokeDasharray={`${score}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <span className={`absolute text-sm font-bold ${color}`}>{score}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function CriteriaList({ criteria }) {
  if (!criteria?.length) return null;
  return (
    <div className="space-y-1.5">
      {criteria.map((c, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
            c.met ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {c.met ? "✓" : "✗"}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="font-medium">{c.name}:</span>
              {c.score != null && c.max != null && (
                <span className={`text-[10px] font-bold ${c.score >= c.max * 0.8 ? "text-green-600" : c.score >= c.max * 0.5 ? "text-yellow-600" : "text-red-600"}`}>
                  {c.score}/{c.max}
                </span>
              )}
            </div>
            <span className="text-muted-foreground">{c.feedback}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DiffView({ original, corrected, changes }) {
  const [copied, setCopied] = useState(false);

  if (!corrected) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(corrected);
      setCopied(true);
      toast.success("Resposta corrigida copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const printResponse = () => {
    const win = window.open("", "_blank", "width=800,height=600");
    win.document.write(`
      <html><head><title>Resposta Corrigida</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
        h1 { font-size: 18px; color: #166534; }
        .content { white-space: pre-wrap; }
      </style></head><body>
      <h1>Resposta Corrigida</h1>
      <div class="content">${corrected.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      <br><hr><p style="font-size:11px;color:#666;">Gerado por DeusFiel - Dra. Kênia Garcia</p>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-medium text-green-700 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Resposta Corrigida
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="p-2 rounded bg-red-50 border border-red-200">
          <div className="text-[10px] font-medium text-red-600 mb-1">Original</div>
          <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{original}</div>
        </div>
        <div className="p-2 rounded bg-green-50 border border-green-200">
          <div className="text-[10px] font-medium text-green-600 mb-1">Corrigida</div>
          <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{corrected}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={copyToClipboard} className="h-7 text-[10px]">
          {copied ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? "Copiado!" : "Copiar"}
        </Button>
        <Button size="sm" variant="outline" onClick={printResponse} className="h-7 text-[10px]">
          <Printer className="w-3 h-3 mr-1" /> Imprimir
        </Button>
      </div>
      {changes?.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground">Alterações realizadas:</div>
          {changes.map((c, i) => (
            <div key={i} className="p-2 rounded bg-muted/50 text-xs">
              <span className="text-red-600 line-through">{c.original?.slice(0, 80)}...</span>
              <ArrowRight className="w-3 h-3 inline mx-1 text-muted-foreground" />
              <span className="text-green-600">{c.corrected?.slice(0, 80)}...</span>
              <div className="text-[10px] text-muted-foreground mt-0.5 italic">{c.reason}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionsPanel({ suggestions, priority, quickWins }) {
  if (!suggestions?.length) return null;
  return (
    <div className="space-y-3">
      <div className="text-[10px] font-medium text-blue-700 flex items-center gap-1">
        <Lightbulb className="w-3 h-3" /> Sugestões de Melhoria
      </div>
      {priority && (
        <div className="p-2 rounded bg-blue-50 border border-blue-200 text-xs">
          <span className="font-medium text-blue-800">Prioridade máxima:</span>{" "}
          <span className="text-blue-700">{priority}</span>
        </div>
      )}
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div key={i} className="p-2 rounded bg-muted/50 text-xs">
            <Badge variant="secondary" className="text-[9px] mb-1">{s.area}</Badge>
            <div className="text-muted-foreground">{s.suggestion}</div>
            {s.example && (
              <div className="mt-1 p-1.5 rounded bg-gold-50 text-gold-800 text-[10px] italic">
                Exemplo: {s.example}
              </div>
            )}
          </div>
        ))}
      </div>
      {quickWins?.length > 0 && (
        <div className="p-2 rounded bg-green-50 border border-green-200">
          <div className="text-[10px] font-medium text-green-700 mb-1">Melhorias rápidas:</div>
          {quickWins.map((w, i) => (
            <div key={i} className="text-[10px] text-green-600">• {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function LegalTraining() {
  const saved = loadState();
  const [mode, setMode] = useState("lawyer");
  const [area, setArea] = useState("civel");
  const [difficulty, setDifficulty] = useState("medio");
  const [sessions, setSessions] = useState(saved.sessions || []);
  const [stats, setStats] = useState(saved.stats || { lawyer: { total: 0, passed: 0 }, judge: { total: 0, passed: 0 } });
  const [currentSession, setCurrentSession] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const chatEndRef = useRef(null);

  const [realCases, setRealCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [useRealCase, setUseRealCase] = useState(false);

  const [correcting, setCorrecting] = useState(false);
  const [correctedData, setCorrectedData] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  const [improving, setImproving] = useState(false);
  const [improvementData, setImprovementData] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [improvingPrompt, setImprovingPrompt] = useState(false);
  const [improvePromptData, setImprovePromptData] = useState(null);
  const [showImprovePrompt, setShowImprovePrompt] = useState(false);

  const [autoLoopTraining, setAutoLoopTraining] = useState(false);
  const [autoLoopResults, setAutoLoopResults] = useState(null);
  const [autoLoopProgress, setAutoLoopProgress] = useState(null);

  const [simulating, setSimulating] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [simulationMessage, setSimulationMessage] = useState("");
  const [simulationClientName, setSimulationClientName] = useState("Cliente Teste");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [autoSimData, setAutoSimData] = useState(null);
  const [autoSimRunning, setAutoSimRunning] = useState(false);
  const [autoSimProgress, setAutoSimProgress] = useState("");

  const [activeSection, setActiveSection] = useState("treinamento");

  const [secStrategy, setSecStrategy] = useState(null);
  const [secScenario, setSecScenario] = useState(null);
  const [secLoading, setSecLoading] = useState(false);
  const [secEval, setSecEval] = useState(null);
  const [secImprovingPrompt, setSecImprovingPrompt] = useState(false);
  const [secImprovedPrompt, setSecImprovedPrompt] = useState(null);
  const [secAutoGenerating, setSecAutoGenerating] = useState(false);
  const [secCorrecting, setSecCorrecting] = useState(false);
  const [secCorrectedData, setSecCorrectedData] = useState(null);
  const [secImprovingArg, setSecImprovingArg] = useState(false);
  const [secImprovementData, setSecImprovementData] = useState(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simProgress, setSimProgress] = useState({ current: 0, total: 0, strategy: "" });
  const [simResults, setSimResults] = useState(null);
  const [judgeReports, setJudgeReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [waMobileTab, setWaMobileTab] = useState("contatos");

  const SEC_STRATEGIES = [
    { id: "abordagem_inicial", name: "Abordagem Inicial", desc: "Primeira impressão e quebra de gelo", color: "#22c55e" },
    { id: "identificacao_dor", name: "Identificação de Dor", desc: "Mapear a necessidade real do cliente", color: "#3b82f6" },
    { id: "demonstracao_valor", name: "Demonstração de Valor", desc: "Mostrar diferenciais do escritório", color: "#8b5cf6" },
    { id: "tratamento_objecao", name: "Tratamento de Objeções", desc: "Superar resistências comuns", color: "#f59e0b" },
    { id: "fechamento", name: "Fechar o Lead", desc: "Converter orientação em agendamento", color: "#06b6d4" },
    { id: "follow_up", name: "Follow-up Estratégico", desc: "Manter contato após primeira interação", color: "#ec4899" },
    { id: "captura_whatsapp", name: "Captação via WhatsApp", desc: "Estratégias específicas para WhatsApp", color: "#14b8a6" },
    { id: "indicacao", name: "Captação por Indicação", desc: "Como pedir e receber indicações", color: "#6366f1" },
    { id: "escuta_ativa", name: "Escuta Ativa com Perguntas", desc: "Coletar dados com perguntas estratégicas", color: "#ef4444" },
    { id: "urgencia_etica", name: "Criação de Urgência", desc: "Motivar ação imediata de forma ética", color: "#f97316" },
    { id: "gatilhos_psicologicos", name: "Gatilhos Psicológicos", desc: "Reciprocidade, prova social, escassez", color: "#a855f7" },
    { id: "lead_divorcio", name: "Lead — Divórcio", desc: "Atendimento para casos de família", color: "#e11d48" },
    { id: "lead_previdenciario", name: "Lead — Previdenciário", desc: "Atendimento para aposentadorias e INSS", color: "#0891b2" },
    { id: "lead_bancario", name: "Lead — Direito Bancário", desc: "Atendimento para questões bancárias", color: "#4f46e5" },
    { id: "lead_hesitante", name: "Lead Hesitante", desc: "Cliente indeciso que precisa de incentivo", color: "#ca8a04" },
    { id: "lead_urgencia", name: "Lead com Urgência", desc: "Cliente em situação urgente", color: "#dc2626" },
    { id: "pos_duvida_juridica", name: "Após Dúvida Jurídica", desc: "Converter orientação em agendamento", color: "#059669" },
    { id: "saudacao", name: "Saudação", desc: "Abertura e acolhimento", color: "#10b981" },
  ];

  const [waConversations, setWaConversations] = useState([]);
  const [waSelectedId, setWaSelectedId] = useState(null);
  const [waMessages, setWaMessages] = useState([]);
  const [waLoading, setWaLoading] = useState(true);
  const [waDataSource, setWaDataSource] = useState("loading");
  const waMessagesEndRef = useRef(null);
  const [waInput, setWaInput] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waRefreshing, setWaRefreshing] = useState(false);
  const waRefreshInterval = useRef(null);

  const loadJudgeReports = useCallback(async () => {
    if (!HAS_BACKEND) return;
    setLoadingReports(true);
    try {
      const res = await fetch(`${API}/judge-reports`);
      if (res.ok) {
        const data = await res.json();
        setJudgeReports(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setLoadingReports(false);
  }, []);

  const generateJudgeReportFor = useCallback(async (jid, clientName) => {
    if (!HAS_BACKEND) return;
    setGeneratingReport(true);
    try {
      const res = await fetch(`${API}/judge-reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jid, client_name: clientName }),
      });
      if (res.ok) {
        const report = await res.json();
        setSelectedReport(report);
        await loadJudgeReports();
        toast.success("Relatório do juiz gerado!");
      } else {
        toast.error("Erro ao gerar relatório");
      }
    } catch { toast.error("Erro de conexão"); }
    setGeneratingReport(false);
  }, [loadJudgeReports]);

  const loadWaConversations = useCallback(async () => {
    setWaLoading(true);
    try {
      if (HAS_BACKEND) {
        const res = await fetch(`${API}/whatsapp/contacts`);
        if (res.ok) {
          const contacts = await res.json();
          if (Array.isArray(contacts) && contacts.length) {
            const mapped = contacts.map((c) => ({
              id: c.jid || c.id || c.phone,
              phone: c.phone || "",
              member_name: c.name || c.phone || "",
              status: "active",
              current_strategy: "abordagem_inicial",
              updated_at: c.last_message_at || new Date().toISOString(),
              _jid: c.jid || c.id,
            }));
            setWaConversations(mapped);
            setWaDataSource("backend");
            setWaLoading(false);
            return;
          }
        }
      }
    } catch {}
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("session_id, message, response, created_at")
        .not("session_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!error && data?.length) {
        const bySession = {};
        for (const row of data) {
          const rawSid = row.session_id || "";
          const phone = rawSid.replace("whatsapp:", "").split("@")[0].replace(/^\+/, "");
          if (!phone || phone.length < 8 || phone === "test" || rawSid.startsWith("test")) continue;
          // Filtrar sessões de teste: phone deve conter apenas dígitos
          if (!/^\d{8,}$/.test(phone)) continue;
          const key = phone;
          if (!bySession[key]) bySession[key] = { rows: [], last: row.created_at, phone };
          bySession[key].rows.push(row);
          if (row.created_at > bySession[key].last) bySession[key].last = row.created_at;
        }
        const mapped = Object.entries(bySession).map(([key, info]) => {
          const allMsgs = info.rows.reverse().flatMap((r) => {
            const msgs = [];
            if (r.message) msgs.push({ direction: "incoming", content: r.message, created_at: r.created_at });
            if (r.response) msgs.push({ direction: "outgoing", content: r.response, created_at: r.created_at });
            return msgs;
          });
          return {
            id: key,
            phone: `+${info.phone}`,
            member_name: `+${info.phone}`,
            status: "active",
            current_strategy: "abordagem_inicial",
            updated_at: info.last,
            _messages: allMsgs,
            _session_id: info.rows[0]?.session_id || key,
          };
        }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        setWaConversations(mapped);
        setWaDataSource("supabase");
        setWaLoading(false);
        return;
      }
    } catch (e) { console.warn("[conversas] supabase error:", e); }
    setWaConversations([]);
    setWaDataSource("none");
    setWaLoading(false);
  }, []);

  useEffect(() => {
    if (activeSection === "conversas") loadWaConversations();
    if (activeSection === "relatorios") loadJudgeReports();
  }, [activeSection, loadWaConversations, loadJudgeReports]);

  useEffect(() => {
    waMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [waMessages]);

  // Auto-refresh mensagens a cada 5 segundos quando uma conversa está selecionada
  useEffect(() => {
    if (activeSection !== "conversas" || !waSelectedId) {
      if (waRefreshInterval.current) { clearInterval(waRefreshInterval.current); waRefreshInterval.current = null; }
      return;
    }
    waRefreshInterval.current = setInterval(() => {
      loadWaMessages(waSelectedId, true);
    }, 5000);
    return () => { if (waRefreshInterval.current) clearInterval(waRefreshInterval.current); };
  }, [activeSection, waSelectedId, loadWaConversations]);

  async function sendWaMessage(text) {
    if (!text?.trim() || !waSelectedId || waSending) return;
    const conv = waConversations.find((c) => c.id === waSelectedId);
    if (!conv) return;
    const jid = conv._jid || waSelectedId;
    const phone = conv.phone?.replace(/\D/g, "");
    setWaSending(true);
    try {
      const resp = await fetch(`${API}/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: jid || `${phone}@s.whatsapp.net`, text: text.trim() }),
      });
      const data = await resp.json();
      if (data?.ok || data?.delivered) {
        setWaMessages((prev) => [...prev, {
          id: `local-${Date.now()}`,
          content: text.trim(),
          direction: "outgoing",
          strategy_name: detectStrategy(text.trim(), "outgoing"),
          created_at: new Date().toISOString(),
        }]);
        setWaInput("");
        toast.success("Mensagem enviada!");
      } else {
        toast.error("Erro ao enviar: " + (data?.error || "desconhecido"));
      }
    } catch (e) {
      toast.error("Erro de conexão: " + (e?.message || e));
    } finally {
      setWaSending(false);
    }
  }

  function detectStrategy(content, direction) {
    if (!content) return "abordagem_inicial";
    const t = content.toLowerCase();
    if (direction === "incoming") {
      if (/urgente|ajuda|socorro|preciso|imediato|agora/.test(t)) return "lead_urgencia";
      if (/div[oó]rcio|fam[ií]lia|cust[oó]dia|pens[aã]o|filho/.test(t)) return "lead_divorcio";
      if (/inss|aposentad|previd[eê]nc|benef[ií]cio|aux[ií]lio/.test(t)) return "lead_previdenciario";
      if (/banco|financ|empr[eé]stimo|d[ií]vida|cart[aã]o|cheque/.test(t)) return "lead_bancario";
      if (/n[aã]o sei|talvez|ainda estou|d[uú]vida|pensando/.test(t)) return "lead_hesitante";
      if (/obrigad|valeu|agradeco|brigad/.test(t)) return "follow_up";
      return "identificacao_dor";
    }
    if (/ol[aá]|bom dia|boa tarde|boa noite|bem vindo|seja bem|como posso/.test(t)) return "saudacao";
    if (/entendo|compreendo|entendi|ouvi|escuto|pode me contar/.test(t)) return "escuta_ativa";
    if (/art\.|lei|c[oó]digo|legisla[cç][aã]o|direito|fundamento|jurisprud[êe]ncia|s[uú]mula/.test(t)) return "demonstracao_valor";
    if (/preocupa|medo|risco|perigo|problema|dano|preju[ií]zo/.test(t)) return "urgencia_etica";
    if (/contrat|procurat|honor[aá]rio|valor|quanto|pre[cç]o|or[cç]amento/.test(t)) return "fechamento";
    if (/obje[cç][aã]o|mas |porem|ent[aã]o|n[aã]o acho|acho que n[aã]o/.test(t)) return "tratamento_objecao";
    if (/indica[cç][aã]o|amigo|conhecido|fam[ií]lia indicou|recomendou/.test(t)) return "indicacao";
    if (/after|depois|pr[oó]ximo|volto|continuamos|futuro|amanh[aã]/.test(t)) return "follow_up";
    if (/whatsapp|n[uú]mero|telefone|contato|zap/.test(t)) return "captura_whatsapp";
    if (/obrig|agradec|ajudou|excelent|melhor|satisf/.test(t)) return "gatilhos_psicologicos";
    if (/orienta[cç][aã]o|d[uú]vida jur[ií]dica|consulta|an[aá]lise/.test(t)) return "pos_duvida_juridica";
    if (direction === "outgoing") {
      if (/posso ajud|vamos analis|vou verificar|orient[aá]/.test(t)) return "demonstracao_valor";
      if (/entre em contato|whatsapp|n[uú]mero|lig[eé]/.test(t)) return "captura_whatsapp";
    }
    return "abordagem_inicial";
  }

  function loadWaMessages(convId, silent = false) {
    if (!silent) setWaSelectedId(convId);
    const conv = waConversations.find((c) => c.id === convId);
    if (conv?._messages) {
      if (!silent) setWaMessages(conv._messages.map((m, i) => ({ ...m, id: `sb-${i}`, strategy_name: detectStrategy(m.content, m.direction) })));
      return;
    }
    if (waDataSource === "backend" && conv) {
      const jid = conv._jid || convId;
      fetch(`${API}/whatsapp/messages/${encodeURIComponent(jid)}`)
        .then((r) => r.json())
        .then((msgs) => {
          if (Array.isArray(msgs) && msgs.length) {
            const mapped = msgs.map((m) => ({
              id: m.id || `msg-${Math.random()}`,
              content: m.text || m.content || "",
              direction: m.from_me ? "outgoing" : "incoming",
              strategy_name: m.strategy || detectStrategy(m.text || m.content || "", m.from_me ? "outgoing" : "incoming"),
              created_at: m.created_at || new Date().toISOString(),
            }));
            if (!silent) setWaMessages(mapped);
          } else {
            if (!silent) setWaMessages([]);
          }
        })
        .catch(() => setWaMessages([]));
    }
  }

  function getWaStrategyColor(name) {
    const s = WA_STRATEGIES.find((st) => st.name === name);
    return s ? s.color : "#64748b";
  }

  function getWaStrategyLabel(name) {
    const s = WA_STRATEGIES.find((st) => st.name === name);
    return s ? s.label : name;
  }

  function formatWaPhone(phone) {
    const d = phone.replace(/\D/g, "");
    if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return phone;
  }

  function formatWaTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  const [waSelectedMsgIdx, setWaSelectedMsgIdx] = useState(null);
  const [waCorrection, setWaCorrection] = useState("");
  const [waSelectedStrategy, setWaSelectedStrategy] = useState(null);
  const [waTrainingPanel, setWaTrainingPanel] = useState(true);

  useEffect(() => { saveState({ sessions, stats }); }, [sessions, stats]);

  useEffect(() => {
    try { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); } catch {}
  }, [currentSession, correctedData, improvementData]);

  const fetchRealCases = useCallback(async () => {
    if (realCases.length > 0) return;
    setLoadingCases(true);
    try {
      const { data, error } = await supabase
        .from("legal_cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRealCases(data || []);
    } catch (e) {
      console.error("Failed to load real cases:", e);
    } finally {
      setLoadingCases(false);
    }
  }, [realCases.length]);

  const startTraining = async () => {
    setSending(true);
    try {
      if (mode === "secretary") {
        if (!secStrategy) { toast.error("Selecione uma estratégia"); setSending(false); return; }
        setSecLoading(true);
        const { data, error } = await supabase.functions.invoke("training-ai", {
          body: { action: "secretary_strategy", strategy_id: secStrategy.id },
        });
        setSecLoading(false);
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setSecScenario(data.strategy);

        const session = {
          id: Date.now().toString(),
          mode: "secretary",
          area: "secretaria",
          difficulty: "medio",
          case_data: { title: secStrategy.name, description: data.strategy.scenario, strategy: secStrategy },
          messages: [
            { role: "assistant", content: `📋 **CENÁRIO — ${secStrategy.name}**\n\n${data.strategy.scenario}\n\n👤 Perfil: ${data.strategy.client_profile}\n\n💬 Script sugerido:\n${data.strategy.script || "Nenhum script sugerido."}` },
          ],
          score: null,
          evaluation: null,
          created_at: new Date().toISOString(),
        };
        setCurrentSession(session);
        setShowConfig(false);
        saveSessionToDb(session);
        toast.success(`Cenário de treinamento gerado: ${secStrategy.name}`);
        setSending(false);
        return;
      }

      if (useRealCase && selectedCaseId) {
        const selected = realCases.find((c) => c.id === selectedCaseId);
        if (selected) {
          const session = {
            id: Date.now().toString(),
            mode,
            area: selected.area,
            difficulty: selected.difficulty,
            case_data: {
              title: selected.title,
              description: selected.description,
              parties: selected.parties,
              question: selected.question,
              key_issues: selected.key_issues || [],
              applicable_laws: selected.applicable_laws || [],
              hints: selected.hints || [],
              real_reference: selected.real_reference,
              source: selected.source,
            },
            messages: [{ role: "assistant", content: selected.description }],
            score: null,
            evaluation: null,
            legal_case_id: selected.id,
            created_at: new Date().toISOString(),
          };
          setCurrentSession(session);
          setShowConfig(false);
          saveSessionToDb(session);
          toast.success(`Caso real carregado: ${selected.real_reference || selected.title}`);
          setSending(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("training-ai", {
        body: { action: "generate_case", mode, area, difficulty },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const session = {
        id: Date.now().toString(),
        mode,
        area,
        difficulty,
        case_data: data.case_data,
        messages: [{ role: "assistant", content: data.case_data.description }],
        score: null,
        evaluation: null,
        legal_case_id: null,
        created_at: new Date().toISOString(),
      };

      // Gerar argumentação do advogado production como referência
      const lawyerArgResult = await supabase.functions.invoke("training-ai", {
        body: {
          action: "generate_lawyer_response",
          mode,
          area,
          case_data: data.case_data,
        },
      });

      if (!lawyerArgResult.error && lawyerArgResult.data?.response) {
        session.messages.push({
          role: "assistant",
          content: "📋 **ARGUMENTAÇÃO DO ADVOGADO (Referência):**\n\n" + lawyerArgResult.data.response,
        });
      }

      setCurrentSession(session);
      setShowConfig(false);
      saveSessionToDb(session);
      toast.success("Caso gerado! Inicie o treinamento.");

      // --- PIPELINE AUTOMÁTICO (em background, não bloqueia o usuário) ---
      // Roda auto_train_loop + simulação em paralelo enquanto o usuário já pode interagir
      const previousLoopPrompt = loadEvolvedLegalPrompt(mode);
      const autoLoopPrompt = previousLoopPrompt && previousLoopPrompt.trim().length > 50
        ? previousLoopPrompt
        : `Você é um profissional jurídico ${mode === "lawyer" ? "advogado" : "juiz"} experiente. Responda de forma clara, fundamentada e persuasiva, aplicando estratégias de atendimento ao cliente.`;

      // Rodar auto_train_loop (1 iteração) e simulate_whatsapp em PARALELO
      setAutoLoopTraining(true);
      setAutoLoopProgress({ iteration: 0, maxIterations: 1, score: 0, status: "Rodando pipeline..." });
      setSimulating(true);

      const sampleMessages = {
        penal: "Oi, fui acusado de algo que não fiz. Preciso de ajuda urgente!",
        civel: "Olá, tenho um problema jurídico e preciso de orientação.",
        trabalhista: "Fui demitido sem justa causa e não sei o que fazer.",
        familia: "Preciso de ajuda com um assunto familiar urgente.",
        previdenciario: "Meu benefício do INSS foi negado. O que posso fazer?",
        tributario: "Recebi uma cobrança de imposto que acho indevida.",
        administrativo: "Fui penalizado por um órgão público e quero recorrer.",
        constitucional: "Meus direitos constitucionais estão sendo violados.",
        consumidor: "Comprei um produto defeituoso e a loja se recusa a trocar.",
        ambiental: "Estou sofrendo com poluição vizinha ao meu imóvel.",
      };
      const autoClientMsg = sampleMessages[area] || "Olá, preciso de orientação jurídica. " + (data.case_data?.description?.slice(0, 150) || "Tenho um caso para analisar.");

      // Ambos rodando em paralelo — o usuário já pode interagir
      const loopPromise = supabase.functions.invoke("training-ai", {
        body: {
          action: "auto_train_loop",
          current_prompt: autoLoopPrompt,
          mode,
          area,
          target_improvement: 20,
          max_iterations: 1,
          areas: [area],
        },
      }).then((loopRes) => {
        if (!loopRes.error && loopRes.data) {
          if (loopRes.data.final_prompt && loopRes.data.final_prompt !== autoLoopPrompt) {
            saveEvolvedLegalPrompt(mode, loopRes.data.final_prompt);
          }
          setAutoLoopResults(loopRes.data);
          const finalScore = loopRes.data.final_score || 0;
          const totalImprovement = loopRes.data.total_improvement || 0;
          setAutoLoopProgress({
            iteration: loopRes.data.iterations?.length || 0,
            maxIterations: loopRes.data.iterations?.length || 1,
            score: finalScore,
            status: loopRes.data.reached_target ? `Meta atingida! +${totalImprovement}%` : `Melhoria: +${totalImprovement}%`,
          });
        }
        setAutoLoopTraining(false);
        return loopRes;
      }).catch((e) => { console.error("Auto loop error:", e); setAutoLoopTraining(false); return null; });

      const simPromise = supabase.functions.invoke("training-ai", {
        body: {
          action: "simulate_whatsapp",
          mode,
          area,
          client_message: autoClientMsg,
          client_name: "Cliente Automático",
          custom_prompt: autoLoopPrompt,
        },
      }).then((simRes) => {
        if (!simRes.error && simRes.data) {
          setSimulationData(simRes.data);
          setSimulationMessage(autoClientMsg);
        }
        setSimulating(false);
        return simRes;
      }).catch((e) => { console.error("Auto simulation error:", e); setSimulating(false); return null; });

      // Ambos rodando em paralelo — não await, o usuário já pode usar o treinamento
      Promise.allSettled([loopPromise, simPromise]).then(() => {
        toast.success("Pipeline de treinamento concluído!");
      });
    } catch (e) {
      toast.error("Erro: " + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const saveSessionToDb = async (session) => {
    try {
      await supabase.from("training_sessions").upsert({
        id: session.id,
        mode: session.mode,
        area: session.area,
        difficulty: session.difficulty,
        legal_case_id: session.legal_case_id || null,
        case_data: session.case_data,
        messages: session.messages,
        score: session.score,
        evaluation: session.evaluation,
      }, { onConflict: "id" });
    } catch (e) {
      console.error("Failed to save session:", e);
    }
  };

  const sendResponse = async () => {
    if (!input.trim() || sending || !currentSession) return;
    const userMsg = input.trim();
    setInput("");
    setSending(true);
    setCorrectedData(null);
    setImprovementData(null);

    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, { role: "user", content: userMsg }],
    };
    setCurrentSession(updatedSession);

    try {
      if (currentSession.mode === "secretary") {
        const { data, error } = await supabase.functions.invoke("training-ai", {
          body: {
            action: "secretary_evaluate",
            scenario: currentSession.case_data?.description || "",
            user_response: userMsg,
            strategy_id: secStrategy?.id || "",
            current_prompt: currentPrompt || "",
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const finalSession = {
          ...updatedSession,
          messages: [...updatedSession.messages, { role: "assistant", content: data.feedback }],
          score: data.score,
          evaluation: {
            score: data.score,
            feedback: data.feedback,
            strengths: data.strengths || [],
            weaknesses: data.weaknesses || [],
            tips: data.tips || [],
          },
        };
        setCurrentSession(finalSession);
        setSecEval(data);
        setSessions((prev) => [finalSession, ...prev].slice(0, 50));
        saveSessionToDb(finalSession);
        toast.success(`Avaliação: ${data.score}/100`);
        setSending(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("training-ai", {
        body: {
          action: "evaluate",
          mode,
          area: currentSession.area || area,
          case_data: currentSession.case_data,
          user_response: userMsg,
          history: currentSession.messages.slice(-10),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, { role: "assistant", content: data.feedback }],
        score: data.score,
        evaluation: data.evaluation,
        lawyer_feedback: data.lawyer_feedback,
      };
      setCurrentSession(finalSession);

      const newStats = { ...stats };
      newStats[mode].total++;
      if (data.score >= 60) newStats[mode].passed++;
      setStats(newStats);

      setSessions((prev) => [finalSession, ...prev].slice(0, 50));
      saveSessionToDb(finalSession);
    } catch (e) {
      toast.error("Erro: " + (e?.message || e));
      setCurrentSession((prev) => ({
        ...prev,
        messages: [...prev.messages, { role: "assistant", content: "Erro ao avaliar: " + (e?.message || e) }],
      }));
    } finally {
      setSending(false);
    }
  };

  const autoCorrect = async () => {
    if (!currentSession || currentSession.score == null || correcting) return;
    setCorrecting(true);
    setImprovementData(null);
    try {
      const lastUserMsg = [...currentSession.messages].reverse().find((m) => m.role === "user")?.content || "";
      const { data, error } = await supabase.functions.invoke("training-ai", {
        body: {
          action: "evaluate_and_correct",
          mode,
          area: currentSession.area || area,
          case_data: currentSession.case_data,
          user_response: lastUserMsg,
          score: currentSession.score,
          evaluation: currentSession.evaluation,
          history: currentSession.messages.slice(-10),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCorrectedData(data);
      setShowComparison(true);
      toast.success("Resposta corrigida com sucesso!");
    } catch (e) {
      toast.error("Erro na correção: " + (e?.message || e));
    } finally {
      setCorrecting(false);
    }
  };

  const improveArgument = async () => {
    if (!currentSession || currentSession.score == null || improving) return;
    setImproving(true);
    setCorrectedData(null);
    try {
      const lastUserMsg = [...currentSession.messages].reverse().find((m) => m.role === "user")?.content || "";
      const { data, error } = await supabase.functions.invoke("training-ai", {
        body: {
          action: "improve_argument",
          mode,
          area: currentSession.area || area,
          case_data: currentSession.case_data,
          user_response: lastUserMsg,
          score: currentSession.score,
          evaluation: currentSession.evaluation,
          history: currentSession.messages.slice(-10),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setImprovementData(data);
      setShowSuggestions(true);
      toast.success("Sugestões geradas!");
    } catch (e) {
      toast.error("Erro: " + (e?.message || e));
    } finally {
      setImproving(false);
    }
  };

  const improvePrompt = async () => {
    if (!currentSession || currentSession.score == null || improvingPrompt) return;
    setImprovingPrompt(true);
    setImprovePromptData(null);
    try {
      const lastUserMsg = [...currentSession.messages].reverse().find((m) => m.role === "user")?.content || "";
      const evaluation = currentSession.evaluation || {};
      const weaknesses = evaluation.weaknesses || [];
      const tips = [];
      const feedback = currentSession.messages.find((m) => m.content?.includes("Avaliação") || m.content?.includes("feedback") || m.content?.includes("Score"))?.content || "";

      const promptFallback = currentSession.mode === "secretary"
        ? (currentPrompt || "Você é uma secretária jurídica experiente do escritório da Dra. Kênia Garcia. Responda de forma humanizada, empática e profissional.")
        : (currentPrompt || `Você é um profissional jurídico ${mode === "lawyer" ? "advogado" : "juiz"} experiente. Responda de forma clara, fundamentada e persuasiva, aplicando estratégias de atendimento ao cliente.`);

      const { data, error } = await supabase.functions.invoke("training-ai", {
        body: {
          action: "improve_prompt",
          mode: currentSession.mode || mode,
          current_prompt: promptFallback,
          evaluation_summary: feedback.slice(0, 2000),
          weaknesses,
          tips,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setImprovePromptData(data);
      setShowImprovePrompt(true);
      toast.success("Prompt melhorado gerado!");
    } catch (e) {
      console.error("[improvePrompt] error:", e);
      const rawMsg = e?.message || String(e || "Erro desconhecido");
      const msg = rawMsg.includes("non-2xx")
        ? "Falha ao conectar com IA. Verifique sua conexão e tente novamente."
        : rawMsg;
      toast.error("Erro ao melhorar prompt: " + String(msg));
    } finally {
      setImprovingPrompt(false);
    }
  };

  const resetSession = () => {
    setCurrentSession(null);
    setShowConfig(true);
    setInput("");
    setCorrectedData(null);
    setImprovementData(null);
    setImprovePromptData(null);
    setShowSuggestions(false);
    setShowImprovePrompt(false);
  };

  const simulateWhatsApp = async () => {
    if (!simulationMessage.trim() || simulating) return;
    setSimulating(true);
    setSimulationData(null);
    try {
      const { data, error } = await supabase.functions.invoke("training-ai", {
        body: {
          action: "simulate_whatsapp",
          mode,
          area,
          client_message: simulationMessage,
          client_name: simulationClientName || "Cliente Teste",
          custom_prompt: currentPrompt,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSimulationData(data);
      
      // Se score < 80, automaticamente mostrar prompt melhorado
      if (data?.evaluation?.score < 80 && data?.improved_prompt) {
        toast.success(`Score ${data.evaluation.score}/100 — Prompt melhorado disponível!`);
      } else {
        toast.success(`Simulação ${mode === "lawyer" ? "do Advogado" : "do Juiz"} concluída!`);
      }
    } catch (e) {
      toast.error("Erro na simulação: " + (e?.message || e));
    } finally {
      setSimulating(false);
    }
  };

  const runAutoSimulate = async () => {
    if (autoSimRunning) return;
    setAutoSimRunning(true);
    setAutoSimData(null);
    setAutoSimProgress("Gerando cenários de captura...");
    try {
      const { data, error } = await supabase.functions.invoke("training-ai", {
        body: {
          action: "auto_simulate",
          mode,
          area,
          custom_prompt: currentPrompt,
          num_scenarios: 5,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAutoSimData(data);
      setAutoSimProgress("");
      toast.success(`Simulação automática: ${data.total} cenários, média ${data.avg_score}/100`);
    } catch (e) {
      toast.error("Erro na simulação automática: " + (e?.message || e));
      setAutoSimProgress("");
    } finally {
      setAutoSimRunning(false);
    }
  };

  const applyImprovedPrompt = async () => {
    if (!simulationData?.improved_prompt) return;
    try {
      setCurrentPrompt(simulationData.improved_prompt);
      saveEvolvedLegalPrompt(mode, simulationData.improved_prompt);
      toast.success("Prompt melhorado aplicado e salvo!");
    } catch (e) {
      toast.error("Erro ao aplicar prompt");
    }
  };

  const applySimulationToTraining = async () => {
    if (!simulationData?.professional_response || !simulationData?.case_data) return;
    try {
      const session = {
        id: Date.now().toString(),
        title: `Simulação WhatsApp - ${simulationData.client_name}`,
        mode: simulationData.mode || "lawyer",
        area: simulationData.area || "civel",
        difficulty: simulationData.difficulty || "intermediario",
        case_data: simulationData.case_data,
        messages: [
          { role: "user", content: simulationData.client_message },
          { role: "assistant", content: simulationData.professional_response },
        ],
        score: simulationData.evaluation?.score || 0,
        evaluation: simulationData.evaluation,
        created_at: new Date().toISOString(),
      };
      const newSessions = [session, ...sessions].slice(0, 50);
      setSessions(newSessions);
      setCurrentSession(session);
      setShowConfig(false);
      toast.success("Simulação aplicada ao treinamento!");
    } catch (e) {
      toast.error("Erro ao aplicar simulação");
    }
  };

  const startAutoLoopTraining = async () => {
    if (autoLoopTraining) return;
    setAutoLoopTraining(true);
    setAutoLoopResults(null);
    setAutoLoopProgress({ iteration: 0, maxIterations: 2, score: 0, status: "Iniciando loop de melhoria..." });
    try {
      // Usar prompt evoluído anterior ou o genérico
      const previousPrompt = loadEvolvedLegalPrompt(mode);
      let autoLoopPrompt;
      if (previousPrompt && previousPrompt.trim().length > 50) {
        autoLoopPrompt = previousPrompt;
      } else if (mode === "secretary") {
        autoLoopPrompt = "Você é uma secretária jurídica experiente do escritório Dra. Kênia Garcia Advocacia. Responda de forma acolhedora, profissional e persuasiva, aplicando estratégias de captação de clientes: escuta ativa, identificação de dor, demonstração de valor, tratamento de objeções, urgência ética, fechamento com agendamento. Use o nome do cliente, seja empática e termine sempre com convite para consulta.";
      } else {
        autoLoopPrompt = `Você é um profissional jurídico ${mode === "lawyer" ? "advogado" : "juiz"} experiente. Responda de forma clara, fundamentada e persuasiva, aplicando estratégias de atendimento ao cliente.`;
      }
      const { data, error } = await supabase.functions.invoke("training-ai", {
        body: {
          action: "auto_train_loop",
          current_prompt: autoLoopPrompt,
          mode,
          area,
          target_improvement: 20,
          max_iterations: 2,
          areas: [area],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Salvar prompt evoluído para próxima sessão
      if (data.final_prompt && data.final_prompt !== autoLoopPrompt) {
        saveEvolvedLegalPrompt(mode, data.final_prompt);
      }
      setAutoLoopResults(data);
      const finalScore = data.final_score || 0;
      const totalImprovement = data.total_improvement || 0;
      setAutoLoopProgress({
        iteration: data.iterations?.length || 0,
        maxIterations: data.iterations?.length || 3,
        score: finalScore,
        status: data.reached_target ? `Meta atingida! +${totalImprovement}%` : `Melhoria total: +${totalImprovement}%`,
      });
      toast.success(`Loop concluído! Score final: ${finalScore}/100 (+${totalImprovement}%)${data.final_prompt ? "\nPrompt atualizado e salvo!" : ""}`);
    } catch (e) {
      toast.error("Erro no loop: " + (e?.message || e));
    } finally {
      setAutoLoopTraining(false);
    }
  };

  const runSimulator = async () => {
    if (simRunning) return;
    setSimRunning(true);
    setSimResults(null);
    const allStrategies = SEC_STRATEGIES;
    setSimProgress({ current: 0, total: allStrategies.length, strategy: "Iniciando..." });
    try {
      const currentPrompt = loadEvolvedLegalPrompt(mode) || loadChatConfig().prompt || CHAT_DEFAULT_PROMPT;
      const results = [];

      // Paralelizar em batches de 3 estratégias simultâneas (3x mais rápido)
      const BATCH_SIZE = 3;
      for (let batchStart = 0; batchStart < allStrategies.length; batchStart += BATCH_SIZE) {
        const batch = allStrategies.slice(batchStart, batchStart + BATCH_SIZE);
        setSimProgress({ current: batchStart + 1, total: allStrategies.length, strategy: batch.map(s => s.name).join(", ") });

        const batchResults = await Promise.allSettled(batch.map(async (s) => {
          // 1. Gerar cenário
          const { data: scenData } = await supabase.functions.invoke("training-ai", {
            body: { action: "secretary_strategy", strategy_id: s.id },
          });
          if (scenData?.error) throw new Error(scenData.error);
          const scenario = scenData?.strategy?.scenario || "";
          // 2. Gerar resposta da secretária
          const { data: respData } = await supabase.functions.invoke("training-ai", {
            body: {
              mode: "secretary", area: "general",
              history: [{ role: "assistant", content: `CENÁRIO:\n${scenario}\n\nResponda como secretária jurídica.` }],
              message: "Responda ao cenário acima",
            },
          });
          const secretaryResponse = respData?.response || "";
          // 3. Avaliar
          const { data: evalData } = await supabase.functions.invoke("training-ai", {
            body: {
              action: "secretary_evaluate",
              scenario, user_response: secretaryResponse,
              strategy_id: s.id, current_prompt: currentPrompt,
            },
          });
          return {
            strategy_id: s.id,
            strategy_name: s.name,
            score: evalData?.evaluation?.score || 0,
            feedback: evalData?.evaluation?.feedback || "",
            strengths: evalData?.evaluation?.strengths || [],
            weaknesses: evalData?.evaluation?.weaknesses || [],
          };
        }));

        for (const r of batchResults) {
          if (r.status === "fulfilled") results.push(r.value);
          else results.push({ strategy_id: "unknown", strategy_name: "Erro", score: 0, feedback: "Erro", strengths: [], weaknesses: [String(r.reason?.message || r.reason)] });
        }
      }
      const scores = results.map((r) => r.score);
      const total = results.length;
      const passed = scores.filter((s) => s >= 60).length;
      const avgScore = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;
      setSimResults({ results, stats: { total, passed, avgScore }, improved_prompt: null });
      toast.success(`Simulador concluído! Média: ${avgScore}/100 (${passed}/${total} aprovadas)`);
    } catch (e) {
      toast.error("Erro no simulador: " + (e?.message || e));
    } finally {
      setSimRunning(false);
      setSimProgress({ current: 18, total: 18, strategy: "Concluído" });
    }
  };

  const generateSimPDF = () => {
    if (!simResults) return;
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(18);
      doc.text("Relatório de Treinamento — Secretaria", pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(10);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")} | Média: ${simResults.stats?.avgScore || 0}/100 | Aprovadas: ${simResults.stats?.passed || 0}/${simResults.stats?.total || 0}`, pageWidth / 2, y, { align: "center" });
      y += 15;

      doc.setFontSize(12);
      doc.text("Resultados por Estratégia", 20, y);
      y += 8;

      (simResults.results || []).forEach((r, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const score = r.score || 0;
        const strat = WA_STRATEGIES.find((s) => s.name === r.strategy_id) || SEC_STRATEGIES.find((s) => s.id === r.strategy_id);
        doc.setFontSize(9);
        doc.setFont(undefined, "bold");
        doc.text(`${i + 1}. ${r.strategy_name || r.strategy_id}`, 20, y);
        doc.setFont(undefined, "normal");
        doc.text(`${score}/100`, 170, y);
        y += 5;
        if (r.weaknesses?.length > 0) {
          doc.setFontSize(8);
          doc.text(`Pontos fracos: ${r.weaknesses.slice(0, 3).join("; ")}`, 25, y);
          y += 5;
        }
        if (r.strengths?.length > 0) {
          doc.setFontSize(8);
          doc.text(`Pontos fortes: ${r.strengths.slice(0, 2).join("; ")}`, 25, y);
          y += 5;
        }
        y += 2;
      });

      if (simResults.improved_prompt) {
        if (y > 240) { doc.addPage(); y = 20; }
        y += 5;
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Prompt Melhorado (salvo automaticamente)", 20, y);
        y += 7;
        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        const lines = doc.splitTextToSize(simResults.improved_prompt, pageWidth - 40);
        lines.slice(0, 30).forEach((line) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(line, 20, y);
          y += 4;
        });
      }

      doc.save("treinamento-secretaria.pdf");
      toast.success("PDF gerado!");
    } catch (e) {
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendResponse();
    }
  };

  const lawyerStats = stats.lawyer;
  const judgeStats = stats.judge;
  const lawyerRate = lawyerStats.total > 0 ? Math.round((lawyerStats.passed / lawyerStats.total) * 100) : 0;
  const judgeRate = judgeStats.total > 0 ? Math.round((judgeStats.passed / judgeStats.total) * 100) : 0;

  const filteredCases = realCases.filter((c) => c.area === area && c.difficulty === difficulty);

  return (
    <div className="p-4 h-[calc(100dvh-4rem)] flex flex-col gap-4">
      <Tabs value={activeSection} onValueChange={setActiveSection} className="h-full flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <TabsList>
            <TabsTrigger value="treinamento"><GraduationCap className="w-3 h-3 mr-1" /> Treinamento</TabsTrigger>
            <TabsTrigger value="conversas"><Phone className="w-3 h-3 mr-1" /> Conversas WhatsApp</TabsTrigger>
            <TabsTrigger value="relatorios"><Scale className="w-3 h-3 mr-1" /> Relatórios do Juiz</TabsTrigger>
          </TabsList>
          {activeSection === "treinamento" && currentSession && (
            <Button size="sm" variant="outline" onClick={resetSession}>
              <RefreshCw className="w-3 h-3 mr-1" /> Novo Caso
            </Button>
          )}
        </div>

        <TabsContent value="treinamento" className="flex-1 min-h-0 mt-2">
          <div className="h-full flex flex-col gap-2">

      {/* Stats bar - compact */}
      <div className="flex gap-2 shrink-0">
        <Card className="flex-1 px-2 py-1">
          <div className="flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-gold-600" />
            <div className="text-[10px] text-muted-foreground uppercase">Advogados</div>
            <div className="text-xs font-bold ml-auto">{lawyerRate}% <span className="font-normal text-muted-foreground">({lawyerStats.total})</span></div>
          </div>
        </Card>
        <Card className="flex-1 px-2 py-1">
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-gold-600" />
            <div className="text-[10px] text-muted-foreground uppercase">Juízes</div>
            <div className="text-xs font-bold ml-auto">{judgeRate}% <span className="font-normal text-muted-foreground">({judgeStats.total})</span></div>
          </div>
        </Card>
        <Card className="flex-1 px-2 py-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <div className="text-[10px] text-muted-foreground uppercase">Loop</div>
            <div className="text-xs font-bold ml-auto">
              {autoLoopProgress ? `${autoLoopProgress.score}/100` : autoLoopResults?.final_score ? `${autoLoopResults.final_score}/100 ✓` : "—"}
            </div>
          </div>
        </Card>
      </div>

        {/* Desktop layout */}
        <div className="flex-1 min-h-0 hidden lg:grid lg:grid-cols-5 gap-3 w-full">
        {/* Left: Config or History */}
        <Card className="flex flex-col col-span-3 min-w-0 shrink-0">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold-600" />
            <span className="text-xs font-bold">
              {showConfig ? "Configurar Treino" : "Análise de Argumentação"}
            </span>
            {!showConfig && currentSession && (
              <Button size="sm" variant="outline" onClick={() => { const w = window.open("","_blank"); const title = currentSession?.case_data?.title || "Análise"; const modeLabel = currentSession.mode === "lawyer" ? "Advogado" : currentSession.mode === "secretary" ? "Secretaria" : "Juiz"; const score = currentSession.score != null ? `Score: ${currentSession.score}/100` : ""; const evalText = currentSession.evaluation?.criteria?.map((c) => `${c.name}: ${c.score}/${c.max}`).join("\n") || ""; const weaknesses = currentSession.evaluation?.weaknesses?.join("\n") || ""; const strengths = currentSession.evaluation?.strengths?.join("\n") || ""; const corrected = correctedData?.corrected_response || ""; w.document.write(`<html><head><title>${title}</title><style>body{font-family:serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.8;color:#333}h1{font-size:18px;border-bottom:2px solid #1e40af;padding-bottom:8px}h2{font-size:14px;color:#1e40af;margin-top:20px}.meta{font-size:12px;color:#666;margin-bottom:20px}pre{white-space:pre-wrap;font-size:12px;background:#f5f5f5;padding:10px;border-radius:4px}.score{font-size:24px;font-weight:bold;color:#166534}.tag{display:inline-block;background:#e0e7ff;padding:2px 8px;border-radius:4px;font-size:11px}</style></head><body><h1>${title}</h1><div class="meta">Modo: ${modeLabel} | ${score}</div>${corrected ? `<h2>Resposta Corrigida</h2><pre>${corrected.replace(/</g,"&lt;")}</pre>` : ""}${evalText ? `<h2>Avaliação</h2><pre>${evalText}</pre>` : ""}${strengths ? `<h2>Pontos Fortes</h2><pre>${strengths}</pre>` : ""}${weaknesses ? `<h2>Melhorar</h2><pre>${weaknesses}</pre>` : ""}<hr><p style="font-size:11px;color:#666;margin-top:20px;font-style:italic">Gerado por DeusFiel - Dra. Kênia Garcia</p></body></html>`); w.document.close(); setTimeout(() => w.print(), 400); }} className="ml-auto h-7 text-[10px]">
                <Printer className="w-3 h-3 mr-1" /> Imprimir Análise
              </Button>
            )}
          </div>
          <ScrollArea className="flex-1 p-4">
            {showConfig ? (
              <div className="space-y-5">
                <div>
                            <label className="text-xs font-semibold text-foreground mb-2 block">Modo de Treinamento</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setMode("lawyer")}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        mode === "lawyer"
                          ? "border-gold-400 bg-gold-50 text-gold-800 shadow-md"
                          : "border-border hover:border-gold-300 hover:bg-muted/50"
                      }`}
                    >
                      <Scale className="w-5 h-5 mb-2" />
                      <div className="text-xs font-bold">Advogado</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Argumente a favor</div>
                    </button>
                    <button
                      onClick={() => setMode("judge")}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        mode === "judge"
                          ? "border-gold-400 bg-gold-50 text-gold-800 shadow-md"
                          : "border-border hover:border-gold-300 hover:bg-muted/50"
                      }`}
                    >
                      <Star className="w-5 h-5 mb-2" />
                      <div className="text-xs font-bold">Juiz</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Analise e julgue</div>
                    </button>
                    <button
                      onClick={() => { setMode("secretary"); setSecStrategy(null); setSecScenario(null); setSecEval(null); setSecImprovedPrompt(null); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        mode === "secretary"
                          ? "border-purple-400 bg-purple-50 text-purple-800 shadow-md"
                          : "border-border hover:border-purple-300 hover:bg-muted/50"
                      }`}
                    >
                      <Phone className="w-5 h-5 mb-2" />
                      <div className="text-xs font-bold">Secretaria</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">Treino com estratégias</div>
                    </button>
                  </div>
                </div>

                {mode === "secretary" && (<>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-2 block">Estratégia de Treinamento</label>
                    <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                      {SEC_STRATEGIES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setSecStrategy(s); setSecScenario(null); setSecEval(null); setSecImprovedPrompt(null); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all ${
                            secStrategy?.id === s.id
                              ? "bg-purple-100 text-purple-800 font-semibold border-2 border-purple-300 shadow-sm"
                              : "hover:bg-muted border-2 border-transparent hover:border-border"
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{s.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {secStrategy && (
                      <Button
                        onClick={async () => {
                          if (!secStrategy || secLoading) return;
                          setSecLoading(true);
                          setSecScenario(null);
                          setSecEval(null);
                          setSecImprovedPrompt(null);
                          try {
                            const { data, error } = await supabase.functions.invoke("training-ai", {
                              body: { action: "secretary_strategy", strategy_id: secStrategy.id },
                            });
                            if (error) throw error;
                            if (data?.error) throw new Error(data.error);
                            setSecScenario(data.strategy);
                            const session = {
                              id: Date.now().toString(),
                              mode: "secretary",
                              area: "secretaria",
                              difficulty: "medio",
                              case_data: { title: secStrategy.name, description: data.strategy.scenario, strategy: secStrategy },
                              messages: [
                                { role: "assistant", content: `📋 **CENÁRIO — ${secStrategy.name}**\n\n${data.strategy.scenario}\n\n👤 Perfil: ${data.strategy.client_profile}\n\n💬 Script sugerido:\n${data.strategy.script || "Nenhum script sugerido."}` },
                              ],
                              score: null,
                              evaluation: null,
                              created_at: new Date().toISOString(),
                            };
                            setCurrentSession(session);
                            setShowConfig(false);
                            saveSessionToDb(session);
                            toast.success(`Cenário gerado: ${secStrategy.name}`);
                          } catch (e) {
                            toast.error("Erro: " + (e?.message || e));
                          } finally {
                            setSecLoading(false);
                          }
                        }}
                        disabled={secLoading}
                        className="w-full mt-2 h-10 text-xs font-semibold"
                      >
                        {secLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                        Gerar Cenário
                      </Button>
                    )}
                  </div>

                  {/* Simulador Completo */}
                  <div className="mt-4 p-3 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-purple-800">Simulador Completo</span>
                    </div>
                    <p className="text-[10px] text-purple-600 mb-3">
                      Testa todas as 18 estratégias automaticamente, gera relatório por estratégia e melhora o prompt.
                    </p>
                    <Button
                      onClick={runSimulator}
                      disabled={simRunning}
                      className="w-full h-9 text-xs font-semibold bg-purple-600 hover:bg-purple-700"
                    >
                      {simRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      {simRunning ? `${simProgress.current}/${simProgress.total} — ${simProgress.strategy}` : "Rodar Simulador (18 estratégias)"}
                    </Button>
                    {simRunning && (
                      <div className="mt-2">
                        <div className="w-full bg-purple-200 rounded-full h-1.5">
                          <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${(simProgress.current / simProgress.total) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {simResults && !simRunning && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-3 text-xs items-center">
                          <span className="text-green-600 font-bold">✓ {simResults.stats?.passed || 0} aprovadas</span>
                          <span className="text-red-600 font-bold">✗ {(simResults.stats?.total || 0) - (simResults.stats?.passed || 0)} reprovadas</span>
                          <span className="text-purple-700 font-bold">Média: {simResults.stats?.avgScore || 0}/100</span>
                          <Button size="sm" variant="outline" onClick={generateSimPDF}
                            className="text-[10px] gap-1 border-blue-200 hover:bg-blue-50 text-blue-700 ml-auto h-6">
                            <FileDown className="w-3 h-3" /> PDF
                          </Button>
                        </div>
                        {simResults.improved_prompt && (
                          <p className="text-[10px] text-green-600 font-medium">✓ Prompt melhorado e salvo automaticamente</p>
                        )}
                        <div className="max-h-[30vh] overflow-auto space-y-1">
                          {(simResults.results || []).map((r, i) => {
                            const strat = WA_STRATEGIES.find((s) => s.name === r.strategy_id) || SEC_STRATEGIES.find((s) => s.id === r.strategy_id);
                            const score = r.score || 0;
                            const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";
                            const scoreBg = score >= 80 ? "bg-green-100" : score >= 60 ? "bg-yellow-100" : "bg-red-100";
                            return (
                              <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-white border text-[10px]">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: strat?.color || "#94a3b8" }} />
                                <span className="flex-1 font-medium truncate">{r.strategy_name || r.strategy_id}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${scoreBg} ${scoreColor}`}>{score}</span>
                                {r.weaknesses?.length > 0 && (
                                  <span className="text-[8px] text-red-500" title={r.weaknesses.join("; ")}>⚠{r.weaknesses.length}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>)}

                {mode !== "secretary" && <>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-2 block">Área do Direito</label>
                    <div className="grid grid-cols-2 gap-2">
                      {LEGAL_AREAS.map((a) => (
                        <button
                          key={a.value}
                          onClick={() => { setArea(a.value); setSelectedCaseId(null); }}
                          className={`px-2.5 py-2 rounded-xl text-xs text-left transition-all ${
                            area === a.value
                              ? "bg-gold-100 text-gold-700 font-semibold border-2 border-gold-300"
                              : "text-muted-foreground hover:bg-muted border-2 border-transparent hover:border-border"
                          }`}
                        >
                          {a.icon} {a.label}
                        </button>
                      ))}
                    </div>
                  </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-2 block">Dificuldade</label>
                  <div className="flex gap-3">
                    {DIFFICULTY_LEVELS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => { setDifficulty(d.value); setSelectedCaseId(null); }}
                        className={`flex-1 px-2.5 py-2 rounded-xl text-xs text-center transition-all ${
                          difficulty === d.value
                            ? "bg-gold-100 text-gold-700 font-semibold border-2 border-gold-300"
                            : "text-muted-foreground hover:bg-muted border-2 border-transparent hover:border-border"
                        }`}
                      >
                        <div className="font-medium">{d.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border-2 border-border">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useRealCase}
                      onChange={(e) => {
                        setUseRealCase(e.target.checked);
                        if (e.target.checked) fetchRealCases();
                        setSelectedCaseId(null);
                      }}
                      className="rounded w-4 h-4"
                    />
                    <span className="font-semibold">Usar caso real de jurisprudência</span>
                  </label>
                  {useRealCase && (
                    <div className="mt-3">
                      {loadingCases ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" /> Carregando casos...
                        </div>
                      ) : filteredCases.length > 0 ? (
                        <select
                          value={selectedCaseId || ""}
                          onChange={(e) => setSelectedCaseId(e.target.value || null)}
                          className="w-full text-xs p-2 rounded-lg border-2 bg-background border-border"
                        >
                          <option value="">Selecione um caso...</option>
                          {filteredCases.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.real_reference || c.title} ({c.source})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Nenhum caso real para esta área/dificuldade.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </>}

                <Button onClick={startTraining} disabled={sending || (useRealCase && !selectedCaseId) || (mode === "secretary" && !secStrategy)} className="w-full h-10 text-xs font-bold mt-2">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                  {mode === "secretary" ? "Iniciar Treino Secretaria" : useRealCase && selectedCaseId ? "Carregar Caso Real" : "Gerar Caso para Treino"}
                </Button>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={autoCorrect}
                    disabled={correcting || !currentSession}
                    className="flex-1 text-xs h-9"
                  >
                    {correcting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    Corrigir Auto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={improveArgument}
                    disabled={improving || !currentSession}
                    className="flex-1 text-xs h-9"
                  >
                    {improving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-1" />}
                    Melhorar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={improvePrompt}
                    disabled={improvingPrompt || !currentSession}
                    className="flex-1 text-xs h-9"
                  >
                    {improvingPrompt ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Target className="w-4 h-4 mr-1" />}
                    Melhorar Prompt
                  </Button>
                </div>

                {sessions.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-2 block">Histórico Recente</label>
                    <div className="space-y-2">
                      {sessions.slice(0, 5).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setCurrentSession(s); setShowConfig(false); setCorrectedData(null); setImprovementData(null); }}
                          className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-muted flex items-center gap-2 transition-all border-2 border-transparent hover:border-border"
                        >
                          <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ backgroundColor: s.score >= 80 ? "#dcfce7" : s.score >= 60 ? "#fef9c3" : "#fee2e2" }}>
                            {s.score ?? "-"}
                          </span>
                          <span className="truncate">
                            {s.mode === "lawyer" ? "Advogado" : s.mode === "secretary" ? "Secretaria" : "Juiz"} — {LEGAL_AREAS.find((a) => a.value === s.area)?.label || s.strategy_name || s.area}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : currentSession ? (
                <div className="space-y-3">
                <div className={`p-4 rounded-lg ${currentSession.mode === "secretary" ? "bg-purple-50 border border-purple-200" : "bg-muted/50"}`}>
                  <div className="text-[10px] uppercase text-muted-foreground mb-1.5 font-medium">
                    {currentSession.mode === "lawyer" ? "📋 Caso para Advocacia" : currentSession.mode === "secretary" ? "📞 Treinamento Secretaria" : "⚖️ Caso para Julgamento"}
                  </div>
                  {currentSession.mode === "secretary" && currentSession.case_data?.strategy && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: currentSession.case_data.strategy.color }} />
                      <span className="text-xs font-semibold text-purple-800">{currentSession.case_data.strategy.name}</span>
                    </div>
                  )}
                  <div className="text-xs font-semibold mb-1">{currentSession.case_data?.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {currentSession.case_data?.description?.slice(0, 500)}
                    {currentSession.case_data?.description?.length > 500 && "..."}
                  </div>
                  {currentSession.case_data?.parties && (
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      <strong>Partes:</strong> {currentSession.case_data.parties}
                    </div>
                  )}
                  {currentSession.case_data?.question && (
                    <div className="mt-2 p-2 rounded bg-gold-50 text-xs text-gold-800">
                      <strong>Pergunta:</strong> {currentSession.case_data.question}
                    </div>
                  )}
                  {currentSession.case_data?.real_reference && (
                    <div className="mt-2 p-2 rounded bg-blue-50 border border-blue-200 text-[10px]">
                      <span className="font-medium text-blue-800">Referência:</span>{" "}
                      <span className="text-blue-700">{currentSession.case_data.real_reference}</span>
                      {currentSession.case_data.source && (
                        <span className="text-blue-500 ml-1">({currentSession.case_data.source})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={autoCorrect}
                    disabled={correcting}
                    className="flex-1 text-xs h-9"
                  >
                    {correcting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    Corrigir Auto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={improveArgument}
                    disabled={improving}
                    className="flex-1 text-xs h-9"
                  >
                    {improving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-1" />}
                    Melhorar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={improvePrompt}
                    disabled={improvingPrompt}
                    className="flex-1 text-xs h-9"
                  >
                    {improvingPrompt ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Target className="w-4 h-4 mr-1" />}
                    Melhorar Prompt
                  </Button>
                </div>

                {currentSession.score != null && (
                  <div className="p-4 rounded-lg border border-gold-200 bg-gold-50/50">
                    <div className="flex items-center gap-4 mb-3">
                      <ScoreGauge score={currentSession.score} label="Acertabilidade" />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gold-800">Avaliação</div>
                        <div className="text-[10px] text-muted-foreground">
                          {currentSession.score >= 80 ? "Excelente!" : currentSession.score >= 60 ? "Bom trabalho" : "Precisa melhorar"}
                        </div>
                      </div>
                    </div>
                    {currentSession.evaluation?.criteria && (
                      <CriteriaList criteria={currentSession.evaluation.criteria} />
                    )}
                    {currentSession.evaluation?.strengths?.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] font-medium text-green-700 mb-1">Pontos Fortes:</div>
                        {currentSession.evaluation.strengths.map((s, i) => (
                          <div key={i} className="text-[10px] text-muted-foreground">• {s}</div>
                        ))}
                      </div>
                    )}
                    {currentSession.evaluation?.weaknesses?.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] font-medium text-red-700 mb-1">Melhorar:</div>
                        {currentSession.evaluation.weaknesses.map((w, i) => (
                          <div key={i} className="text-[10px] text-muted-foreground">• {w}</div>
                        ))}
                      </div>
                    )}

                    {/* Secretary-specific: Efficiency & Effectiveness */}
                    {currentSession.mode === "secretary" && secEval && (
                      <div className="mt-3 space-y-2">
                        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                          <div className="text-xs font-medium text-purple-800 mb-1.5">Eficiência & Efetividade</div>
                          <div className="flex gap-4 mb-2">
                            <div className="flex-1 text-center p-2 rounded bg-white/60">
                              <div className="text-2xl font-bold text-purple-700">{secEval.score}%</div>
                              <div className="text-[10px] text-muted-foreground">Score Geral</div>
                            </div>
                          </div>
                          {secEval.strengths?.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[10px] font-medium text-green-700 mb-0.5">Pontos Fortes:</div>
                              {secEval.strengths.map((s, i) => (
                                <div key={i} className="text-[10px] text-green-600">• {s}</div>
                              ))}
                            </div>
                          )}
                          {secEval.weaknesses?.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[10px] font-medium text-red-700 mb-0.5">Melhorar:</div>
                              {secEval.weaknesses.map((w, i) => (
                                <div key={i} className="text-[10px] text-red-600">• {w}</div>
                              ))}
                            </div>
                          )}
                          {secEval.tips?.length > 0 && (
                            <div className="mt-2">
                              <div className="text-[10px] font-medium text-purple-700 mb-0.5">Dicas:</div>
                              {secEval.tips.map((t, i) => (
                                <div key={i} className="text-[10px] text-purple-600">• {t}</div>
                              ))}
                            </div>
                          )}
                          {secEval.feedback && (
                            <div className="mt-2 text-[10px] text-muted-foreground italic p-2 rounded bg-white/40">
                              {secEval.feedback}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!secEval || secImprovingPrompt) return;
                              setSecImprovingPrompt(true);
                              try {
                                const { data, error } = await supabase.functions.invoke("training-ai", {
                                  body: {
                                    action: "improve_prompt",
                                    mode: "secretary",
                                    current_prompt: currentPrompt || "",
                                    evaluation_summary: secEval.feedback || "",
                                    weaknesses: secEval.weaknesses || [],
                                    tips: secEval.tips || [],
                                  },
                                });
                                if (error) throw error;
                                if (data?.error) throw new Error(data.error);
                                setSecImprovedPrompt(data);
                                toast.success("Prompt melhorado!");
                              } catch (e) {
                                console.error("[secImprovePrompt] error:", e);
                                const rawMsg = e?.message || String(e || "Erro desconhecido");
                                const msg = rawMsg.includes("non-2xx")
                                  ? "Falha ao conectar com IA. Tente novamente em alguns instantes."
                                  : rawMsg;
                                toast.error("Erro ao melhorar prompt: " + String(msg));
                              } finally {
                                setSecImprovingPrompt(false);
                              }
                            }}
                            disabled={secImprovingPrompt}
                            className="flex-1 text-xs h-9"
                          >
                            {secImprovingPrompt ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Target className="w-3 h-3 mr-1" />}
                            Melhorar Prompt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!secEval || secCorrecting) return;
                              setSecCorrecting(true);
                              setSecCorrectedData(null);
                              setSecImprovementData(null);
                              try {
                                const lastUserMsg = [...currentSession.messages].reverse().find((m) => m.role === "user")?.content || "";
                                const { data, error } = await supabase.functions.invoke("training-ai", {
                                  body: {
                                    action: "evaluate_and_correct",
                                    mode: currentSession.mode || "secretary",
                                    area: currentSession.area || "secretaria",
                                    strategy_id: currentSession.strategy_id || currentSession.strategy_name,
                                    case_data: currentSession.case_data,
                                    user_response: lastUserMsg,
                                    score: currentSession.score,
                                    evaluation: currentSession.evaluation,
                                    history: currentSession.messages.slice(-10),
                                  },
                                });
                                if (error) throw error;
                                if (data?.error) throw new Error(data.error);
                                setSecCorrectedData(data);
                                toast.success("Resposta corrigida com sucesso!");
                              } catch (e) {
                                toast.error("Erro na correção: " + (e?.message || e));
                              } finally {
                                setSecCorrecting(false);
                              }
                            }}
                            disabled={secCorrecting}
                            className="flex-1 text-xs h-9"
                          >
                            {secCorrecting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                            Corrigir Auto
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!secEval || secImprovingArg) return;
                              setSecImprovingArg(true);
                              setSecCorrectedData(null);
                              setSecImprovementData(null);
                              try {
                                const lastUserMsg = [...currentSession.messages].reverse().find((m) => m.role === "user")?.content || "";
                                const { data, error } = await supabase.functions.invoke("training-ai", {
                                  body: {
                                    action: "improve_argument",
                                    mode: currentSession.mode || "secretary",
                                    area: currentSession.area || "secretaria",
                                    strategy_id: currentSession.strategy_id || currentSession.strategy_name,
                                    case_data: currentSession.case_data,
                                    user_response: lastUserMsg,
                                    score: currentSession.score,
                                    evaluation: currentSession.evaluation,
                                    history: currentSession.messages.slice(-10),
                                  },
                                });
                                if (error) throw error;
                                if (data?.error) throw new Error(data.error);
                                setSecImprovementData(data);
                                toast.success("Sugestões geradas!");
                              } catch (e) {
                                toast.error("Erro: " + (e?.message || e));
                              } finally {
                                setSecImprovingArg(false);
                              }
                            }}
                            disabled={secImprovingArg}
                            className="flex-1 text-xs h-9"
                          >
                            {secImprovingArg ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Lightbulb className="w-3 h-3 mr-1" />}
                            Melhorar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSecEval(null);
                              setSecImprovedPrompt(null);
                              setSecCorrectedData(null);
                              setSecImprovementData(null);
                              toast.success("Pronto para nova resposta!");
                            }}
                            className="flex-1 text-xs h-9"
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Nova Resposta
                          </Button>
                        </div>
                        {secImprovedPrompt && (
                          <div className="p-2 rounded border border-amber-200 bg-amber-50/50">
                            <div className="text-[10px] font-medium text-amber-800 mb-1 flex items-center gap-1">
                              <Target className="w-3 h-3" /> Prompt Melhorado
                            </div>
                            {secImprovedPrompt.changes?.length > 0 && (
                              <div className="mb-1 space-y-0.5">
                                {secImprovedPrompt.changes.map((c, i) => (
                                  <div key={i} className="text-[9px] text-amber-700">
                                    • {typeof c === "string" ? c : c.reason || c.area || JSON.stringify(c)}
                                  </div>
                                ))}
                              </div>
                            )}
                            <pre className="text-[9px] bg-amber-100 rounded p-1.5 whitespace-pre-wrap max-h-[15vh] overflow-auto border border-amber-200">{secImprovedPrompt.improved_prompt}</pre>
                            <Button size="sm" onClick={() => { setCurrentPrompt(secImprovedPrompt.improved_prompt); saveEvolvedLegalPrompt(mode, secImprovedPrompt.improved_prompt); toast.success("Prompt aplicado e salvo!"); setSecImprovedPrompt(null); }} className="w-full mt-1 text-[10px] h-6 bg-amber-600 hover:bg-amber-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Aplicar Prompt
                            </Button>
                          </div>
                        )}

                        {/* Corrected Response */}
                        {secCorrectedData && (
                          <div className="p-2 rounded border border-green-200 bg-green-50/50 mt-2">
                            <div className="text-[10px] font-medium text-green-800 mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Resposta Corrigida
                            </div>
                            {secCorrectedData.changes?.length > 0 && (
                              <div className="mb-1 space-y-0.5">
                                {secCorrectedData.changes.map((c, i) => (
                                  <div key={i} className="text-[9px] text-green-700">
                                    <span className="font-medium">Original:</span> {c.original}
                                    <br />
                                    <span className="font-medium">Corrigido:</span> {c.corrected}
                                    <br />
                                    <span className="text-green-600 italic">{c.reason}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <pre className="text-[9px] bg-green-100 rounded p-1.5 whitespace-pre-wrap max-h-[20vh] overflow-auto border border-green-200">{secCorrectedData.corrected_response}</pre>
                            {secCorrectedData.summary && (
                              <div className="text-[9px] text-green-600 italic mt-1">{secCorrectedData.summary}</div>
                            )}
                          </div>
                        )}

                        {/* Improvement Suggestions */}
                        {secImprovementData && (
                          <div className="p-2 rounded border border-blue-200 bg-blue-50/50 mt-2">
                            <div className="text-[10px] font-medium text-blue-800 mb-1 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" /> Sugestões de Melhoria
                            </div>
                            {secImprovementData.suggestions?.length > 0 && (
                              <div className="mb-1 space-y-1">
                                {secImprovementData.suggestions.map((s, i) => (
                                  <div key={i} className="text-[9px] text-blue-700">
                                    <span className="font-medium">{s.area}:</span> {s.suggestion}
                                    {s.example && (
                                      <div className="text-[8px] text-blue-600 italic mt-0.5 ml-2">Exemplo: {s.example}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {secImprovementData.priority_suggestion && (
                              <div className="text-[9px] text-blue-800 font-medium mt-1 p-1 bg-blue-100 rounded">
                                Prioridade: {secImprovementData.priority_suggestion}
                              </div>
                            )}
                            {secImprovementData.quick_wins?.length > 0 && (
                              <div className="mt-1">
                                <div className="text-[8px] font-medium text-blue-700 mb-0.5">Ganhos Rápidos:</div>
                                {secImprovementData.quick_wins.map((w, i) => (
                                  <div key={i} className="text-[8px] text-blue-600">• {w}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Judge/Lawyer Position */}
                    {currentSession.lawyer_feedback && (
                      <div className="mt-3 p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                        <div className="text-[10px] font-medium text-purple-800 mb-2 flex items-center gap-1">
                          {mode === "lawyer" ? <Scale className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                          {mode === "lawyer" ? "Posição do Advogado" : "Posição do Juiz"} em relação ao caso
                        </div>
                        <div className="text-xs text-purple-900 whitespace-pre-wrap leading-relaxed">
                          {currentSession.lawyer_feedback}
                        </div>
                      </div>
                    )}

                    {/* Improve Prompt Modal */}
                    {showImprovePrompt && improvePromptData && (
                      <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                        <div className="text-[10px] font-medium text-amber-800 mb-2 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Prompt Melhorado
                        </div>
                        {improvePromptData.changes?.length > 0 && (
                          <div className="mb-2 space-y-1">
                            {improvePromptData.changes.map((c, i) => (
                              <div key={i} className="text-[10px] text-amber-700">
                                • {typeof c === "string" ? c : c.reason || c.area || JSON.stringify(c)}
                              </div>
                            ))}
                          </div>
                        )}
                        {improvePromptData.reasoning && (
                          <div className="text-[10px] text-amber-600 italic mb-2">{improvePromptData.reasoning}</div>
                        )}
                        <pre className="text-[10px] bg-amber-100 rounded p-2 whitespace-pre-wrap max-h-[20vh] overflow-auto border border-amber-200">{improvePromptData.improved_prompt}</pre>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => { setCurrentPrompt(improvePromptData.improved_prompt); saveEvolvedLegalPrompt(mode, improvePromptData.improved_prompt); toast.success("Prompt aplicado e salvo!"); setShowImprovePrompt(false); }} className="flex-1 text-[10px] h-7 bg-amber-600 hover:bg-amber-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Aplicar Prompt
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowImprovePrompt(false)} className="text-[10px] h-7">
                            Fechar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Comparison view */}
                {showComparison && correctedData && (
                  <div className="p-3 rounded-lg border border-green-200 bg-green-50/50">
                    <DiffView
                      original={[...currentSession.messages].reverse().find((m) => m.role === "user")?.content}
                      corrected={correctedData.corrected_response}
                      changes={correctedData.changes}
                    />
                    {correctedData.summary && (
                      <div className="mt-2 p-2 rounded bg-muted/50 text-[10px]">
                        <span className="font-medium">Resumo:</span> {correctedData.summary}
                      </div>
                    )}
                  </div>
                )}

                {/* Suggestions view */}
                {showSuggestions && improvementData && (
                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                    <SuggestionsPanel
                      suggestions={improvementData.suggestions}
                      priority={improvementData.priority_suggestion}
                      quickWins={improvementData.quick_wins}
                    />
                  </div>
                )}

                <div>
                  <button
                    onClick={() => setShowConfig(true)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    ← Voltar à configuração
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center py-12">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-medium">Configure e inicie um treino.</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Right: Chat */}
        <Card className="flex flex-col col-span-2 min-w-0">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold-600" />
            <span className="text-xs font-bold">
              {currentSession
                ? currentSession.mode === "lawyer"
                  ? "Sua Argumentação"
                  : currentSession.mode === "secretary"
                    ? "Simulação de Atendimento"
                    : "Sua Sentença"
                : "Chat de Treino"}
            </span>
            {currentSession?.score != null && (
              <Badge variant="secondary" className="ml-auto text-xs px-2 py-0.5">
                {currentSession.score}/100
              </Badge>
            )}
          </div>
          <ScrollArea className="flex-1 p-5">
            {!currentSession ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center py-12">
                  <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm font-medium mb-1">Configure e inicie um treino</p>
                  <p className="text-xs text-muted-foreground">Escolha o modo à esquerda e clique em Gerar</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentSession.messages.map((m, i) => {
                  const isLawyerRef = m.role === "assistant" && m.content?.startsWith("📋 **ARGUMENTAÇÃO DO ADVOGADO");
                  const isScenario = m.role === "assistant" && m.content?.startsWith("📋 **CENÁRIO");
                  return (
                    <div key={i} className={`${m.role === "user" ? "flex justify-end" : ""}`}>
                      {isLawyerRef ? (
                        <div className="w-full p-4 rounded-xl border border-blue-200 bg-blue-50/80 text-left">
                          <div className="flex items-center gap-2 mb-2">
                            <Scale className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-800">ARGUMENTAÇÃO DO ADVOGADO (Referência)</span>
                          </div>
                          <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-blue-900">
                            {m.content.replace("📋 **ARGUMENTAÇÃO DO ADVOGADO (Referência):**\n\n", "")}
                          </div>
                        </div>
                      ) : isScenario ? (
                        <div className="w-full p-5 rounded-xl border border-purple-200 bg-purple-50/80 text-left">
                          <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-purple-900">
                            {m.content}
                          </div>
                        </div>
                      ) : (
                        <div className={`max-w-[80%] rounded-xl px-5 py-3 ${
                          m.role === "user" ? "bg-gold-100 text-gold-900" : "bg-muted text-foreground"
                        }`}>
                          <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">{m.content}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                    <Loader2 className="w-5 h-5 animate-spin text-gold-600" />
                    <span className="text-xs font-medium">{currentSession.mode === "lawyer" ? "Analisando argumentação..." : currentSession.mode === "secretary" ? "Simulando atendimento..." : "Avaliando sentença..."}</span>
                  </div>
                )}
                {correcting && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    <span className="text-xs font-medium">Corrigindo resposta automaticamente...</span>
                  </div>
                )}
                {improving && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    <span className="text-xs font-medium">Gerando sugestões de melhoria...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>
          <div className="p-4 border-t">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !currentSession
                    ? "Gere um caso primeiro..."
                    : currentSession.mode === "secretary"
                      ? "Responda ao cenário de treinamento..."
                      : currentSession.mode === "lawyer"
                        ? "Escreva sua argumentação jurídica..."
                        : "Escreva sua sentença/decisão..."
                }
                disabled={sending || !currentSession}
                className="flex-1 h-10 text-xs"
              />
              <Button size="default" onClick={sendResponse} disabled={sending || !input.trim() || !currentSession} className="h-10 px-4">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
        </div>

      {/* Mobile */}
      <div className="flex-1 min-h-0 lg:hidden">
        <Tabs value={currentSession ? "chat" : "config"} className="h-full flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="config"><BookOpen className="w-3 h-3 mr-1" /> Config</TabsTrigger>
            <TabsTrigger value="chat" disabled={!currentSession}><MessageSquare className="w-3 h-3 mr-1" /> Responder</TabsTrigger>
          </TabsList>
          <TabsContent value="config" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-full p-3">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setMode("lawyer")} className={`p-2 rounded-lg border text-left ${mode === "lawyer" ? "border-gold-300 bg-gold-50" : "border-nude-200"}`}>
                    <Scale className="w-4 h-4 mb-1" /><div className="text-[11px] font-semibold">Advogado</div>
                  </button>
                  <button onClick={() => setMode("judge")} className={`p-2 rounded-lg border text-left ${mode === "judge" ? "border-gold-300 bg-gold-50" : "border-nude-200"}`}>
                    <Star className="w-4 h-4 mb-1" /><div className="text-[11px] font-semibold">Juiz</div>
                  </button>
                  <button onClick={() => { setMode("secretary"); setSecStrategy(null); setSecScenario(null); setSecEval(null); setSecImprovedPrompt(null); }} className={`p-2 rounded-lg border text-left ${mode === "secretary" ? "border-purple-300 bg-purple-50" : "border-nude-200"}`}>
                    <Phone className="w-4 h-4 mb-1" /><div className="text-[11px] font-semibold">Secretaria</div>
                  </button>
                </div>
                {mode === "secretary" && (
                  <div className="space-y-1 max-h-[20vh] overflow-auto">
                    {SEC_STRATEGIES.map((s) => (
                      <button key={s.id} onClick={() => { setSecStrategy(s); setSecScenario(null); setSecEval(null); setSecImprovedPrompt(null); }}
                        className={`w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center gap-2 ${secStrategy?.id === s.id ? "bg-purple-100 text-purple-800 font-medium border border-purple-300" : "hover:bg-muted border border-transparent"}`}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {mode !== "secretary" && <div className="flex gap-2">
                  {DIFFICULTY_LEVELS.map((d) => (
                    <button key={d.value} onClick={() => { setDifficulty(d.value); setSelectedCaseId(null); }} className={`flex-1 px-2 py-2 rounded text-[11px] text-center ${difficulty === d.value ? "bg-gold-100 text-gold-700 font-medium" : "text-muted-foreground border"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>}

                {mode !== "secretary" && <div className="p-2 rounded bg-muted/50 border">
                  <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useRealCase}
                      onChange={(e) => {
                        setUseRealCase(e.target.checked);
                        if (e.target.checked) fetchRealCases();
                        setSelectedCaseId(null);
                      }}
                      className="rounded"
                    />
                    <span className="font-medium">Caso real</span>
                  </label>
                  {useRealCase && (
                    <div className="mt-2">
                      {loadingCases ? (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
                        </div>
                      ) : filteredCases.length > 0 ? (
                        <select
                          value={selectedCaseId || ""}
                          onChange={(e) => setSelectedCaseId(e.target.value || null)}
                          className="w-full text-[11px] p-1.5 rounded border bg-background"
                        >
                          <option value="">Selecione...</option>
                          {filteredCases.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.real_reference || c.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-[10px] text-muted-foreground">Nenhum caso disponível.</div>
                      )}
                    </div>
                  )}
                </div>}

                <Button onClick={startTraining} disabled={sending || (useRealCase && !selectedCaseId) || (mode === "secretary" && !secStrategy)} className="w-full">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                  {mode === "secretary" ? "Iniciar Treino Secretaria" : "Gerar Caso"}
                </Button>

                {/* Loop de Melhoria Mobile */}
                <div className="p-2 rounded bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-[11px] font-medium text-purple-800">Loop de Melhoria</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Treinar → Melhorar → Repetir até +20%</p>
                  {autoLoopProgress && (
                    <div className="mb-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-purple-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${(autoLoopProgress.iteration / autoLoopProgress.maxIterations) * 100}%` }} />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {autoLoopProgress.iteration}/{autoLoopProgress.maxIterations} — {autoLoopProgress.status}
                      </div>
                    </div>
                  )}
                  <Button onClick={startAutoLoopTraining} disabled={autoLoopTraining} className="w-full" size="sm" variant="outline">
                    {autoLoopTraining ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                    {autoLoopTraining ? "Treinando..." : "Iniciar Loop"}
                  </Button>
                  {autoLoopResults && !autoLoopTraining && (
                    <div className="mt-2 text-[10px]">
                      <div className="flex gap-2">
                        <span className="text-blue-600">Inicial: {autoLoopResults.baseline_score}</span>
                        <span className="text-emerald-600">Final: {autoLoopResults.final_score}</span>
                        <span className="text-purple-600">+{autoLoopResults.total_improvement}%</span>
                      </div>
                    </div>
                   )}

                  <div className="mt-3 p-2 rounded border bg-blue-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[10px] font-medium text-blue-800">Simulação Automática de Captura</span>
                    </div>
                    <p className="text-[9px] text-blue-700 mb-2">Gera 5 cenários reais e responde com a melhor estratégia para converter cada lead em cliente.</p>
                    <Button size="sm" onClick={runAutoSimulate} disabled={autoSimRunning} className="w-full text-[10px] h-7 bg-blue-600 hover:bg-blue-700">
                      {autoSimRunning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                      {autoSimRunning ? autoSimProgress || "Simulando..." : "Rodar 5 Simulações Automáticas"}
                    </Button>
                    {autoSimData && !autoSimRunning && (
                      <div className="mt-2 space-y-2 max-h-[400px] overflow-y-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-800">Média:</span>
                          <span className={`text-[11px] font-bold ${autoSimData.avg_score >= 70 ? "text-green-600" : autoSimData.avg_score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                            {autoSimData.avg_score}/100
                          </span>
                          <span className="text-[9px] text-muted-foreground">({autoSimData.total} cenários)</span>
                        </div>
                        {autoSimData.scenarios?.map((sc, si) => (
                          <div key={si} className="p-2 rounded-lg bg-white border text-[9px] space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-blue-900">{sc.client_name}</span>
                              <span className="px-1 py-0.5 rounded text-[7px] font-bold uppercase text-white"
                                style={{ backgroundColor: (WA_STRATEGIES.find(s => s.name === sc.strategy) || {}).color || "#64748b" }}>
                                {sc.strategy}
                              </span>
                              <span className="px-1 py-0.5 rounded bg-gray-100 text-[7px] font-medium text-gray-600">{sc.area}</span>
                              <span className={`ml-auto font-bold ${sc.score >= 70 ? "text-green-600" : sc.score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                                {sc.score}/100
                              </span>
                            </div>
                            <div className="text-gray-600 italic">"{sc.client_message}"</div>
                            <div className="relative group">
                              <div className="text-blue-800 whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto pr-10">{sc.professional_response?.slice(0, 500)}{sc.professional_response?.length > 500 ? "..." : ""}</div>
                              <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { navigator.clipboard.writeText(sc.professional_response || ""); toast.success("Copiado!"); }} className="p-0.5 rounded hover:bg-white" title="Copiar">
                                  <Copy className="w-3 h-3 text-blue-500" />
                                </button>
                                <button onClick={() => { const w = window.open("","_blank"); w.document.write(`<html><head><title>${sc.client_name} - ${sc.strategy}</title><style>body{font-family:serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.8;color:#333}h1{font-size:16px;border-bottom:2px solid #1e40af;padding-bottom:8px}.meta{font-size:11px;color:#666}</style></head><body><h1>Dra. Kênia Garcia Advocacia — ${sc.area}</h1><div class="meta">Cliente: ${sc.client_name} | Estratégia: ${sc.strategy} | Score: ${sc.score}/100</div><hr><p style="font-style:italic;color:#666">Mensagem do cliente: "${sc.client_message}"</p><hr><div style="white-space:pre-wrap;font-size:13px">${sc.professional_response||""}</div><hr><div class="meta" style="margin-top:20px;font-style:italic">Orientação preliminar — não substitui consulta jurídica presencial.</div></body></html>`); w.document.close(); w.print(); }} className="p-0.5 rounded hover:bg-white" title="Imprimir">
                                  <Printer className="w-3 h-3 text-blue-500" />
                                </button>
                              </div>
                            </div>
                            {sc.evaluation?.strengths?.length > 0 && (
                              <div className="text-green-700">+ {sc.evaluation.strengths[0]}</div>
                            )}
                            {sc.evaluation?.weaknesses?.length > 0 && (
                              <div className="text-red-600">- {sc.evaluation.weaknesses[0]}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 p-2 rounded border bg-emerald-50">
                    <div className="text-[10px] font-medium text-emerald-800 mb-2">Simulação WhatsApp</div>
                    <input
                      type="text"
                      value={simulationClientName}
                      onChange={(e) => setSimulationClientName(e.target.value)}
                      placeholder="Nome do cliente"
                      className="w-full px-2 py-1 rounded border text-[10px] mb-2"
                    />
                    <textarea
                      value={simulationMessage}
                      onChange={(e) => setSimulationMessage(e.target.value)}
                      placeholder="Mensagem do cliente..."
                      className="w-full px-2 py-1 rounded border text-[10px] min-h-[50px] resize-none mb-2"
                    />
                    <Button size="sm" onClick={simulateWhatsApp} disabled={simulating || !simulationMessage.trim()} className="w-full text-[10px] h-7">
                      {simulating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                      Simular {mode === "lawyer" ? "Advogado" : mode === "secretary" ? "Secretaria" : "Juiz"}
                    </Button>
                    {simulationData && (
                      <div className="mt-2 space-y-2">
                        <div className="p-2 rounded bg-blue-50 border border-blue-200">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] font-medium text-blue-800">Resposta do {mode === "lawyer" ? "Advogado" : "Juiz"}</div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => { navigator.clipboard.writeText(simulationData.professional_response || ""); toast.success("Copiado!"); }}
                                className="p-1 rounded hover:bg-blue-100 transition-colors"
                                title="Copiar resposta"
                              >
                                <Copy className="w-3 h-3 text-blue-600" />
                              </button>
                              <button
                                onClick={() => {
                                  const w = window.open("", "_blank");
                                  w.document.write(`<html><head><title>Resposta - Kenia Garcia Advocacia</title><style>body{font-family:serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.8;color:#333}h1{font-size:18px;border-bottom:2px solid #1e40af;padding-bottom:8px}h2{font-size:14px;color:#1e40af;margin-top:20px}.meta{font-size:12px;color:#666;margin-bottom:20px}</style></head><body><h1>Dra. Kênia Garcia Advocacia</h1><div class="meta">Área: ${area} | Cliente: ${simulationClientName} | Modo: ${mode === "lawyer" ? "Advogado" : "Juiz"}</div><hr><div style="white-space:pre-wrap;font-size:13px">${simulationData.professional_response || ""}</div><hr><div class="meta" style="margin-top:20px;font-style:italic">Orientação preliminar — não substitui consulta jurídica presencial.</div></body></html>`);
                                  w.document.close();
                                  w.print();
                                }}
                                className="p-1 rounded hover:bg-blue-100 transition-colors"
                                title="Imprimir resposta"
                              >
                                <Printer className="w-3 h-3 text-blue-600" />
                              </button>
                            </div>
                          </div>
                          <div className="text-[10px] text-blue-700 whitespace-pre-wrap">
                            {(() => {
                              let tags = simulationData.strategy_tags || [];
                              if (tags.length === 0 && simulationData.professional_response) {
                                const paragraphs = simulationData.professional_response.split(/\n\n+/).filter(p => p.trim().length > 10);
                                tags = paragraphs.map((p) => ({ text: p.trim(), strategy: detectStrategy(p, "outgoing") }));
                              }
                              return tags.length > 0
                                ? tags.map((tag, ti) => {
                                    const strat = SECRETARY_STRATEGY_COLORS[tag.strategy] || { color: "#64748b", label: tag.strategy };
                                    return (
                                      <span key={ti} className="block mb-2">
                                        <span
                                          className="inline-block rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider mr-1.5 align-middle"
                                          style={{ backgroundColor: strat.color, color: "#fff", lineHeight: "1.4" }}
                                        >
                                          {strat.label}
                                        </span>
                                        <span
                                          className="border-b-2 leading-relaxed"
                                          style={{ borderColor: strat.color }}
                                        >
                                          {tag.text}
                                        </span>
                                      </span>
                                    );
                                  })
                                : <span>{simulationData.professional_response}</span>;
                            })()}
                          </div>
                        </div>
                        <div className="text-[10px] text-purple-700 font-medium">Score: {simulationData.evaluation?.score || 0}/100</div>
                        
                        {simulationData.improved_prompt && (
                          <div className="p-2 rounded bg-amber-50 border border-amber-200">
                            <div className="text-[10px] font-medium text-amber-800 mb-1">✓ Prompt Melhorado</div>
                            <div className="text-[10px] text-amber-700 mb-2">Score baixo — prompt melhorado automaticamente</div>
                            <Button size="sm" onClick={applyImprovedPrompt} className="w-full text-[10px] h-7 bg-amber-600 hover:bg-amber-700">
                              <Sparkles className="w-3 h-3 mr-1" /> Aplicar Prompt Melhorado
                            </Button>
                          </div>
                        )}
                        
                        <Button size="sm" variant="outline" onClick={applySimulationToTraining} className="w-full text-[10px] h-7">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Aplicar ao Treinamento
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="chat" className="flex-1 min-h-0 mt-2">
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {currentSession?.messages.map((m, i) => {
                    const isLawyerRef = m.role === "assistant" && m.content?.startsWith("📋 **ARGUMENTAÇÃO DO ADVOGADO");
                    return (
                      <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
                        {isLawyerRef ? (
                          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/80 text-left">
                            <div className="flex items-center gap-2 mb-2">
                              <Scale className="w-4 h-4 text-blue-600" />
                              <span className="text-[11px] font-semibold text-blue-800">ARGUMENTAÇÃO DO ADVOGADO (Referência)</span>
                            </div>
                            <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-blue-900">
                              {m.content.replace("📋 **ARGUMENTAÇÃO DO ADVOGADO (Referência):**\n\n", "")}
                            </div>
                          </div>
                        ) : (
                          <div className={`inline-block max-w-[90%] rounded-lg px-3 py-2 ${m.role === "user" ? "bg-gold-100 text-gold-900" : "bg-muted text-foreground"}`}>
                            <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">{m.content}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Mobile: score + actions */}
                  {currentSession?.score != null && (
                    <div className="p-3 rounded-lg border border-gold-200 bg-gold-50/50">
                      <div className="flex items-center gap-3 mb-2">
                        <ScoreGauge score={currentSession.score} label="Score" />
                        <div className="flex-1 text-xs text-muted-foreground">
                          {currentSession.score >= 80 ? "Excelente!" : currentSession.score >= 60 ? "Bom" : "Melhorar"}
                        </div>
                      </div>
                      {currentSession.evaluation?.criteria && <CriteriaList criteria={currentSession.evaluation.criteria} />}
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={autoCorrect} disabled={correcting} className="flex-1 text-[10px] h-7">
                          {correcting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                          Corrigir
                        </Button>
                        <Button size="sm" variant="outline" onClick={improveArgument} disabled={improving} className="flex-1 text-[10px] h-7">
                          {improving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Lightbulb className="w-3 h-3 mr-1" />}
                          Melhorar
                        </Button>
                        <Button size="sm" variant="outline" onClick={improvePrompt} disabled={improvingPrompt} className="flex-1 text-[10px] h-7">
                          {improvingPrompt ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Target className="w-3 h-3 mr-1" />}
                          Prompt
                        </Button>
                      </div>

                      {/* Mobile: Judge/Lawyer Position */}
                      {currentSession.lawyer_feedback && (
                        <div className="mt-3 p-2 rounded border border-purple-200 bg-purple-50/50">
                          <div className="text-[10px] font-medium text-purple-800 mb-1 flex items-center gap-1">
                            {mode === "lawyer" ? <Scale className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                            {mode === "lawyer" ? "Posição do Advogado" : "Posição do Juiz"}
                          </div>
                          <div className="text-[10px] text-purple-900 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                            {currentSession.lawyer_feedback}
                          </div>
                        </div>
                      )}

                      {/* Mobile: Improve Prompt Modal */}
                      {showImprovePrompt && improvePromptData && (
                        <div className="mt-3 p-2 rounded border border-amber-200 bg-amber-50/50">
                          <div className="text-[10px] font-medium text-amber-800 mb-1">Prompt Melhorado</div>
                          <pre className="text-[10px] bg-amber-100 rounded p-2 whitespace-pre-wrap max-h-24 overflow-auto border border-amber-200">{improvePromptData.improved_prompt}</pre>
                          <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => { setCurrentPrompt(improvePromptData.improved_prompt); saveEvolvedLegalPrompt(mode, improvePromptData.improved_prompt); toast.success("Prompt aplicado e salvo!"); setShowImprovePrompt(false); }} className="flex-1 text-[10px] h-7 bg-amber-600 hover:bg-amber-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Aplicar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowImprovePrompt(false)} className="text-[10px] h-7">
                              Fechar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mobile: comparison */}
                  {showComparison && correctedData && (
                    <div className="p-2 rounded border border-green-200 bg-green-50/50">
                      <DiffView
                        original={[...currentSession.messages].reverse().find((m) => m.role === "user")?.content}
                        corrected={correctedData.corrected_response}
                        changes={correctedData.changes}
                      />
                    </div>
                  )}

                  {/* Mobile: suggestions */}
                  {showSuggestions && improvementData && (
                    <div className="p-2 rounded border border-blue-200 bg-blue-50/50">
                      <SuggestionsPanel
                        suggestions={improvementData.suggestions}
                        priority={improvementData.priority_suggestion}
                        quickWins={improvementData.quick_wins}
                      />
                    </div>
                  )}

                  {sending && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Avaliando...</div>}
                  {correcting && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Corrigindo...</div>}
                  {improving && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Gerando sugestões...</div>}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <div className="p-3 border-t flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={currentSession?.mode === "secretary" ? "Digite sua resposta como secretária..." : "Sua resposta..."} disabled={sending || !currentSession} className="flex-1" />
                <Button size="sm" onClick={sendResponse} disabled={sending || !input.trim() || !currentSession}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      </div>
      </TabsContent>

      <TabsContent value="conversas" className="flex-1 min-h-0 mt-2 flex flex-col">
        <div className="h-full max-lg:hidden flex gap-3 overflow-hidden">
          {/* Col 1: Conversations list */}
          <div className="w-[220px] shrink-0 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
            <div className="p-2.5 border-b border-border">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Conversas ({waConversations.length})
              </h2>
              {waDataSource === "none" && (
                <span className="text-[9px] text-muted-foreground font-medium">Sem dados reais</span>
              )}
              {waDataSource === "supabase" && (
                <span className="text-[9px] text-green-600 font-medium">Conversas Reais</span>
              )}
              {waDataSource === "backend" && (
                <span className="text-[9px] text-green-600 font-medium">WhatsApp Real</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {waLoading ? (
                <div className="p-3 text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
                </div>
              ) : waConversations.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Nenhuma conversa</div>
              ) : (
                waConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => { loadWaMessages(conv.id); setWaSelectedMsgIdx(null); setWaCorrection(""); }}
                    className={`w-full text-left p-2.5 border-b border-border transition-colors hover:bg-accent ${waSelectedId === conv.id ? "bg-accent" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{conv.member_name || formatWaPhone(conv.phone)}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{conv.phone}</p>
                      </div>
                      <span className="inline-block h-2 w-2 rounded-full shrink-0 ml-1" style={{ backgroundColor: getWaStrategyColor(conv.current_strategy) }} />
                    </div>
                    <div className="mt-1">
                      <span className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: getWaStrategyColor(conv.current_strategy) + "22", color: getWaStrategyColor(conv.current_strategy) }}>
                        {getWaStrategyLabel(conv.current_strategy)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Col 2: Messages panel — Chat Interativo */}
          <div className="flex-1 flex flex-col border border-border rounded-xl bg-card overflow-hidden min-w-0">
            {waSelectedId ? (() => {
              const selectedConv = waConversations.find((c) => c.id === waSelectedId);
              if (!selectedConv) return null;
              return (
                <>
                  <div className="p-2.5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-xs font-semibold">{selectedConv.member_name || formatWaPhone(selectedConv.phone)}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedConv.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-green-600 font-medium flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Ativo
                      </span>
                      <button onClick={() => loadWaMessages(waSelectedId, true)} className="p-1 rounded hover:bg-muted" title="Atualizar">
                        <RefreshCw className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  {/* Strategy flow timeline */}
                  {waMessages.length > 2 && (() => {
                    const uniqueStrats = [...new Set(waMessages.map(m => m.strategy_name || detectStrategy(m.content, m.direction)))];
                    if (uniqueStrats.length <= 1) return null;
                    return (
                      <div className="px-1 py-2">
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          {uniqueStrats.map((s, si) => {
                            const info = WA_STRATEGIES.find(st => st.name === s);
                            return (
                              <div key={s} className="flex items-center gap-0 shrink-0">
                                {si > 0 && <ChevronDown className="w-3 h-3 -rotate-90 text-muted-foreground shrink-0" />}
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold whitespace-nowrap"
                                  style={{ backgroundColor: (info?.color || "#64748b") + "20", color: info?.color || "#64748b", border: `1px solid ${(info?.color || "#64748b")}40` }}>
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info?.color || "#64748b" }} />
                                  {info?.label || s}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {waMessages.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>Nenhuma mensagem ainda</p>
                        <p className="text-[10px] mt-1">As mensagens do cliente aparecerão aqui</p>
                      </div>
                    )}
                    {waMessages.map((msg, idx) => {
                      const isOut = msg.direction === "outgoing";
                      const stratName = msg.strategy_name || detectStrategy(msg.content, msg.direction);
                      const stratInfo = WA_STRATEGIES.find(s => s.name === stratName);
                      const isLatest = idx === waMessages.length - 1;
                      const prevStratName = idx > 0 ? (waMessages[idx - 1].strategy_name || detectStrategy(waMessages[idx - 1].content, waMessages[idx - 1].direction)) : null;
                      const stratChanged = prevStratName && prevStratName !== stratName;
                      return (
                        <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 shadow-sm ${isOut ? "bg-green-500 text-white" : "bg-white border border-gray-200"} ${stratChanged && !isOut ? "ring-2 ring-offset-1" : ""}`}
                            style={stratChanged && !isOut ? { ringColor: stratInfo?.color || "#64748b" } : {}}>
                            <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isOut ? "text-white" : "text-gray-800"}`}>{msg.content}</p>
                            <div className="mt-0.5 flex items-center justify-end gap-1 flex-wrap">
                              {stratInfo && (
                                <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[7px] font-bold ${isLatest ? "animate-pulse" : ""}`}
                                  style={{ backgroundColor: stratInfo.color + "30", color: isOut ? "#fff" : stratInfo.color, border: `1px solid ${stratInfo.color}40` }}>
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stratInfo.color }} />
                                  {stratInfo.label}
                                </span>
                              )}
                              <span className={`text-[9px] ${isOut ? "text-green-100" : "text-gray-400"}`}>{formatWaTime(msg.created_at)}</span>
                              {isOut && <span className="text-[9px] text-green-100">✓</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={waMessagesEndRef} />
                  </div>
                  {/* Input para enviar mensagem ao cliente */}
                  <div className="p-2.5 border-t border-border bg-muted/30">
                    <div className="flex gap-2">
                      <Input
                        value={waInput}
                        onChange={(e) => setWaInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendWaMessage(waInput); } }}
                        placeholder="Digite sua resposta para o cliente..."
                        disabled={waSending}
                        className="flex-1 text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => sendWaMessage(waInput)}
                        disabled={waSending || !waInput.trim()}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {waSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1 text-center">
                      Enter para enviar · Resposta vai direto ao WhatsApp do cliente
                    </p>
                  </div>
                </>
              );
            })() : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="text-3xl mb-3">💬</div>
                  <p className="text-sm font-semibold">Selecione uma conversa</p>
                  <p className="text-[10px] mt-1 max-w-xs">Clique em um contato para ver as mensagens e responder clientes em tempo real.</p>
                </div>
              </div>
            )}
          </div>

          {/* Col 3: Training panel — compacto */}
          <div className="w-[240px] shrink-0 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
            <div className="p-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-gold-600" />
                <h2 className="text-[11px] font-semibold uppercase tracking-wider">Treinamento</h2>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">Estratégias de captação</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
              {waSelectedMsgIdx !== null ? (
                <>
                  {/* Selected message preview */}
                  <div className="p-2 rounded-lg bg-muted/50 border">
                    <div className="text-[9px] font-medium text-muted-foreground mb-1">Mensagem selecionada:</div>
                    <p className="text-[10px] leading-relaxed">{waMessages[waSelectedMsgIdx]?.content?.slice(0, 120)}{waMessages[waSelectedMsgIdx]?.content?.length > 120 ? "..." : ""}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="inline-block rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ backgroundColor: getWaStrategyColor(waMessages[waSelectedMsgIdx]?.strategy_name), color: "#fff" }}>
                        {getWaStrategyLabel(waMessages[waSelectedMsgIdx]?.strategy_name)}
                      </span>
                    </div>
                  </div>

                  {/* Strategy selector */}
                  <div>
                    <div className="text-[9px] font-medium text-muted-foreground mb-1.5">Reclassificar estratégia:</div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {WA_STRATEGIES.map((s) => (
                        <button
                          key={s.name}
                          onClick={() => setWaSelectedStrategy(s.name)}
                          className={`w-full text-left p-1.5 rounded-lg text-[10px] transition-colors flex items-center gap-2 ${waSelectedStrategy === s.name ? "ring-1" : "hover:bg-muted"}`}
                          style={waSelectedStrategy === s.name ? { backgroundColor: s.color + "18", borderColor: s.color } : {}}
                        >
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{s.label}</div>
                            <div className="text-[8px] text-muted-foreground truncate">{s.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Correction textarea */}
                  <div>
                    <div className="text-[9px] font-medium text-muted-foreground mb-1">Correção da resposta:</div>
                    <textarea
                      value={waCorrection}
                      onChange={(e) => setWaCorrection(e.target.value)}
                      placeholder="Escreva a resposta corrigida..."
                      className="w-full text-[10px] p-2 rounded-lg border bg-background resize-none h-20"
                    />
                  </div>

                  <Button
                    size="sm"
                    className="w-full text-[10px] h-7"
                    onClick={() => {
                      if (!waCorrection.trim()) { toast.error("Escreva a correção"); return; }
                      toast.success("Correção aplicada! Estratégia: " + getWaStrategyLabel(waSelectedStrategy));
                      setWaSelectedMsgIdx(null);
                      setWaCorrection("");
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Aplicar Correção
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Estratégias de Captação</div>
                  {WA_STRATEGIES.filter(s => s.group === "captação").map((s) => (
                    <div key={s.name} className="flex items-start gap-2 p-1.5 rounded-lg">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: s.color }} />
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium">{s.label}</div>
                        <div className="text-[8px] text-muted-foreground">{s.description}</div>
                      </div>
                    </div>
                  ))}
                  <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider pt-1">Leads por Área</div>
                  {WA_STRATEGIES.filter(s => s.group === "leads").map((s) => (
                    <div key={s.name} className="flex items-start gap-2 p-1.5 rounded-lg">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: s.color }} />
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium">{s.label}</div>
                        <div className="text-[8px] text-muted-foreground">{s.description}</div>
                      </div>
                    </div>
                  ))}
                  <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider pt-1">Atendimento</div>
                  {WA_STRATEGIES.filter(s => s.group === "atendimento").map((s) => (
                    <div key={s.name} className="flex items-start gap-2 p-1.5 rounded-lg">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: s.color }} />
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium">{s.label}</div>
                        <div className="text-[8px] text-muted-foreground">{s.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: Conversas */}
        <div className="flex-1 min-h-0 lg:hidden flex flex-col">
          <Tabs value={waMobileTab} onValueChange={setWaMobileTab} className="h-full flex flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="contatos"><Phone className="w-3 h-3 mr-1" /> Contatos</TabsTrigger>
              <TabsTrigger value="mensagens" disabled={!waSelectedId}><MessageSquare className="w-3 h-3 mr-1" /> Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="contatos" className="flex-1 min-h-0 mt-2">
              <div className="h-full overflow-y-auto">
                {waLoading ? (
                  <div className="p-3 text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
                  </div>
                ) : waConversations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">Nenhuma conversa</div>
                ) : (
                  <div className="space-y-1">
                    {waConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => { loadWaMessages(conv.id); setWaSelectedMsgIdx(null); setWaCorrection(""); setWaMobileTab("mensagens"); }}
                        className={`w-full text-left p-3 border-b border-border transition-colors hover:bg-accent ${waSelectedId === conv.id ? "bg-accent" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{conv.member_name || formatWaPhone(conv.phone)}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{conv.phone}</p>
                          </div>
                          <span className="inline-block h-3 w-3 rounded-full shrink-0 ml-2 animate-pulse" style={{ backgroundColor: getWaStrategyColor(conv.current_strategy) }} />
                        </div>
                        <div className="mt-1.5">
                          <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: getWaStrategyColor(conv.current_strategy) + "22", color: getWaStrategyColor(conv.current_strategy) }}>
                            {getWaStrategyLabel(conv.current_strategy)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="mensagens" className="flex-1 min-h-0 mt-2">
              <div className="h-full flex flex-col">
                {waSelectedId ? (() => {
                  const selectedConv = waConversations.find((c) => c.id === waSelectedId);
                  return (
                    <>
                      <div className="p-2.5 border-b border-border flex items-center justify-between shrink-0 bg-card">
                        <div className="flex items-center gap-2 min-w-0">
                          <button onClick={() => { const el = document.querySelector('[data-value="contatos"]'); if (el) el.click(); }} className="p-1 -ml-1 rounded hover:bg-muted">
                            <ChevronDown className="w-4 h-4 rotate-90 text-muted-foreground" />
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{selectedConv?.member_name || formatWaPhone(selectedConv?.phone || "")}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{selectedConv?.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Ativo
                          </span>
                          <button onClick={() => loadWaMessages(waSelectedId, true)} className="p-1 rounded hover:bg-muted">
                            <RefreshCw className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                      <ScrollArea className="flex-1 p-3">
                        <div className="space-y-3">
                          {waMessages.length === 0 && (
                            <div className="text-center text-xs text-muted-foreground py-8">
                              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p>Nenhuma mensagem ainda</p>
                            </div>
                          )}
                          {waMessages.map((msg, idx) => {
                            const isOut = msg.direction === "outgoing";
                            const stratName = msg.strategy_name || detectStrategy(msg.content, msg.direction);
                            const stratInfo = WA_STRATEGIES.find(s => s.name === stratName);
                            const isLatest = idx === waMessages.length - 1;
                            return (
                              <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-xl px-3 py-2 shadow-sm ${isOut ? "bg-green-500 text-white" : "bg-white border border-gray-200"}`}>
                                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isOut ? "text-white" : "text-gray-800"}`}>{msg.content}</p>
                                  <div className="mt-1 flex items-center justify-end gap-1.5 flex-wrap">
                                    {stratInfo && (
                                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${isLatest ? "animate-pulse" : ""}`}
                                        style={{ backgroundColor: stratInfo.color + "25", color: isOut ? "#fff" : stratInfo.color, border: `1px solid ${stratInfo.color}50` }}>
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stratInfo.color }} />
                                        {stratInfo.label}
                                      </span>
                                    )}
                                    <span className={`text-[10px] ${isOut ? "text-green-100" : "text-gray-400"}`}>{formatWaTime(msg.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={waMessagesEndRef} />
                        </div>
                      </ScrollArea>
                      <div className="p-2.5 border-t border-border bg-muted/30 shrink-0">
                        <div className="flex gap-2">
                          <Input value={waInput} onChange={(e) => setWaInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendWaMessage(waInput); } }}
                            placeholder="Resposta para o cliente..." disabled={waSending} className="flex-1 text-sm" />
                          <Button size="sm" onClick={() => sendWaMessage(waInput)} disabled={waSending || !waInput.trim()} className="bg-green-600 hover:bg-green-700 text-white">
                            {waSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                    </>
                  );
                })() : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <div className="text-3xl mb-3">💬</div>
                      <p className="text-sm font-semibold">Selecione um contato</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </TabsContent>

      <TabsContent value="relatorios" className="flex-1 min-h-0 mt-2">
        <div className="h-full flex gap-3 overflow-hidden">
          <div className="w-[320px] shrink-0 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Relatórios do Juiz ({judgeReports.length})
              </h2>
              <Button size="sm" variant="ghost" onClick={loadJudgeReports} disabled={loadingReports}>
                <RefreshCw className={`w-3 h-3 ${loadingReports ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {loadingReports ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : judgeReports.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Nenhum relatório gerado ainda.
                  <p className="text-xs mt-2">Os relatórios são gerados automaticamente ao final de cada conversa no WhatsApp.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {judgeReports.map((report) => (
                    <button
                      key={report.jid}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors ${
                        selectedReport?.jid === report.jid ? "bg-accent" : ""
                      }`}
                    >
                      <div className="text-xs font-medium truncate">{report.titulo || "Sem título"}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{report.client_name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{report.area_juridica}</span>
                        {report.probabilidade && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            report.probabilidade.toLowerCase().includes("alta") ? "bg-green-100 text-green-700" :
                            report.probabilidade.toLowerCase().includes("média") ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {report.probabilidade}
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-1">
                        {new Date(report.created_at).toLocaleString("pt-BR")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
            {selectedReport ? (
              <>
                <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-sm font-semibold">{selectedReport.titulo}</h2>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedReport.client_name} · {selectedReport.area_juridica} ·{" "}
                      {new Date(selectedReport.data_analise).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => window.print()}>
                      <Printer className="w-3 h-3 mr-1" /> Imprimir
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => generateJudgeReportFor(selectedReport.jid, selectedReport.client_name)} disabled={generatingReport}>
                      <RefreshCw className={`w-3 h-3 mr-1 ${generatingReport ? "animate-spin" : ""}`} /> Regenerar
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="max-w-3xl mx-auto space-y-6">
                    {/* Relatório */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Relatório</h3>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{selectedReport.relatorio}</div>
                    </div>

                    {/* Fundamentação */}
                    {selectedReport.fundamentacao && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fundamentação Legal</h3>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{selectedReport.fundamentacao}</div>
                      </div>
                    )}

                    {/* Dispositivo */}
                    {selectedReport.dispositivo && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dispositivo</h3>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{selectedReport.dispositivo}</div>
                      </div>
                    )}

                    {/* Pontos Fortes */}
                    {selectedReport.pontos_fortes?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pontos Fortes</h3>
                        <ul className="space-y-1">
                          {selectedReport.pontos_fortes.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Pontos Fracos */}
                    {selectedReport.pontos_fracos?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pontos Fracos / Riscos</h3>
                        <ul className="space-y-1">
                          {selectedReport.pontos_fracos.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0 flex items-center justify-center text-[10px] font-bold">!</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Probabilidade */}
                    {selectedReport.probabilidade && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Probabilidade de Êxito</h3>
                        <div className={`text-sm font-semibold px-3 py-1.5 rounded-lg inline-block ${
                          selectedReport.probabilidade.toLowerCase().includes("alta") ? "bg-green-100 text-green-700" :
                          selectedReport.probabilidade.toLowerCase().includes("média") ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {selectedReport.probabilidade}
                        </div>
                      </div>
                    )}

                    {/* Recomendação */}
                    {selectedReport.recomendacao && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recomendação</h3>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{selectedReport.recomendacao}</div>
                      </div>
                    )}

                    {/* Conversa Completa */}
                    {selectedReport.full_conversation && (
                      <details className="border border-border rounded-lg">
                        <summary className="px-3 py-2 text-xs font-semibold text-muted-foreground cursor-pointer hover:bg-accent/50">
                          Conversa Completa
                        </summary>
                        <div className="p-3 text-xs leading-relaxed whitespace-pre-wrap font-mono border-t border-border max-h-96 overflow-y-auto">
                          {selectedReport.full_conversation}
                        </div>
                      </details>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Scale className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-muted-foreground">Selecione um relatório para visualizar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
}

class LegalTrainingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[LegalTraining] render error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Erro no Treinamento</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Ocorreu um erro ao renderizar o treinamento. Tente recarregar a página.
          </p>
          <Button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
            Recarregar Página
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LegalTrainingWrapper() {
  return (
    <LegalTrainingErrorBoundary>
      <LegalTraining />
    </LegalTrainingErrorBoundary>
  );
}
