import { useEffect, useState, useRef } from "react";
import { api } from "@/kenia/lib/api";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import {
  Send, Zap, FileCode, GitCompare, Eye, CheckCircle2,
  AlertCircle, Loader2, Copy, Download, ChevronDown, ChevronUp, X
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : "";

export default function AIBuilder() {
  const [conversation, setConversation] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [plan, setPlan] = useState(null);
  const [changedFiles, setChangedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [readOnlyMode] = useState(true); // Always read-only for now
  const [diffs, setDiffs] = useState({});
  const conversationEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  const addTask = (name, status = "pending") => {
    const taskId = Date.now() + Math.random();
    setTasks((prev) => [...prev, { id: taskId, name, status }]);
    return taskId;
  };

  const updateTask = (id, status) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
  };

  const streamAnalyze = async (prompt) => {
    return new Promise((resolve, reject) => {
      if (!API_BASE) {
        reject(new Error("Backend não configurado. Defina VITE_BACKEND_URL"));
        return;
      }

      try {
        // Close any existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const url = new URL(`${API_BASE}/ai-builder/events`, window.location.origin);
        url.searchParams.append("prompt", prompt);

        addLog("Conectando ao backend para análise...", "info");

        const eventSource = new EventSource(url.toString());
        eventSourceRef.current = eventSource;

        let accumulatedPlan = { steps: [] };
        let accumulatedFiles = [];
        const accumulatedDiffs = {};

        
        eventSource.addEventListener("result", (e) => {
          try {
            const data = JSON.parse(e.data);
            setPlan({
              overview: data?.overview || "Plano gerado com sucesso.",
              steps: Array.isArray(data?.next_steps) ? data.next_steps : [],
              next_steps: Array.isArray(data?.next_steps) ? data.next_steps : [],
            });
            setChangedFiles(Array.isArray(data?.files) ? data.files : []);
            setDiffs(data?.patches && !Array.isArray(data.patches) ? data.patches : {});
            addLog("Plano recebido com sucesso", "success");
            eventSource.close();
            eventSourceRef.current = null;
            resolve(data);
          } catch (err) {
            reject(err);
          }
        });

eventSource.addEventListener("progress", (e) => {
          try {
            const data = JSON.parse(e.data);
            addLog(data.message, data.type || "info");
          } catch {}
        });

        eventSource.addEventListener("task", (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.action === "start") {
              const taskId = addTask(data.name);
              data.taskId = taskId;
            } else if (data.action === "complete" && data.taskId) {
              updateTask(data.taskId, "completed");
            }
          } catch {}
        });

        eventSource.addEventListener("plan", (e) => {
          try {
            const data = JSON.parse(e.data);
            accumulatedPlan = { ...accumulatedPlan, ...data };
            setPlan({ ...accumulatedPlan });
          } catch {}
        });

        eventSource.addEventListener("file", (e) => {
          try {
            const data = JSON.parse(e.data);
            accumulatedFiles.push(data);
            setChangedFiles([...accumulatedFiles]);
            if (accumulatedFiles.length === 1) {
              setSelectedFile(data);
            }
          } catch {}
        });

        eventSource.addEventListener("diff", (e) => {
          try {
            const data = JSON.parse(e.data);
            accumulatedDiffs[data.fileId] = data.content;
            setDiffs({ ...accumulatedDiffs });
          } catch {}
        });

        eventSource.addEventListener("done", (e) => {
          try {
            eventSource.close();
            eventSourceRef.current = null;
            const data = JSON.parse(e.data);
            addLog("✓ Análise concluída com sucesso.", "success");
            resolve({ plan: accumulatedPlan, files: accumulatedFiles, diffs: accumulatedDiffs });
          } catch {
            resolve({ plan: accumulatedPlan, files: accumulatedFiles, diffs: accumulatedDiffs });
          }
        });

        eventSource.addEventListener("error", (e) => {
          eventSource.close();
          eventSourceRef.current = null;
          addLog(`Erro no stream: ${e.message || "Desconectado"}`, "error");
          reject(new Error(e.message || "Erro ao processar stream"));
        });

        eventSource.onerror = () => {
          eventSource.close();
          eventSourceRef.current = null;
          if (accumulatedFiles.length > 0 || accumulatedPlan.steps.length > 0) {
            // Resolve with whatever we have accumulated
            resolve({ plan: accumulatedPlan, files: accumulatedFiles, diffs: accumulatedDiffs });
          } else {
            reject(new Error("Conexão perdida com o backend"));
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleSendCommand = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setConversation((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    setLogs([]);
    setTasks([]);
    setPlan(null);
    setChangedFiles([]);
    setSelectedFile(null);
    setDiffs({});

    try {
      const result = await streamAnalyze(input);

      addLog("Gerando resposta da IA...", "info");

      // Generate AI response with plan summary
      const fileCount = result.files.length;
      const assistantMessage = {
        role: "assistant",
        content: `Analisei o projeto e preparei um plano para "${input}". 

**Plano de Implementação:**
${result.plan.steps && result.plan.steps.length > 0
  ? result.plan.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
  : "Plano em processo de geração..."}

**Análise do Projeto:**
${result.plan.analysis || "Análise em progresso..."}

**Arquivos a modificar:** ${fileCount} arquivo${fileCount !== 1 ? "s" : ""}
**Tempo estimado:** ${result.plan.estimatedTime || "15-20 minutos"}

Revise os arquivos no painel direito. Quando estiver pronto, clique em "Aplicar Mudanças" para prosseguir.`,
      };
      setConversation((prev) => [...prev, assistantMessage]);
    } catch (error) {
      addLog(`Erro: ${error.message}`, "error");
      const errorMessage = {
        role: "assistant",
        content: `Desculpe, ocorreu um erro ao processar seu comando: ${error.message}. 

Verifique se o backend está rodando e se VITE_BACKEND_URL está configurado corretamente.`,
      };
      setConversation((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyChanges = () => {
    if (readOnlyMode) {
      toast.info("Modo somente leitura ativado. Mudanças não podem ser aplicadas ainda.");
      return;
    }
    toast.success("Mudanças aplicadas com sucesso!");
  };

  const getDiffPreview = (file) => {
    if (!file) return "Selecione um arquivo para ver o diff";
    return diffs[file.id] || "Diff não disponível para este arquivo";
  };

  return (
    <div className="h-screen flex bg-background" data-testid="ai-builder-page">
      {/* Left Panel: Chat */}
      <div className="w-80 border-r border-nude-200 bg-card flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-nude-200 shrink-0">
          <div className="overline text-gold-600">AI Builder</div>
          <h2 className="font-serif text-lg text-nude-900 mt-1">Construtor de Projetos</h2>
        </div>

        {/* Conversation */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {conversation.length === 0 && (
              <div className="text-center py-8 text-nude-500">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Descreva o que você quer construir</p>
              </div>
            )}
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`space-y-1 ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <Badge
                  variant={msg.role === "user" ? "default" : "secondary"}
                  className={`text-xs ${
                    msg.role === "user"
                      ? "bg-gold-600 text-white"
                      : "bg-nude-100 text-nude-700"
                  }`}
                >
                  {msg.role === "user" ? "Você" : "IA"}
                </Badge>
                <p className="text-xs text-nude-700 px-2 py-1 rounded bg-nude-50 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            ))}
            <div ref={conversationEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="px-4 py-4 border-t border-nude-200 shrink-0 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Criar dashboard de WhatsApp..."
            className="min-h-16 resize-none text-xs"
            disabled={isProcessing}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                handleSendCommand();
              }
            }}
            data-testid="command-input"
          />
          <Button
            onClick={handleSendCommand}
            disabled={isProcessing || !input.trim()}
            className="w-full gap-2"
            size="sm"
            data-testid="send-command-btn"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Center Panel: Progress, Plan, Logs, Tasks */}
      <div className="flex-1 border-r border-nude-200 bg-background flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-nude-200 shrink-0">
          <div className="overline text-gold-600">Análise e Plano</div>
          <h2 className="font-serif text-xl text-nude-900 mt-1">Progresso da Construção</h2>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6 space-y-6">
          {/* Plan */}
          {plan && (
            <Card className="p-4 border-gold-200 bg-gold-50/30">
              <h3 className="font-semibold text-nude-900 text-sm mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-gold-600" />
                Plano de Implementação
              </h3>
              <div className="space-y-2">
                {plan.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-nude-700 flex gap-2 items-start"
                  >
                    <span className="text-gold-600 font-semibold">{idx + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gold-200 text-xs text-nude-600">
                <strong>Tempo estimado:</strong> {plan.estimatedTime}
              </div>
            </Card>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <Card className="p-4 border-nude-200">
              <h3 className="font-semibold text-nude-900 text-sm mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gold-600" />
                Tarefas ({tasks.filter(t => t.status === "completed").length}/{tasks.length})
              </h3>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="text-xs text-nude-700 flex gap-2 items-center"
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-gold-600 flex-shrink-0" />
                    ) : task.status === "in-progress" ? (
                      <Loader2 className="w-4 h-4 text-gold-600 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-nude-300 flex-shrink-0" />
                    )}
                    <span>{task.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <Card className="p-4 border-nude-200">
              <h3 className="font-semibold text-nude-900 text-sm mb-3 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-gold-600" />
                Logs
              </h3>
              <div className="space-y-1 max-h-40 overflow-auto">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`text-xs font-mono px-2 py-1 rounded ${
                      log.type === "success"
                        ? "bg-green-50 text-green-700"
                        : log.type === "error"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-nude-50 text-nude-600"
                    }`}
                  >
                    <span className="text-nude-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {conversation.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="w-10 h-10 text-gold-400 mb-4 opacity-40" />
              <p className="text-sm text-nude-700 font-medium">
                Digite um comando para começar
              </p>
              <p className="text-xs text-nude-500 mt-1">
                Ex: "Criar dashboard de WhatsApp"
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel: Files, Diffs, Preview */}
      <div className="w-96 border-l border-nude-200 bg-card flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-nude-200 shrink-0">
          <div className="overline text-gold-600">Arquivos Modificados</div>
          <h2 className="font-serif text-lg text-nude-900 mt-1">
            {changedFiles.length} arquivo{changedFiles.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {/* Files List & Diffs */}
        {changedFiles.length > 0 ? (
          <ScrollArea className="flex-1 flex flex-col">
            {/* Files */}
            <div className="p-4 space-y-2 border-b border-nude-200">
              {changedFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left text-xs px-3 py-2 rounded border transition-colors ${
                    selectedFile?.id === file.id
                      ? "bg-gold-50 border-gold-300 text-gold-900"
                      : "border-nude-200 text-nude-700 hover:bg-nude-50"
                  }`}
                  data-testid={`file-${file.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileCode className="w-3.5 h-3.5" />
                    <span className="font-mono flex-1 truncate">{file.path}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        file.status === "created"
                          ? "border-green-300 text-green-700 bg-green-50"
                          : "border-blue-300 text-blue-700 bg-blue-50"
                      }`}
                    >
                      {file.status === "created" ? "+" : "~"}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-nude-500">
                    {file.changes} linhas
                  </div>
                </button>
              ))}
            </div>

            {/* Diff Preview */}
            {selectedFile && (
              <div className="p-4 space-y-3 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <GitCompare className="w-4 h-4 text-gold-600" />
                  <h3 className="text-xs font-semibold text-nude-900">Diff</h3>
                </div>
                <div className="bg-nude-950 text-nude-100 rounded p-3 font-mono text-[10px] overflow-auto max-h-32 border border-nude-200">
                  <pre className="whitespace-pre-wrap break-words">
                    {getDiffPreview(selectedFile)}
                  </pre>
                </div>
              </div>
            )}
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-nude-500 p-4">
            <div>
              <GitCompare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhum arquivo modificado</p>
            </div>
          </div>
        )}

        {/* Footer: Preview & Actions */}
        <div className="px-4 py-4 border-t border-nude-200 shrink-0 space-y-2">
          <Button
            className="w-full gap-2 text-xs"
            variant="outline"
            disabled={readOnlyMode || changedFiles.length === 0}
            onClick={() => setPreviewUrl("preview")}
            data-testid="preview-btn"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </Button>
          <Button
            className="w-full gap-2 text-xs"
            disabled={readOnlyMode || changedFiles.length === 0}
            onClick={handleApplyChanges}
            data-testid="apply-changes-btn"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {readOnlyMode ? "Modo Somente Leitura" : "Aplicar Mudanças"}
          </Button>
        </div>
      </div>
    </div>
  );
}
