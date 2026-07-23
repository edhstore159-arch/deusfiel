import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/kenia/components/ui/tabs";
import {
  Send, Loader2, GraduationCap, Scale, MessageSquare,
  Trophy, Target, BookOpen, RefreshCw, ChevronDown, ChevronUp, Star,
  Sparkles, Lightbulb, CheckCircle2, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "legal-training:state";

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
  if (!corrected) return null;
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

export default function LegalTraining() {
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

  const [autoLoopTraining, setAutoLoopTraining] = useState(false);
  const [autoLoopResults, setAutoLoopResults] = useState(null);
  const [autoLoopProgress, setAutoLoopProgress] = useState(null);

  const [simulating, setSimulating] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [simulationMessage, setSimulationMessage] = useState("");
  const [simulationClientName, setSimulationClientName] = useState("Cliente Teste");
  const [currentPrompt, setCurrentPrompt] = useState("");

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
      const autoLoopPrompt = `Você é um profissional jurídico ${mode === "lawyer" ? "advogado" : "juiz"} experiente. Responda de forma clara, fundamentada e persuasiva, aplicando estratégias de atendimento ao cliente.`;

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
        consumeridor: "Comprei um produto defeituoso e a loja se recusa a trocar.",
        ambiental: "Estou sofrendo com poluição vizinha ao meu imóvel.",
      };
      const autoClientMsg = sampleMessages[area] || "Olá, preciso de orientação jurídica. " + (data.case_data?.description?.slice(0, 150) || "Tenho um caso para analisar.");
      setSimulating(true);
      try {
        const simRes = await supabase.functions.invoke("training-ai", {
          body: {
            action: "simulate_whatsapp",
            mode,
            area,
            client_message: autoClientMsg,
            client_name: "Cliente Automático",
            custom_prompt: autoLoopPrompt,
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

  const resetSession = () => {
    setCurrentSession(null);
    setShowConfig(true);
    setInput("");
    setCorrectedData(null);
    setImprovementData(null);

    setShowSuggestions(false);
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
        area: simulationData.area,
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
      const autoLoopPrompt = `Você é um profissional jurídico ${mode === "lawyer" ? "advogado" : "juiz"} experiente. Responda de forma clara, fundamentada e persuasiva, aplicando estratégias de atendimento ao cliente.`;
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
      setAutoLoopResults(data);
      const finalScore = data.final_score || 0;
      const totalImprovement = data.total_improvement || 0;
      setAutoLoopProgress({
        iteration: data.iterations?.length || 0,
        maxIterations: data.iterations?.length || 3,
        score: finalScore,
        status: data.reached_target ? `Meta atingida! +${totalImprovement}%` : `Melhoria total: +${totalImprovement}%`,
      });
      toast.success(`Loop concluído! Score final: ${finalScore}/100 (+${totalImprovement}%)`);
    } catch (e) {
      toast.error("Erro no loop: " + (e?.message || e));
    } finally {
      setAutoLoopTraining(false);
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
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GraduationCap className="w-5 h-5" /> Treinamento Jurídico
          </h1>
          <p className="text-xs text-muted-foreground">
            Simule casos, treine argumentação e avalie sua acertabilidade.
          </p>
        </div>
        {currentSession && (
          <Button size="sm" variant="outline" onClick={resetSession}>
            <RefreshCw className="w-3 h-3 mr-1" /> Novo Caso
          </Button>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 shrink-0">
        <Card className="flex-1 px-3 py-2">
          <div className="flex items-center gap-3">
            <Scale className="w-4 h-4 text-gold-600" />
            <div className="flex-1">
              <div className="text-[10px] text-muted-foreground uppercase">Advogados</div>
              <div className="text-sm font-bold">{lawyerRate}% acerto</div>
            </div>
            <div className="text-[10px] text-muted-foreground">{lawyerStats.total} casos</div>
          </div>
        </Card>
        <Card className="flex-1 px-3 py-2">
          <div className="flex items-center gap-3">
            <Star className="w-4 h-4 text-gold-600" />
            <div className="flex-1">
              <div className="text-[10px] text-muted-foreground uppercase">Juízes</div>
              <div className="text-sm font-bold">{judgeRate}% acerto</div>
            </div>
            <div className="text-[10px] text-muted-foreground">{judgeStats.total} casos</div>
          </div>
        </Card>
      </div>

      {/* Loop de Melhoria */}
      <Card className="shrink-0 px-3 py-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <div className="flex-1">
            <div className="text-[10px] font-medium">Loop de Melhoria (Treinar → Melhorar → Repetir até +20%)</div>
            {autoLoopProgress && (
              <div className="mt-1">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-purple-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${(autoLoopProgress.iteration / autoLoopProgress.maxIterations) * 100}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Iteração {autoLoopProgress.iteration}/{autoLoopProgress.maxIterations} — {autoLoopProgress.status}
                </div>
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={startAutoLoopTraining}
            disabled={autoLoopTraining}
            className="text-[10px] h-7"
          >
            {autoLoopTraining ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {autoLoopTraining ? "Treinando..." : "Iniciar Loop"}
          </Button>
        </div>

        {autoLoopResults && !autoLoopTraining && (
          <div className="mt-2 text-[10px]">
            <div className="flex gap-2">
              <span className="text-blue-600">Inicial: {autoLoopResults.baseline_score}</span>
              <span className="text-emerald-600">Final: {autoLoopResults.final_score}</span>
              <span className="text-purple-600">+{autoLoopResults.total_improvement}%</span>
            </div>
            {(autoLoopResults.iterations || []).map((iter, i) => (
              <div key={i} className="text-[10px] text-muted-foreground mt-1">
                Iter {iter.iteration}: Score {iter.avgScore}/100 | +{iter.improvement}% | {iter.passed}/{iter.total} aprovados
                {iter.reachedTarget && " ✓"}
              </div>
            ))}
            {autoLoopResults.final_prompt && autoLoopResults.final_prompt !== autoLoopResults.initial_prompt && (
              <div className="mt-2">
                <p className="text-[10px] text-green-600 font-medium">✓ Prompt melhorado com estratégias de secretaria</p>
                <pre className="text-[10px] bg-green-50 rounded p-2 whitespace-pre-wrap max-h-[15vh] overflow-auto border mt-1">{autoLoopResults.final_prompt}</pre>
              </div>
            )}
          </div>
        )}

        <div className="p-2 rounded bg-emerald-50 border border-emerald-200 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-medium text-emerald-800">Simulação WhatsApp</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">Teste como o {mode === "lawyer" ? "advogado" : "juiz"} responderia no WhatsApp</p>
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
            placeholder="Mensagem do cliente (ex: 'Fui demitido sem justa causa, o que fazer?')"
            className="w-full px-2 py-1 rounded border text-[10px] min-h-[50px] resize-none mb-2"
          />
          <Button size="sm" onClick={simulateWhatsApp} disabled={simulating || !simulationMessage.trim()} className="w-full text-[10px] h-7">
            {simulating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
            Simular {mode === "lawyer" ? "Advogado" : "Juiz"}
          </Button>
          {simulationData && (
            <div className="mt-2 space-y-2">
              <div className="p-2 rounded bg-blue-50 border border-blue-200">
                <div className="text-[10px] font-medium text-blue-800 mb-1">Caso Gerado</div>
                <div className="text-[10px] text-blue-700">{simulationData.case_data?.description || "Caso simulado"}</div>
              </div>
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-medium text-emerald-800 mb-1">Resposta</div>
                <div className="text-[10px] text-emerald-700 whitespace-pre-wrap">{simulationData.professional_response}</div>
              </div>
              <div className="p-2 rounded bg-purple-50 border border-purple-200">
                <div className="text-[10px] font-medium text-purple-800 mb-1">Avaliação</div>
                <div className="text-[10px] font-bold text-purple-700">Score: {simulationData.evaluation?.score || 0}/100</div>
                {simulationData.evaluation?.feedback && (
                  <div className="text-[10px] text-muted-foreground mt-1">{simulationData.evaluation.feedback}</div>
                )}
                {simulationData.evaluation?.strengths?.length > 0 && (
                  <div className="text-[10px] text-emerald-700 mt-1">
                    <strong>Pontos fortes:</strong> {simulationData.evaluation.strengths.join("; ")}
                  </div>
                )}
                {simulationData.evaluation?.weaknesses?.length > 0 && (
                  <div className="text-[10px] text-red-600 mt-1">
                    <strong>Pontos fracos:</strong> {simulationData.evaluation.weaknesses.join("; ")}
                  </div>
                )}
              </div>

              {simulationData.improved_prompt && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200">
                  <div className="text-[10px] font-medium text-amber-800 mb-1">✓ Prompt Melhorado Disponível</div>
                  <div className="text-[10px] text-amber-700 mb-2">Score baixo ({simulationData.evaluation?.score}/100) — prompt foi melhorado automaticamente</div>
                  <pre className="text-[10px] bg-amber-100 rounded p-2 whitespace-pre-wrap max-h-[15vh] overflow-auto border">{simulationData.improved_prompt}</pre>
                  <Button size="sm" onClick={applyImprovedPrompt} className="w-full text-[10px] h-7 mt-2 bg-amber-600 hover:bg-amber-700">
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
      </Card>

      <Card className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium">Simulação WhatsApp</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {mode === "lawyer" ? "Advogado" : "Juiz"} responde como se fosse WhatsApp real
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={simulationClientName}
            onChange={(e) => setSimulationClientName(e.target.value)}
            placeholder="Nome do cliente"
            className="flex-1 px-2 py-1.5 rounded border text-xs"
          />
        </div>

        <div className="flex gap-2">
          <textarea
            value={simulationMessage}
            onChange={(e) => setSimulationMessage(e.target.value)}
            placeholder="Mensagem do cliente (ex: 'Fui demitido sem justa causa, o que fazer?')"
            className="flex-1 px-2 py-1.5 rounded border text-xs min-h-[60px] resize-none"
          />
          <Button
            size="sm"
            onClick={simulateWhatsApp}
            disabled={simulating || !simulationMessage.trim()}
            className="self-end"
          >
            {simulating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </Button>
        </div>

        {simulationData && (
          <div className="space-y-2">
            <div className="p-2 rounded bg-blue-50 border border-blue-200">
              <div className="text-[10px] font-medium text-blue-800 mb-1">Caso Gerado</div>
              <div className="text-xs text-blue-700">{simulationData.case_data?.description || "Caso simulado"}</div>
              {simulationData.case_data?.parties && (
                <div className="text-[10px] text-blue-600 mt-1">Partes: {simulationData.case_data.parties}</div>
              )}
            </div>

            <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] font-medium text-emerald-800 mb-1">
                Resposta do {mode === "lawyer" ? "Advogado" : "Juiz"}
              </div>
              <div className="text-xs text-emerald-700 whitespace-pre-wrap">{simulationData.professional_response}</div>
            </div>

            <div className="p-2 rounded bg-purple-50 border border-purple-200">
              <div className="text-[10px] font-medium text-purple-800 mb-1">Avaliação</div>
              <div className="flex gap-4 text-xs mb-1">
                <span className="font-bold text-purple-700">Score: {simulationData.evaluation?.score || 0}/100</span>
              </div>
              {simulationData.evaluation?.strengths?.length > 0 && (
                <div className="text-[10px] text-emerald-700">
                  <strong>Pontos fortes:</strong> {simulationData.evaluation.strengths.join("; ")}
                </div>
              )}
              {simulationData.evaluation?.weaknesses?.length > 0 && (
                <div className="text-[10px] text-red-600">
                  <strong>Pontos fracos:</strong> {simulationData.evaluation.weaknesses.join("; ")}
                </div>
              )}
              {simulationData.evaluation?.feedback && (
                <div className="text-[10px] text-muted-foreground mt-1">{simulationData.evaluation.feedback}</div>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={applySimulationToTraining}
              className="w-full text-[10px]"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Aplicar ao Treinamento
            </Button>
          </div>
        )}
      </Card>
        {/* Desktop layout */}
        <div className="flex-1 min-h-0 hidden lg:flex gap-4">
        {/* Left: Config or History */}
        <Card className="flex flex-col">
          <div className="px-3 py-2 border-b flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gold-600" />
            <span className="text-xs font-medium">
              {showConfig ? "Configurar Treino" : "Detalhes do Caso"}
            </span>
          </div>
          <ScrollArea className="flex-1 p-3">
            {showConfig ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Modo de Treinamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode("lawyer")}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        mode === "lawyer"
                          ? "border-gold-300 bg-gold-50 text-gold-800"
                          : "border-nude-200 hover:border-gold-200"
                      }`}
                    >
                      <Scale className="w-5 h-5 mb-1" />
                      <div className="text-xs font-semibold">Advogado</div>
                      <div className="text-[10px] text-muted-foreground">Argumente a favor do cliente</div>
                    </button>
                    <button
                      onClick={() => setMode("judge")}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        mode === "judge"
                          ? "border-gold-300 bg-gold-50 text-gold-800"
                          : "border-nude-200 hover:border-gold-200"
                      }`}
                    >
                      <Star className="w-5 h-5 mb-1" />
                      <div className="text-xs font-semibold">Juiz</div>
                      <div className="text-[10px] text-muted-foreground">Analise e julgue o caso</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Área do Direito</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {LEGAL_AREAS.map((a) => (
                      <button
                        key={a.value}
                        onClick={() => { setArea(a.value); setSelectedCaseId(null); }}
                        className={`px-2 py-1.5 rounded text-[11px] text-left transition-colors ${
                          area === a.value
                            ? "bg-gold-100 text-gold-700 font-medium"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {a.icon} {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Dificuldade</label>
                  <div className="flex gap-2">
                    {DIFFICULTY_LEVELS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => { setDifficulty(d.value); setSelectedCaseId(null); }}
                        className={`flex-1 px-2 py-2 rounded text-[11px] text-center transition-colors ${
                          difficulty === d.value
                            ? "bg-gold-100 text-gold-700 font-medium"
                            : "text-muted-foreground hover:bg-muted border border-transparent hover:border-nude-200"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2 rounded bg-muted/50 border">
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
                    <span className="font-medium">Usar caso real de jurisprudência</span>
                  </label>
                  {useRealCase && (
                    <div className="mt-2">
                      {loadingCases ? (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Carregando casos...
                        </div>
                      ) : filteredCases.length > 0 ? (
                        <select
                          value={selectedCaseId || ""}
                          onChange={(e) => setSelectedCaseId(e.target.value || null)}
                          className="w-full text-[11px] p-1.5 rounded border bg-background"
                        >
                          <option value="">Selecione um caso...</option>
                          {filteredCases.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.real_reference || c.title} ({c.source})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-[10px] text-muted-foreground">
                          Nenhum caso real para esta área/dificuldade.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button onClick={startTraining} disabled={sending || (useRealCase && !selectedCaseId)} className="w-full">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                  {useRealCase && selectedCaseId ? "Carregar Caso Real" : "Gerar Caso para Treino"}
                </Button>

                {sessions.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Histórico Recente</label>
                    <div className="space-y-1.5">
                      {sessions.slice(0, 5).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setCurrentSession(s); setShowConfig(false); setCorrectedData(null); setImprovementData(null); }}
                          className="w-full text-left px-2 py-1.5 rounded text-[11px] hover:bg-muted flex items-center gap-2"
                        >
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: s.score >= 80 ? "#dcfce7" : s.score >= 60 ? "#fef9c3" : "#fee2e2" }}>
                            {s.score ?? "-"}
                          </span>
                          <span className="truncate">
                            {s.mode === "lawyer" ? "Advogado" : "Juiz"} — {LEGAL_AREAS.find((a) => a.value === s.area)?.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : currentSession ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-[10px] uppercase text-muted-foreground mb-1 font-medium">
                    {currentSession.mode === "lawyer" ? "📋 Caso para Advocacia" : "⚖️ Caso para Julgamento"}
                  </div>
                  <div className="text-xs font-semibold mb-1">{currentSession.case_data?.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {currentSession.case_data?.description}
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

                {currentSession.score != null && (
                  <div className="p-3 rounded-lg border border-gold-200 bg-gold-50/50">
                    <div className="flex items-center gap-3 mb-2">
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

                    {/* Action buttons */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={autoCorrect}
                        disabled={correcting}
                        className="flex-1 text-[10px] h-7"
                      >
                        {correcting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                        Corrigir Auto
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={improveArgument}
                        disabled={improving}
                        className="flex-1 text-[10px] h-7"
                      >
                        {improving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Lightbulb className="w-3 h-3 mr-1" />}
                        Melhorar
                      </Button>
                    </div>
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
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                <div className="text-center">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Configure e inicie um treino.</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Right: Chat */}
        <Card className="flex flex-col">
          <div className="px-3 py-2 border-b flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gold-600" />
            <span className="text-xs font-medium">
              {currentSession
                ? currentSession.mode === "lawyer"
                  ? "Sua Argumentação"
                  : "Sua Sentença"
                : "Chat de Treino"}
            </span>
            {currentSession?.score != null && (
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {currentSession.score}/100
              </Badge>
            )}
          </div>
          <ScrollArea className="flex-1 p-3">
            {!currentSession ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                <div className="text-center">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Gere um caso para começar.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {currentSession.messages.map((m, i) => {
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
                        <div className={`inline-block max-w-[90%] rounded-lg px-3 py-2 ${
                          m.role === "user" ? "bg-gold-100 text-gold-900" : "bg-muted text-foreground"
                        }`}>
                          <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">{m.content}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {currentSession.mode === "lawyer" ? "Analisando argumentação..." : "Avaliando sentença..."}
                  </div>
                )}
                {correcting && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    Corrigindo resposta automaticamente...
                  </div>
                )}
                {improving && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <Lightbulb className="w-3 h-3 text-yellow-500" />
                    Gerando sugestões de melhoria...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !currentSession
                    ? "Gere um caso primeiro..."
                    : currentSession.mode === "lawyer"
                      ? "Escreva sua argumentação jurídica..."
                      : "Escreva sua sentença/decisão..."
                }
                disabled={sending || !currentSession}
              />
              <Button size="sm" onClick={sendResponse} disabled={sending || !input.trim() || !currentSession}>
                <Send className="w-3 h-3" />
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
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMode("lawyer")} className={`p-3 rounded-lg border text-left ${mode === "lawyer" ? "border-gold-300 bg-gold-50" : "border-nude-200"}`}>
                    <Scale className="w-5 h-5 mb-1" /><div className="text-xs font-semibold">Advogado</div>
                  </button>
                  <button onClick={() => setMode("judge")} className={`p-3 rounded-lg border text-left ${mode === "judge" ? "border-gold-300 bg-gold-50" : "border-nude-200"}`}>
                    <Star className="w-5 h-5 mb-1" /><div className="text-xs font-semibold">Juiz</div>
                  </button>
                </div>
                <div className="flex gap-2">
                  {DIFFICULTY_LEVELS.map((d) => (
                    <button key={d.value} onClick={() => { setDifficulty(d.value); setSelectedCaseId(null); }} className={`flex-1 px-2 py-2 rounded text-[11px] text-center ${difficulty === d.value ? "bg-gold-100 text-gold-700 font-medium" : "text-muted-foreground border"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>

                <div className="p-2 rounded bg-muted/50 border">
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
                </div>

                <Button onClick={startTraining} disabled={sending || (useRealCase && !selectedCaseId)} className="w-full">
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
                  Gerar Caso
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
                          <div className="text-[10px] font-medium text-blue-800 mb-1">Resposta</div>
                          <div className="text-[10px] text-blue-700 whitespace-pre-wrap">{simulationData.professional_response}</div>
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
                      </div>
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
                <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Sua resposta..." disabled={sending || !currentSession} />
                <Button size="sm" onClick={sendResponse} disabled={sending || !input.trim() || !currentSession}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
