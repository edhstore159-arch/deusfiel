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
  Copy, Printer, FileDown
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
      stats: parsed.stats || { lawyer: { total: 0, passed: 0 }, judge: { total: 0, passed: 0 } },
    };
  } catch {
    return { sessions: [], stats: { lawyer: { total: 0, passed: 0 }, judge: { total: 0, passed: 0 } } };
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
  }, [activeSection, loadWaConversations]);

  useEffect(() => {
    waMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [waMessages]);

  function loadWaMessages(convId) {
    setWaSelectedId(convId);
    const conv = waConversations.find((c) => c.id === convId);
    if (conv?._messages) {
      setWaMessages(conv._messages.map((m, i) => ({ ...m, id: `sb-${i}`, strategy_name: "abordagem_inicial" })));
      return;
    }
    if (waDataSource === "backend" && conv) {
      const jid = conv._jid || convId;
      fetch(`${API}/whatsapp/messages/${encodeURIComponent(jid)}`)
        .then((r) => r.json())
        .then((msgs) => {
          if (Array.isArray(msgs) && msgs.length) {
            setWaMessages(msgs.map((m) => ({
              id: m.id || `msg-${Math.random()}`,
              content: m.text || m.content || "",
              direction: m.from_me ? "outgoing" : "incoming",
              strategy_name: "abordagem_inicial",
              created_at: m.created_at || new Date().toISOString(),
            })));
          } else {
            setWaMessages([]);
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
      toast.success("Caso gerado! Iniciando treinamento automático...");

      // --- PIPELINE AUTOMÁTICO ---
      const previousLoopPrompt = loadEvolvedLegalPrompt(mode);
      const autoLoopPrompt = previousLoopPrompt && previousLoopPrompt.trim().length > 50
        ? previousLoopPrompt
        : `Você é um profissional jurídico ${mode === "lawyer" ? "advogado" : "juiz"} experiente. Responda de forma clara, fundamentada e persuasiva, aplicando estratégias de atendimento ao cliente.`;

      // 1) Loop de Melhoria automático
      setAutoLoopTraining(true);
      setAutoLoopProgress({ iteration: 0, maxIterations: 3, score: 0, status: "Rodando loop de melhoria..." });
      try {
        const loopRes = await supabase.functions.invoke("training-ai", {
          body: {
            action: "auto_train_loop",
            current_prompt: autoLoopPrompt,
            mode,
            area,
            target_improvement: 20,
            max_iterations: 3,
            areas: [area],
          },
        });
        if (!loopRes.error && loopRes.data) {
          // Salvar prompt evoluído para próxima sessão
          if (loopRes.data.final_prompt && loopRes.data.final_prompt !== autoLoopPrompt) {
            saveEvolvedLegalPrompt(mode, loopRes.data.final_prompt);
          }
          setAutoLoopResults(loopRes.data);
          const finalScore = loopRes.data.final_score || 0;
          const totalImprovement = loopRes.data.total_improvement || 0;
          setAutoLoopProgress({
            iteration: loopRes.data.iterations?.length || 0,
            maxIterations: loopRes.data.iterations?.length || 3,
            score: finalScore,
            status: loopRes.data.reached_target ? `Meta atingida! +${totalImprovement}%` : `Melhoria: +${totalImprovement}%`,
          });
        }
      } catch (loopErr) {
        console.error("Auto loop error:", loopErr);
      }
      setAutoLoopTraining(false);

      // 2) Simulação WhatsApp automática com mensagem derivada do caso
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
      // Usar o prompt melhorado pelo loop (ou o antigo se loop não melhorou)
      const improvedPromptForSim = loopRes?.data?.final_prompt && loopRes.data.final_prompt !== autoLoopPrompt
        ? loopRes.data.final_prompt
        : autoLoopPrompt;
      setSimulating(true);
      try {
        const simRes = await supabase.functions.invoke("training-ai", {
          body: {
            action: "simulate_whatsapp",
            mode,
            area,
            client_message: autoClientMsg,
            client_name: "Cliente Automático",
            custom_prompt: improvedPromptForSim,
          },
        });
        if (!simRes.error && simRes.data) {
          setSimulationData(simRes.data);
          setSimulationMessage(autoClientMsg);
          toast.success(`Pipeline completo! Simulação score: ${simRes.data.evaluation?.score || "?"}/100`);
        }
      } catch (simErr) {
        console.error("Auto simulation error:", simErr);
      }
      setSimulating(false);
      // --- FIM PIPELINE AUTOMÁTICO ---
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

  const applyImprovedPrompt = async () => {
    if (!simulationData?.improved_prompt) return;
    try {
      setCurrentPrompt(simulationData.improved_prompt);
      toast.success("Prompt melhorado aplicado!");
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
    setAutoLoopProgress({ iteration: 0, maxIterations: 3, score: 0, status: "Iniciando loop de melhoria..." });
    try {
      // Usar prompt evoluído anterior ou o genérico
      const previousPrompt = loadEvolvedLegalPrompt(mode);
      const autoLoopPrompt = previousPrompt && previousPrompt.trim().length > 50
        ? previousPrompt
        : `Você é um profissional jurídico ${mode === "lawyer" ? "advogado" : "juiz"} experiente. Responda de forma clara, fundamentada e persuasiva, aplicando estratégias de atendimento ao cliente.`;
      const { data, error } = await supabase.functions.invoke("training-ai", {
        body: {
          action: "auto_train_loop",
          current_prompt: autoLoopPrompt,
          mode,
          area,
          target_improvement: 20,
          max_iterations: 3,
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
      const currentPrompt = loadChatConfig().prompt || CHAT_DEFAULT_PROMPT;
      const results = [];
      for (let i = 0; i < allStrategies.length; i++) {
        const s = allStrategies[i];
        setSimProgress({ current: i + 1, total: allStrategies.length, strategy: s.name });
        try {
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
          results.push({
            strategy_id: s.id,
            strategy_name: s.name,
            score: evalData?.evaluation?.score || 0,
            feedback: evalData?.evaluation?.feedback || "",
            strengths: evalData?.evaluation?.strengths || [],
            weaknesses: evalData?.evaluation?.weaknesses || [],
          });
        } catch (e) {
          results.push({ strategy_id: s.id, strategy_name: s.name, score: 0, feedback: "Erro", strengths: [], weaknesses: [String(e?.message || e)] });
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
        <div className="flex-1 min-h-0 hidden lg:flex gap-3 w-full">
        {/* Left: Config or History */}
        <Card className="flex flex-col flex-1 min-w-0 shrink-0">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold-600" />
            <span className="text-sm font-bold">
              {showConfig ? "Configurar Treino" : "Análise de Argumentação"}
            </span>
          </div>
          <ScrollArea className="flex-1 p-4">
            {showConfig ? (
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-3 block">Modo de Treinamento</label>
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
                      <div className="text-sm font-bold">Advogado</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Argumente a favor</div>
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
                      <div className="text-sm font-bold">Juiz</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Analise e julgue</div>
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
                      <div className="text-sm font-bold">Secretaria</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Treino com estratégias</div>
                    </button>
                  </div>
                </div>

                {mode === "secretary" && (<>
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-3 block">Estratégia de Treinamento</label>
                    <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                      {SEC_STRATEGIES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setSecStrategy(s); setSecScenario(null); setSecEval(null); setSecImprovedPrompt(null); }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 transition-all ${
                            secStrategy?.id === s.id
                              ? "bg-purple-100 text-purple-800 font-semibold border-2 border-purple-300 shadow-sm"
                              : "hover:bg-muted border-2 border-transparent hover:border-border"
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{s.desc}</div>
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
                        className="w-full mt-3 h-11 text-sm font-semibold"
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
                      <span className="text-sm font-bold text-purple-800">Simulador Completo</span>
                    </div>
                    <p className="text-[10px] text-purple-600 mb-3">
                      Testa todas as 18 estratégias automaticamente, gera relatório por estratégia e melhora o prompt.
                    </p>
                    <Button
                      onClick={runSimulator}
                      disabled={simRunning}
                      className="w-full h-10 text-sm font-semibold bg-purple-600 hover:bg-purple-700"
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
                    <label className="text-sm font-semibold text-foreground mb-3 block">Área do Direito</label>
                    <div className="grid grid-cols-2 gap-2">
                      {LEGAL_AREAS.map((a) => (
                        <button
                          key={a.value}
                          onClick={() => { setArea(a.value); setSelectedCaseId(null); }}
                          className={`px-3 py-2.5 rounded-xl text-sm text-left transition-all ${
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
                  <label className="text-sm font-semibold text-foreground mb-3 block">Dificuldade</label>
                  <div className="flex gap-3">
                    {DIFFICULTY_LEVELS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => { setDifficulty(d.value); setSelectedCaseId(null); }}
                        className={`flex-1 px-3 py-3 rounded-xl text-sm text-center transition-all ${
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
                  <label className="flex items-center gap-3 text-sm cursor-pointer">
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
                          className="w-full text-sm p-2.5 rounded-lg border-2 bg-background border-border"
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

                <Button onClick={startTraining} disabled={sending || (useRealCase && !selectedCaseId) || (mode === "secretary" && !secStrategy)} className="w-full h-12 text-sm font-bold mt-2">
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
                    <label className="text-sm font-semibold text-foreground mb-3 block">Histórico Recente</label>
                    <div className="space-y-2">
                      {sessions.slice(0, 5).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setCurrentSession(s); setShowConfig(false); setCorrectedData(null); setImprovementData(null); }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-sm hover:bg-muted flex items-center gap-3 transition-all border-2 border-transparent hover:border-border"
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
                  <div className="text-sm font-semibold mb-1">{currentSession.case_data?.title}</div>
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
                        <div className="text-sm font-semibold text-gold-800">Avaliação</div>
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
                            <Button size="sm" onClick={() => { setCurrentPrompt(secImprovedPrompt.improved_prompt); toast.success("Prompt aplicado!"); setSecImprovedPrompt(null); }} className="w-full mt-1 text-[10px] h-6 bg-amber-600 hover:bg-amber-700">
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
                          <Button size="sm" onClick={() => { setCurrentPrompt(improvePromptData.improved_prompt); toast.success("Prompt aplicado!"); setShowImprovePrompt(false); }} className="flex-1 text-[10px] h-7 bg-amber-600 hover:bg-amber-700">
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
                  <p className="text-sm font-medium">Configure e inicie um treino.</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Right: Chat */}
        <Card className="flex flex-col flex-1 min-w-0">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold-600" />
            <span className="text-sm font-bold">
              {currentSession
                ? currentSession.mode === "lawyer"
                  ? "Sua Argumentação"
                  : currentSession.mode === "secretary"
                    ? "Simulação de Atendimento"
                    : "Sua Sentença"
                : "Chat de Treino"}
            </span>
            {currentSession?.score != null && (
              <Badge variant="secondary" className="ml-auto text-sm px-3 py-1">
                {currentSession.score}/100
              </Badge>
            )}
          </div>
          <ScrollArea className="flex-1 p-5">
            {!currentSession ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center py-12">
                  <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-1">Configure e inicie um treino</p>
                  <p className="text-sm text-muted-foreground">Escolha o modo à esquerda e clique em Gerar</p>
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
                          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-blue-900">
                            {m.content.replace("📋 **ARGUMENTAÇÃO DO ADVOGADO (Referência):**\n\n", "")}
                          </div>
                        </div>
                      ) : isScenario ? (
                        <div className="w-full p-5 rounded-xl border border-purple-200 bg-purple-50/80 text-left">
                          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-purple-900">
                            {m.content}
                          </div>
                        </div>
                      ) : (
                        <div className={`max-w-[80%] rounded-xl px-5 py-3 ${
                          m.role === "user" ? "bg-gold-100 text-gold-900" : "bg-muted text-foreground"
                        }`}>
                          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                    <Loader2 className="w-5 h-5 animate-spin text-gold-600" />
                    <span className="text-sm font-medium">{currentSession.mode === "lawyer" ? "Analisando argumentação..." : currentSession.mode === "secretary" ? "Simulando atendimento..." : "Avaliando sentença..."}</span>
                  </div>
                )}
                {correcting && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium">Corrigindo resposta automaticamente...</span>
                  </div>
                )}
                {improving && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium">Gerando sugestões de melhoria...</span>
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
                className="flex-1 h-11 text-sm"
              />
              <Button size="default" onClick={sendResponse} disabled={sending || !input.trim() || !currentSession} className="h-11 px-5">
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
                      Simular {mode === "lawyer" ? "Advogado" : "Juiz"}
                    </Button>
                    {simulationData && (
                      <div className="mt-2 space-y-2">
                        <div className="p-2 rounded bg-blue-50 border border-blue-200">
                          <div className="text-[10px] font-medium text-blue-800 mb-1">Resposta do {mode === "lawyer" ? "Advogado" : "Juiz"}</div>
                          <div className="text-[10px] text-blue-700 whitespace-pre-wrap">
                            {simulationData.strategy_tags && simulationData.strategy_tags.length > 0
                              ? simulationData.strategy_tags.map((tag, ti) => {
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
                              : <span>{simulationData.professional_response}</span>
                            }
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
                            <Button size="sm" onClick={() => { setCurrentPrompt(improvePromptData.improved_prompt); toast.success("Prompt aplicado!"); setShowImprovePrompt(false); }} className="flex-1 text-[10px] h-7 bg-amber-600 hover:bg-amber-700">
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

      <TabsContent value="conversas" className="flex-1 min-h-0 mt-2">
        <div className="h-full flex gap-3 overflow-hidden">
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

          {/* Col 2: Messages panel */}
          <div className="flex-1 flex flex-col border border-border rounded-xl bg-card overflow-hidden min-w-0">
            {waSelectedId ? (() => {
              const selectedConv = waConversations.find((c) => c.id === waSelectedId);
              if (!selectedConv) return null;
              return (
                <>
                  <div className="p-2.5 border-b border-border flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">{selectedConv.member_name || formatWaPhone(selectedConv.phone)}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedConv.phone}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: getWaStrategyColor(selectedConv.current_strategy) + "22", color: getWaStrategyColor(selectedConv.current_strategy), border: `1px solid ${getWaStrategyColor(selectedConv.current_strategy)}44` }}>
                      <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: getWaStrategyColor(selectedConv.current_strategy) }} />
                      {getWaStrategyLabel(selectedConv.current_strategy)}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {waMessages.map((msg, idx) => {
                      const color = getWaStrategyColor(msg.strategy_name);
                      const isOut = msg.direction === "outgoing";
                      const isSelected = waSelectedMsgIdx === idx;
                      return (
                        <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                          <div
                            onClick={() => { setWaSelectedMsgIdx(idx); setWaSelectedStrategy(msg.strategy_name); setWaCorrection(""); }}
                            className={`max-w-[80%] rounded-xl px-3 py-2 shadow-sm cursor-pointer transition-all ${isSelected ? "ring-2 ring-gold-400" : ""}`}
                            style={{ backgroundColor: color + "18", border: `1px solid ${color}33`, borderLeft: isOut ? undefined : `3px solid ${color}`, borderRight: isOut ? `3px solid ${color}` : undefined }}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="inline-block rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ backgroundColor: color, color: "#fff" }}>
                                {getWaStrategyLabel(msg.strategy_name)}
                              </span>
                              <span className="text-[9px] text-muted-foreground">{formatWaTime(msg.created_at)}</span>
                            </div>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <div className="mt-0.5">
                              <span className="text-[9px] text-muted-foreground">{isOut ? "↗ Enviado" : "↘ Recebido"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={waMessagesEndRef} />
                  </div>
                </>
              );
            })() : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="text-3xl mb-3">💬</div>
                  <p className="text-sm font-semibold">Selecione uma conversa</p>
                  <p className="text-[10px] mt-1 max-w-xs">Clique em uma mensagem para aplicar correções e treinar estratégias.</p>
                </div>
              </div>
            )}
          </div>

          {/* Col 3: Training / Correction panel */}
          <div className="w-[280px] shrink-0 flex flex-col border border-border rounded-xl bg-card overflow-hidden">
            <div className="p-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-gold-600" />
                <h2 className="text-[11px] font-semibold uppercase tracking-wider">Treinamento</h2>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">Selecione uma mensagem para corrigir</p>
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
