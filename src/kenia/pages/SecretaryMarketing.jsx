import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import {
  Send, Loader2, Target, MessageSquare, Phone, Users,
  Handshake, PhoneCall, Clock, Star, TrendingUp, CheckCircle2,
  Sparkles, Save, X, Copy, FileDown
} from "lucide-react";
import { toast } from "sonner";
import { CHAT_DEFAULT_PROMPT, loadChatConfig, saveChatConfig } from "@/kenia/storage/chatSecretary";
import { jsPDF } from "jspdf";

const STORAGE_KEY = "secretary-marketing:state";

const STRATEGIES = [
  { id: "abordagem_inicial", name: "Abordagem Inicial", icon: Handshake, desc: "Primeira impressão e quebra de gelo", color: "text-blue-600" },
  { id: "identificacao_dor", name: "Identificação de Dor", icon: Target, desc: "Mapear a necessidade real do cliente", color: "text-red-600" },
  { id: "demonstracao_valor", name: "Demonstração de Valor", icon: Star, desc: "Mostrar diferenciais do escritório", color: "text-gold-600" },
  { id: "tratamento_objecao", name: "Tratamento de Objeções", icon: MessageSquare, desc: "Superar resistências comuns", color: "text-orange-600" },
  { id: "fechamento", name: "Fechamento", icon: CheckCircle2, desc: "Conversão do lead em cliente", color: "text-green-600" },
  { id: "follow_up", name: "Follow-up Estratégico", icon: Clock, desc: "Manter contato após primeira interação", color: "text-purple-600" },
  { id: "captura_whatsapp", name: "Captação via WhatsApp", icon: Phone, desc: "Estratégias específicas para WhatsApp", color: "text-emerald-600" },
  { id: "indicacao", name: "Captação por Indicação", icon: Users, desc: "Como pedir e receber indicações", color: "text-indigo-600" },
  { id: "escuta_ativa", name: "Escuta Ativa com Perguntas", icon: MessageSquare, desc: "Coletar dados com perguntas estratégicas", color: "text-cyan-600" },
  { id: "urgencia_etica", name: "Criação de Urgência", icon: Clock, desc: "Motivar ação imediata de forma ética", color: "text-amber-600" },
  { id: "gatilhos_psicologicos", name: "Gatilhos Psicológicos", icon: Target, desc: "Reciprocidade, prova social, escassez", color: "text-violet-600" },
  { id: "lead_divorcio", name: "Lead — Divórcio", icon: Users, desc: "Atendimento para casos de família", color: "text-rose-600" },
  { id: "lead_previdenciario", name: "Lead — Previdenciário", icon: Users, desc: "Atendimento para aposentadorias e INSS", color: "text-teal-600" },
  { id: "lead_bancario", name: "Lead — Direito Bancário", icon: Users, desc: "Atendimento para questões bancárias", color: "text-indigo-600" },
  { id: "lead_hesitante", name: "Lead Hesitante", icon: MessageSquare, desc: "Cliente indeciso que precisa de incentivo", color: "text-slate-600" },
  { id: "lead_urgencia", name: "Lead com Urgência", icon: CheckCircle2, desc: "Cliente em situação urgente", color: "text-red-600" },
  { id: "pos_duvida_juridica", name: "Após Dúvida Jurídica", icon: Star, desc: "Converter orientação em agendamento", color: "text-gold-600" },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [], stats: { total: 0, passed: 0, avgScore: 0 } };
    return JSON.parse(raw);
  } catch { return { sessions: [], stats: { total: 0, passed: 0, avgScore: 0 } }; }
}

function ScoreGauge({ score }) {
  const color = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";
  const bg = score >= 80 ? "bg-green-100" : score >= 60 ? "bg-yellow-100" : "bg-red-100";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative w-14 h-14 rounded-full ${bg} flex items-center justify-center`}>
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
          <path className="text-gray-200" stroke="currentColor" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path className={color} stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray={`${score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <span className={`absolute text-sm font-bold ${color}`}>{score}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">Acerto</span>
    </div>
  );
}

export default function SecretaryMarketing() {
  const saved = loadState();
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [improveModal, setImproveModal] = useState({ open: false, improved_prompt: "", changes: [], reasoning: "" });
  const [improving, setImproving] = useState(false);
  const [autoTraining, setAutoTraining] = useState(false);
  const [autoProgress, setAutoProgress] = useState({ current: 0, total: 17, strategy: "" });
  const [autoResults, setAutoResults] = useState(null);
  const [autoLoopTraining, setAutoLoopTraining] = useState(false);
  const [autoLoopProgress, setAutoLoopProgress] = useState({ iteration: 0, maxIterations: 5, score: 0, status: "Iniciando..." });
  const [autoLoopResults, setAutoLoopResults] = useState(null);
  const [stats, setStats] = useState(saved.stats || { total: 0, passed: 0, avgScore: 0 });
  const [sessions, setSessions] = useState(saved.sessions || []);
  const chatEndRef = useRef(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, stats })); }, [sessions, stats]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentSession]);

  const startStrategy = async (strategy) => {
    setSelectedStrategy(strategy);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("training-engine", {
        body: { action: "secretary_strategy", strategy_id: strategy.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const session = {
        id: Date.now().toString(),
        strategy_id: strategy.id,
        strategy_name: strategy.name,
        scenario: data.strategy,
        messages: [{ role: "assistant", content: `📋 **Cenário de Treinamento: ${strategy.name}**\n\n${data.strategy.scenario || data.strategy.script || "Cenário gerado pela IA."}\n\n📌 **Perfil do Cliente:** ${data.strategy.client_profile || "Não especificado"}\n\nAgora simule como a secretária atenderia esse cliente.` }],
        score: null,
        created_at: new Date().toISOString(),
      };
      setCurrentSession(session);
      toast.success("Cenário gerado! Simule o atendimento.");
    } catch (e) {
      toast.error("Erro: " + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const sendResponse = async () => {
    if (!input.trim() || sending || !currentSession) return;
    const userMsg = input.trim();
    setInput("");
    setSending(true);
    const updated = { ...currentSession, messages: [...currentSession.messages, { role: "user", content: userMsg }] };
    setCurrentSession(updated);

    try {
      const currentPrompt = loadChatConfig().prompt || CHAT_DEFAULT_PROMPT;
      const { data, error } = await supabase.functions.invoke("training-engine", {
        body: { action: "secretary_evaluate", scenario: currentSession.scenario?.scenario || "", user_response: userMsg, strategy_id: currentSession.strategy_id, current_prompt: currentPrompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const rpc = data.real_pattern_check || {};
      const rpcIcon = (val) => val === "na" ? "—" : val ? "✅" : "❌";
      const rpcLines = [
        rpc.identity_ok !== undefined ? `${rpcIcon(rpc.identity_ok)} Identidade mantida` : "",
        rpc.short_response !== undefined ? `${rpcIcon(rpc.short_response)} Resposta curta (WhatsApp)` : "",
        rpc.one_question !== undefined ? `${rpcIcon(rpc.one_question)} Uma pergunta por vez` : "",
        rpc.active_listening !== undefined ? `${rpcIcon(rpc.active_listening)} Escuta ativa` : "",
        rpc.scheduling_offered !== undefined ? `${rpcIcon(rpc.scheduling_offered)} Agendamento oferecido` : "",
        rpc.objection_handled !== undefined ? `${rpcIcon(rpc.objection_handled)} Objeção tratada${rpc.objection_handled === "na" ? " (sem objeção no cenário)" : ""}` : "",
        rpc.psychological_trigger !== undefined ? `${rpcIcon(rpc.psychological_trigger)} Gatilho psicológico` : "",
      ].filter(Boolean).join("\n");

      const finalSession = {
        ...updated,
        messages: [...updated.messages, { role: "assistant", content: `📊 **Avaliação — ${data.score}/100**\n\n${data.feedback || ""}\n\n✅ **Pontos fortes:**\n${(data.strengths || []).map((s) => "• " + s).join("\n") || "• Nenhum identificado"}\n\n⚠️ **Melhorar:**\n${(data.weaknesses || []).map((w) => "• " + w).join("\n") || "• Nenhum identificado"}\n\n📋 **Checklist Padrão Real:**\n${rpcLines || "• Sem verificação disponível"}\n\n💡 **Dicas:**\n${(data.tips || []).map((t) => "• " + t).join("\n") || ""}${data.improved_response ? `\n\n📝 **Resposta Padrão Real:**\n${data.improved_response}` : ""}` }],
        score: data.score,
      };
      setCurrentSession(finalSession);
      setSessions((prev) => [finalSession, ...prev].slice(0, 50));
      setStats((prev) => {
        const total = prev.total + 1;
        const passed = prev.passed + (data.score >= 60 ? 1 : 0);
        const avgScore = Math.round(((prev.avgScore * prev.total) + data.score) / total);
        return { total, passed, avgScore };
      });
    } catch (e) {
      toast.error("Erro: " + (e?.message || e));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendResponse(); } };

  const improvePrompt = async () => {
    if (!currentSession?.score) return toast.error("Faça uma avaliação primeiro");
    setImproving(true);
    try {
      const lastEval = currentSession.messages.find((m) => m.content?.includes("📊 **Avaliação"));
      const feedback = lastEval?.content || "";
      const weaknessesMatch = feedback.match(/⚠️ \*\*Melhorar:\*\*\n([\s\S]*?)(?=\n\n|$)/);
      const tipsMatch = feedback.match(/💡 \*\*Dicas:\*\*\n([\s\S]*?)(?=\n\n|$)/);
      const weaknesses = weaknessesMatch ? weaknessesMatch[1].split("\n").filter((l) => l.startsWith("• ")).map((l) => l.slice(2)) : [];
      const tips = tipsMatch ? tipsMatch[1].split("\n").filter((l) => l.startsWith("• ")).map((l) => l.slice(2)) : [];

      const currentPrompt = loadChatConfig().prompt || CHAT_DEFAULT_PROMPT;
      const { data, error } = await supabase.functions.invoke("training-engine", {
        body: {
          action: "improve_prompt",
          current_prompt: currentPrompt,
          evaluation_summary: feedback.slice(0, 2000),
          weaknesses,
          tips,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setImproveModal({ open: true, improved_prompt: data.improved_prompt || "", changes: data.changes || [], reasoning: data.reasoning || "" });
    } catch (e) {
      toast.error("Erro ao melhorar prompt: " + (e?.message || e));
    } finally {
      setImproving(false);
    }
  };

  const saveImprovedPrompt = () => {
    try {
      saveChatConfig({ prompt: improveModal.improved_prompt });
      toast.success("Prompt da secretária atualizado com sucesso!");
      setImproveModal({ open: false, improved_prompt: "", changes: [], reasoning: "" });
    } catch (e) {
      toast.error("Erro ao salvar: " + (e?.message || e));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(improveModal.improved_prompt);
    toast.success("Prompt copiado!");
  };

  const startAutoTraining = async () => {
    if (autoTraining) return;
    setAutoTraining(true);
    setAutoResults(null);
    setAutoProgress({ current: 0, total: 17, strategy: "Iniciando..." });
    try {
      const currentPrompt = loadChatConfig().prompt || CHAT_DEFAULT_PROMPT;
      // Simular progresso
      const strategyNames = [
        "Abordagem Inicial", "Identificação de Dor", "Demonstração de Valor",
        "Tratamento de Objeções", "Fechamento", "Follow-up Estratégico",
        "Captação via WhatsApp", "Captação por Indicação", "Escuta Ativa",
        "Criação de Urgência", "Gatilhos Psicológicos", "Lead — Divórcio",
        "Lead — Previdenciário", "Lead — Bancário", "Lead Hesitante",
        "Lead com Urgência", "Após Dúvida Jurídica"
      ];
      // Atualizar progresso a cada 3 segundos
      const progressInterval = setInterval(() => {
        setAutoProgress((prev) => {
          const next = Math.min(prev.current + 1, 16);
          return { ...prev, current: next, strategy: strategyNames[next] || "Finalizando..." };
        });
      }, 3000);

      const { data, error } = await supabase.functions.invoke("training-engine", {
        body: { action: "auto_train", current_prompt: currentPrompt },
      });
      clearInterval(progressInterval);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAutoResults(data);
      setAutoProgress({ current: 17, total: 17, strategy: "Concluído!" });
      toast.success(`Treinamento concluído! ${data.stats.passed}/${data.stats.total} aprovados`);
    } catch (e) {
      toast.error("Erro no treinamento: " + (e?.message || e));
    } finally {
      setAutoTraining(false);
    }
  };

  const startAutoLoopTraining = async () => {
    if (autoLoopTraining) return;
    setAutoLoopTraining(true);
    setAutoLoopResults(null);
    setAutoLoopProgress({ iteration: 0, maxIterations: 3, score: 0, status: "Iniciando loop de melhoria..." });
    try {
      const currentPrompt = loadChatConfig().prompt || CHAT_DEFAULT_PROMPT;
      const { data, error } = await supabase.functions.invoke("training-engine", {
        body: { action: "auto_train_loop", current_prompt: currentPrompt, target_improvement: 20, max_iterations: 3 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAutoLoopResults(data);
      const finalScore = data.final_score || 0;
      const totalImprovement = data.total_improvement || 0;
      if (data.final_prompt && data.final_prompt !== (loadChatConfig().prompt || CHAT_DEFAULT_PROMPT)) {
        saveChatConfig({ prompt: data.final_prompt });
      }
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

  const generateAutoLoopPDF = () => {
    if (!autoLoopResults) return;
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("Relatório Loop de Melhoria", pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Escritório: Dra. Kênia Garcia | ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, y, { align: "center" });
      y += 15;

      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`Score Inicial: ${autoLoopResults.baseline_score || 0}/100  →  Score Final: ${autoLoopResults.final_score || 0}/100`, pageWidth / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Melhoria: +${autoLoopResults.total_improvement || 0}% | Iterações: ${autoLoopResults.iterations?.length || 0}`, pageWidth / 2, y, { align: "center" });
      y += 12;

      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      (autoLoopResults.iterations || []).forEach((iter, i) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(`Iteração ${iter.iteration || i + 1}: Score ${iter.avgScore || 0}/100 | Melhoria +${iter.improvement || 0}% | Aprovados: ${iter.passed || 0}/${iter.total || 0}`, 20, y);
        y += 7;
        if (iter.weaknesses?.length) {
          doc.setFontSize(8);
          doc.setTextColor(120, 80, 80);
          doc.text(`Fraquezas: ${iter.weaknesses.slice(0, 3).join("; ")}`, 24, y);
          y += 5;
        }
        y += 3;
      });

      if (autoLoopResults.final_prompt) {
        if (y > 240) { doc.addPage(); y = 20; }
        y += 5;
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text("Prompt Final Melhorado:", 20, y);
        y += 7;
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        const promptLines = doc.splitTextToSize(autoLoopResults.final_prompt, pageWidth - 40);
        doc.text(promptLines.slice(0, 25), 20, y);
        if (promptLines.length > 25) doc.text("... (prompt completo salvo no sistema)", 20, y + promptLines.slice(0, 25).length * 4 + 4);
      }

      doc.save(`loop-melhoria-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF do loop gerado!");
    } catch (e) {
      toast.error("Erro ao gerar PDF: " + (e?.message || e));
    }
  };

  const generateAutoPDF = () => {
    if (!autoResults) return;
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("Relatório Treinamento Automático", pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Escritório: Dra. Kênia Garcia | ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, y, { align: "center" });
      y += 15;

      const { stats } = autoResults;
      doc.setFontSize(14);
      doc.text(`Média: ${stats.avgScore}/100 | Aprovados: ${stats.passed}/${stats.total} (${stats.passRate}%)`, pageWidth / 2, y, { align: "center" });
      y += 15;

      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      autoResults.results.forEach((r, i) => {
        if (y > 260) { doc.addPage(); y = 20; }
        const evaluation = r.evaluation || {};
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text(`${i + 1}. ${r.strategy_name} — ${evaluation.score || 0}/100`, 20, y);
        y += 6;
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const rpc = evaluation.real_pattern_check || {};
        const checks = [
          rpc.identity_ok ? "✓ Identidade" : "✗ Identidade",
          rpc.short_response ? "✓ Curta" : "✗ Curta",
          rpc.one_question ? "✓ 1 Pergunta" : "✗ 1 Pergunta",
          rpc.active_listening ? "✓ Escuta" : "✗ Escuta",
          rpc.scheduling_offered ? "✓ Agendamento" : "✗ Agendamento",
          rpc.psychological_trigger ? "✓ Gatilho" : "✗ Gatilho",
        ].join(" | ");
        doc.text(checks, 20, y);
        y += 8;
      });

      doc.save(`treinamento-automatico-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF gerado!");
    } catch (e) {
      toast.error("Erro ao gerar PDF: " + (e?.message || e));
    }
  };

  const generatePDF = () => {
    if (!currentSession?.score) return toast.error("Faça uma avaliação primeiro");
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("Relatório de Treinamento - Secretária Virtual", pageWidth / 2, y, { align: "center" });
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Escritório: Dra. Kênia Garcia | Data: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth / 2, y, { align: "center" });
      y += 15;

      // Score
      doc.setFontSize(24);
      doc.setTextColor(currentSession.score >= 80 ? 34 : currentSession.score >= 60 ? 180 : 220, currentSession.score >= 80 ? 139 : currentSession.score >= 60 ? 139 : 34, 34);
      doc.text(`${currentSession.score}/100`, pageWidth / 2, y, { align: "center" });
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Estratégia: ${currentSession.strategy_name || "Não definida"}`, pageWidth / 2, y, { align: "center" });
      y += 15;

      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      // Feedback
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Feedback", 20, y);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const feedbackLines = doc.splitTextToSize(currentSession.messages.find((m) => m.content?.includes("📊"))?.content || "Sem feedback", pageWidth - 40);
      doc.text(feedbackLines, 20, y);
      y += feedbackLines.length * 5 + 10;

      // Checklist
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Checklist Padrão Real", 20, y);
      y += 8;

      const rpc = currentSession.messages.find((m) => m.content?.includes("Checklist"))?.content || "";
      const checkItems = [
        { label: "Identidade mantida", key: "identity_ok" },
        { label: "Resposta curta", key: "short_response" },
        { label: "Uma pergunta por vez", key: "one_question" },
        { label: "Escuta ativa", key: "active_listening" },
        { label: "Agendamento oferecido", key: "scheduling_offered" },
        { label: "Objeção tratada", key: "objection_handled" },
        { label: "Gatilho psicológico", key: "psychological_trigger" },
      ];

      doc.setFontSize(9);
      checkItems.forEach((item) => {
        const icon = rpc.includes(item.label) ? (rpc.split(item.label)[0]?.includes("✅") ? "✓" : "✗") : "-";
        doc.setTextColor(icon === "✓" ? 34 : icon === "✗" ? 220 : 150, icon === "✓" ? 139 : 100, icon === "✓" ? 34 : 100);
        doc.text(`${icon} ${item.label}`, 20, y);
        y += 6;
      });
      y += 10;

      // Improved prompt
      if (improveModal.improved_prompt) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text("Prompt Melhorado", 20, y);
        y += 8;

        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        const promptLines = doc.splitTextToSize(improveModal.improved_prompt, pageWidth - 40);
        doc.text(promptLines.slice(0, 30), 20, y);
        if (promptLines.length > 30) {
          doc.text("... (prompt completo salvo no sistema)", 20, y + promptLines.slice(0, 30).length * 4 + 4);
        }
      }

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${totalPages} | Gerado automaticamente`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
      }

      doc.save(`treinamento-secretaria-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (e) {
      toast.error("Erro ao gerar PDF: " + (e?.message || e));
    }
  };

  const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  return (
    <div className="p-4 h-[calc(100dvh-4rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Treinamento Secretária — Captação de Clientes
          </h1>
          <p className="text-xs text-muted-foreground">Estratégias de marketing e atendimento para converter leads em clientes.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 shrink-0">
        <Card className="flex-1 px-3 py-2 flex items-center gap-2">
          <Target className="w-4 h-4 text-gold-600" />
          <div><div className="text-[10px] text-muted-foreground">Simulações</div><div className="text-sm font-bold">{stats.total}</div></div>
        </Card>
        <Card className="flex-1 px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <div><div className="text-[10px] text-muted-foreground">Aprovação</div><div className="text-sm font-bold">{passRate}%</div></div>
        </Card>
        <Card className="flex-1 px-3 py-2 flex items-center gap-2">
          <Star className="w-4 h-4 text-gold-600" />
          <div><div className="text-[10px] text-muted-foreground">Média</div><div className="text-sm font-bold">{stats.avgScore}/100</div></div>
        </Card>
      </div>

      {/* Treinamento Automático */}
      <Card className="shrink-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium">Treinamento Automático (17 estratégias)</span>
          </div>
          <div className="flex items-center gap-2">
            {autoResults && (
              <Button size="sm" variant="outline" onClick={generateAutoPDF}
                className="text-xs gap-1 border-blue-200 hover:bg-blue-50 text-blue-700">
                <FileDown className="w-3 h-3" /> PDF
              </Button>
            )}
            <Button size="sm" onClick={startAutoTraining} disabled={autoTraining}
              className="text-xs gap-1 bg-purple-600 hover:bg-purple-700">
              {autoTraining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {autoTraining ? `${autoProgress.current}/${autoProgress.total} — ${autoProgress.strategy}` : "Iniciar Treinamento"}
            </Button>
          </div>
        </div>
        {autoTraining && (
          <div className="px-3 pb-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(autoProgress.current / autoProgress.total) * 100}%` }} />
            </div>
          </div>
        )}
        {autoResults && !autoTraining && (
          <div className="px-3 pb-2 flex gap-4 text-xs">
            <span className="text-green-600">✓ {autoResults.stats.passed} aprovados</span>
            <span className="text-red-600">✗ {autoResults.stats.failed} reprovados</span>
            <span className="text-muted-foreground">Média: {autoResults.stats.avgScore}/100</span>
          </div>
        )}
      </Card>

      {/* Loop de Melhoria Automática */}
      <Card className="shrink-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium">Loop de Melhoria (treinar → melhorar → repetir até +20%)</span>
          </div>
          <div className="flex items-center gap-2">
            {autoLoopResults && (
              <Button size="sm" variant="outline" onClick={generateAutoLoopPDF}
                className="text-xs gap-1 border-blue-200 hover:bg-blue-50 text-blue-700">
                <FileDown className="w-3 h-3" /> PDF
              </Button>
            )}
            <Button size="sm" onClick={startAutoLoopTraining} disabled={autoLoopTraining || autoTraining}
              className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700">
              {autoLoopTraining ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
              {autoLoopTraining ? `Iteração ${autoLoopProgress.iteration}/${autoLoopProgress.maxIterations} — ${autoLoopProgress.status}` : "Iniciar Loop de Melhoria"}
            </Button>
          </div>
        </div>
        {autoLoopTraining && (
          <div className="px-3 pb-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(autoLoopProgress.iteration / autoLoopProgress.maxIterations) * 100}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Iteração {autoLoopProgress.iteration}/{autoLoopProgress.maxIterations} — {autoLoopProgress.status}
            </div>
          </div>
        )}
        {autoLoopResults && !autoLoopTraining && (
          <div className="px-3 pb-2 space-y-1">
            <div className="flex gap-4 text-xs">
              <span className="text-blue-600 font-medium">Inicial: {autoLoopResults.baseline_score}/100</span>
              <span className="text-emerald-600 font-medium">Final: {autoLoopResults.final_score}/100</span>
              <span className="text-purple-600 font-medium">Melhoria: +{autoLoopResults.total_improvement}%</span>
              {autoLoopResults.reached_target && <span className="text-green-600 font-medium">✓ Meta atingida</span>}
            </div>
            {(autoLoopResults.iterations || []).map((iter, i) => (
              <div key={i} className="text-[10px] text-muted-foreground">
                Iter {iter.iteration}: Score {iter.avgScore}/100 | +{iter.improvement}% | {iter.passed}/{iter.total} aprovados
                {iter.reachedTarget && " ✓"}
              </div>
            ))}
            {autoLoopResults.final_prompt && autoLoopResults.final_prompt !== autoLoopResults.initial_prompt && (
              <div className="mt-2">
                <p className="text-[10px] text-green-600 font-medium">✓ Prompt atualizado e salvo automaticamente</p>
                <pre className="text-[10px] bg-green-50 rounded p-2 whitespace-pre-wrap max-h-[15vh] overflow-auto border mt-1">{autoLoopResults.final_prompt}</pre>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="flex-1 min-h-0 hidden lg:grid lg:grid-cols-[320px_1fr] gap-3">
        {/* Strategies panel */}
        <Card className="flex flex-col">
          <div className="px-3 py-2 border-b flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-gold-600" />
            <span className="text-xs font-medium">Estratégias de Captação</span>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1.5">
              {STRATEGIES.map((s) => {
                const Icon = s.icon;
                const isActive = selectedStrategy?.id === s.id;
                return (
                  <button key={s.id} onClick={() => startStrategy(s)} disabled={sending}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${isActive ? "bg-gold-50 border border-gold-200" : "hover:bg-muted border border-transparent"}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${s.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{s.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat panel */}
        <Card className="flex flex-col">
          <div className="px-3 py-2 border-b flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gold-600" />
            <span className="text-xs font-medium">Simulação de Atendimento</span>
            {currentSession?.score != null && <Badge variant="secondary" className="ml-auto text-[10px]">{currentSession.score}/100</Badge>}
          </div>
          <ScrollArea className="flex-1 p-3">
            {!currentSession ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                <div className="text-center"><Phone className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>Selecione uma estratégia para começar.</p></div>
              </div>
            ) : (
              <div className="space-y-3">
                {currentSession.messages.map((m, i) => (
                  <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
                    <div className={`inline-block max-w-[90%] rounded-lg px-3 py-2 ${m.role === "user" ? "bg-gold-100 text-gold-900" : "bg-muted text-foreground"}`}>
                      <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">{m.content}</div>
                    </div>
                  </div>
                ))}
                {sending && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Avaliando atendimento...</div>}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>
          <div className="p-3 border-t flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={!currentSession ? "Selecione uma estratégia..." : "Simule a resposta da secretária..."}
              disabled={sending || !currentSession} />
            <Button size="sm" onClick={sendResponse} disabled={sending || !input.trim() || !currentSession}>
              <Send className="w-3 h-3" />
            </Button>
          </div>
          {currentSession?.score != null && (
            <div className="px-3 pb-3 space-y-2">
              <Button size="sm" variant="outline" onClick={improvePrompt} disabled={improving || !currentSession?.score}
                className="w-full text-xs gap-1.5 border-purple-200 hover:bg-purple-50 text-purple-700">
                {improving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Melhorar Prompt da Secretária
              </Button>
              <Button size="sm" variant="outline" onClick={generatePDF}
                className="w-full text-xs gap-1.5 border-blue-200 hover:bg-blue-50 text-blue-700">
                <FileDown className="w-3 h-3" />
                Gerar PDF do Treinamento
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Mobile */}
      <div className="flex-1 min-h-0 lg:hidden overflow-auto">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {STRATEGIES.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => startStrategy(s)} disabled={sending}
                className={`p-3 rounded-lg border text-left ${selectedStrategy?.id === s.id ? "border-gold-300 bg-gold-50" : "border-nude-200"}`}>
                <Icon className={`w-4 h-4 ${s.color} mb-1`} />
                <div className="text-[11px] font-medium">{s.name}</div>
              </button>
            );
          })}
        </div>
        {currentSession && (
          <Card className="flex flex-col" style={{ height: "calc(100% - 120px)" }}>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {currentSession.messages.map((m, i) => (
                  <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
                    <div className={`inline-block max-w-[90%] rounded-lg px-3 py-2 ${m.role === "user" ? "bg-gold-100 text-gold-900" : "bg-muted text-foreground"}`}>
                      <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">{m.content}</div>
                    </div>
                  </div>
                ))}
                {sending && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Avaliando...</div>}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <div className="p-3 border-t flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Sua resposta..." disabled={sending} />
              <Button size="sm" onClick={sendResponse} disabled={sending || !input.trim()}><Send className="w-3 h-3" /></Button>
            </div>
            {currentSession?.score != null && (
              <div className="px-3 pb-3 space-y-2">
                <Button size="sm" variant="outline" onClick={improvePrompt} disabled={improving || !currentSession?.score}
                  className="w-full text-xs gap-1.5 border-purple-200 hover:bg-purple-50 text-purple-700">
                  {improving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Melhorar Prompt
                </Button>
                <Button size="sm" variant="outline" onClick={generatePDF}
                  className="w-full text-xs gap-1.5 border-blue-200 hover:bg-blue-50 text-blue-700">
                  <FileDown className="w-3 h-3" />
                  Gerar PDF
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Modal Melhorar Prompt */}
      {improveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setImproveModal({ ...improveModal, open: false })}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-semibold">Prompt Melhorado da Secretária</h3>
              </div>
              <button onClick={() => setImproveModal({ ...improveModal, open: false })} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {improveModal.changes.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">Mudanças feitas:</h4>
                  <ul className="text-xs space-y-1">
                    {improveModal.changes.map((c, i) => <li key={i} className="flex items-start gap-1"><span className="text-purple-600">•</span> {c}</li>)}
                  </ul>
                </div>
              )}
              {improveModal.reasoning && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                  <strong>Raciocínio:</strong> {improveModal.reasoning}
                </div>
              )}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1">Prompt completo:</h4>
                <pre className="text-xs bg-gray-50 rounded p-3 whitespace-pre-wrap max-h-[40vh] overflow-auto border">{improveModal.improved_prompt}</pre>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1">
                <Copy className="w-3 h-3" /> Copiar
              </Button>
              <Button size="sm" onClick={saveImprovedPrompt} className="gap-1 bg-purple-600 hover:bg-purple-700">
                <Save className="w-3 h-3" /> Salvar e Atualizar Secretária
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
