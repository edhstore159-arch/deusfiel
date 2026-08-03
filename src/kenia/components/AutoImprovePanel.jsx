import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/kenia/components/ui/button";
import { Card } from "@/kenia/components/ui/card";
import { Badge } from "@/kenia/components/ui/badge";
import { Progress } from "@/kenia/components/ui/progress";
import { toast } from "sonner";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-improve`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SEVERITY_STYLE = {
  CRITICO: "bg-red-100 text-red-700 border-red-300",
  ALTO: "bg-orange-100 text-orange-700 border-orange-300",
  MEDIO: "bg-yellow-100 text-yellow-700 border-yellow-300",
  BAIXO: "bg-sky-100 text-sky-700 border-sky-300",
};

function Field({ label, children }) {
  if (!children) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{children}</p>
    </div>
  );
}

function makeCall(body, signal) {
  return fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON}`,
      apikey: ANON,
    },
    body: JSON.stringify(body),
    signal,
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      const msg = data?.error || data?.message || `Falha HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  });
}

export default function AutoImprovePanel({ area }) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [iterations, setIterations] = useState([]);
  const [currentScore, setCurrentScore] = useState(null);
  const stopRef = useRef(false);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const addLog = (msg, kind = "info") => {
    setLogs((l) => [...l, { t: new Date().toLocaleTimeString("pt-BR"), msg, kind }]);
  };

  const runStep = async (action, body) => {
    abortRef.current = new AbortController();
    const started = Date.now();
    addLog(`(${action}) iniciado...`);
    const data = await makeCall({ action, area, ...body }, abortRef.current.signal);
    addLog(`(${action}) concluído em ${Math.round((Date.now() - started) / 1000)}s`, "ok");
    return data;
  };

  const stop = () => {
    stopRef.current = true;
    abortRef.current?.abort();
    addLog("Interrupção solicitada...", "info");
  };

  const start = async () => {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    setIterations([]);
    setLogs([]);
    setCurrentScore(null);
    addLog(`Iniciando auto-melhoria do Juiz Virtual (área: ${area}). Aperte "Pare" a qualquer momento.`);

    let cycle = 0;
    try {
      while (!stopRef.current) {
        cycle += 1;
        addLog(`— Iteração ${cycle} —`, "info");

        const gen = await runStep("generate_case", {});
        const caseText = gen?.case;
        addLog("Caso simulado gerado.", "ok");

        let sentence = "";
        let sent = await runStep("generate_sentence", { case: caseText });
        sentence = sent?.sentence || "";
        if (!sent?.complete && sentence) {
          addLog("Sentença incompleta, completando...", "info");
          const cont = await runStep("continue_sentence", { case: caseText, partial: sentence });
          sentence = cont?.sentence || sentence;
        }
        if (!sentence) throw new Error("Sentença não foi gerada.");
        addLog("Sentença gerada.", "ok");

        const analysis = await runStep("analyze", { case: caseText, sentence });
        const score = Number(analysis?.score ?? 0);
        setCurrentScore(score);
        addLog(`Análise concluída — score ${score}.`, score >= 90 ? "ok" : "info");

        const iteration = {
          n: cycle,
          score,
          summary: analysis?.summary || "",
          errors: analysis?.errors || [],
          strengths: analysis?.strengths || [],
          suggestions: analysis?.suggestions || [],
          promptSaved: null,
          promptKept: null,
          changes: [],
          reason: "",
          critical: (analysis?.errors || []).filter((e) =>
            String(e?.severity || "").toUpperCase() === "CRITICO").length,
        };
        setIterations((prev) => [...prev, iteration]);

        if (score >= 90) {
          addLog(`Score ${score} atingiu a meta (>= 90). Prompt mantido.`, "ok");
          setIterations((prev) =>
            prev.map((it) => (it.n === cycle ? { ...it, promptKept: true } : it)));
          break;
        }

        if (stopRef.current) break;

        const impr = await runStep("improve", { case: caseText, sentence, analysis });
        const saved = !!impr?.saved;
        setIterations((prev) =>
          prev.map((it) =>
            it.n === cycle
              ? { ...it, promptSaved: saved, changes: impr?.changes || [], reason: impr?.reason || "" }
              : it));
        if (saved) {
          addLog(`Prompt melhorado salvo em agent_prompts (judge-${area}).`, "ok");
        } else {
          addLog(impr?.reason || "Prompt não salvo.", "info");
        }
      }
    } catch (err) {
      if (err?.name === "AbortError" || stopRef.current) {
        addLog("Parado pelo usuário.", "info");
      } else {
        addLog(`Erro: ${err.message}`, "err");
        toast.error(`Auto-melhoria falhou: ${err.message}`);
      }
    } finally {
      setRunning(false);
      setCurrentScore(null);
      addLog("Sessão encerrada.", "info");
    }
  };

  const bestScore = iterations.length
    ? Math.max(...iterations.map((i) => i.score))
    : null;

  return (
    <Card className="w-full p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Auto-melhoria do prompt</h3>
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <Button size="sm" variant="destructive" onClick={stop}>
              <Square className="h-4 w-4" /> Pare
            </Button>
          ) : (
            <Button size="sm" onClick={start} disabled={!area}>
              <Play className="h-4 w-4" /> Gerar sentenças e melhorar o prompt
            </Button>
          )}
          {iterations.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => { setLogs([]); setIterations([]); setCurrentScore(null); }}>
              <RefreshCw className="h-4 w-4" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {area && (
        <p className="mt-2 text-xs text-muted-foreground">
          Área: <Badge variant="secondary">{area}</Badge>
        </p>
      )}

      {currentScore !== null && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Score atual</span>
          <Progress value={Math.min(100, (currentScore / 90) * 100)} className="h-2" />
          <Badge variant={currentScore >= 90 ? "default" : "outline"}>{currentScore}/100</Badge>
        </div>
      )}

      {bestScore !== null && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          Evolução dos scores:
          {iterations.map((it) => (
            <Badge key={it.n} variant={it.score >= 90 ? "default" : "outline"}>
              {it.score}
            </Badge>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-muted/50 p-2 space-y-0.5">
          {logs.map((l, i) => (
            <p
              key={i}
              className={`font-mono text-[11px] leading-4 ${
                l.kind === "ok" ? "text-emerald-600" : l.kind === "err" ? "text-red-600" : "text-muted-foreground"
              }`}>
              <span className="text-muted-foreground/60">[{l.t}]</span> {l.msg}
            </p>
          ))}
        </div>
      )}

      {iterations.length > 0 && (
        <div className="mt-4 space-y-3">
          {[...iterations].reverse().map((it) => (
            <Card key={it.n} className="p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Iteração {it.n}</span>
                  <Badge variant={it.score >= 90 ? "default" : "outline"}>{it.score}/100</Badge>
                  {it.critical > 0 && (
                    <Badge variant="destructive">{it.critical} erro(s) crítico(s)</Badge>
                  )}
                </div>
                {it.promptSaved !== null && (
                  it.promptSaved ? (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Prompt salvo
                    </Badge>
                  ) : it.promptKept ? (
                    <Badge variant="secondary">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Prompt mantido
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <XCircle className="h-3 w-3 mr-1" /> Não salvo
                    </Badge>
                  )
                )}
              </div>

              <Field label="Resumo">{it.summary}</Field>

              {it.errors.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Erros encontrados
                  </p>
                  <ul className="space-y-1">
                    {it.errors.map((e, i) => {
                      const sev = String(e?.severity || "").toUpperCase();
                      return (
                        <li
                          key={i}
                          className="flex items-start gap-2 rounded-md border p-2 text-xs bg-card">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                          <div className="space-y-0.5 min-w-0">
                            {sev && (
                              <Badge className={SEVERITY_STYLE[sev] || "border-transparent bg-slate-100 text-slate-700"}>
                                {sev}
                              </Badge>
                            )}
                            <p className="text-foreground break-words">{e?.description || e?.error || JSON.stringify(e)}</p>
                            {e?.field && <p className="text-muted-foreground">Campo: {e.field}</p>}
                            {e?.suggestion && <p className="text-muted-foreground">Sugestão: {e.suggestion}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <Field label="Pontos fortes">{it.strengths?.join("; ")}</Field>
              <Field label="Sugestões de melhoria">{it.suggestions?.join("; ")}</Field>

              {it.changes?.length > 0 && (
                <Field label={`Mudanças no prompt (${it.changes.length})`}>
                  {it.changes.map((c, i) => (
                    <p key={i} className="text-sm">• {typeof c === "string" ? c : c?.description || JSON.stringify(c)}</p>
                  ))}
                </Field>
              )}
              <Field label="Motivo">{it.reason}</Field>
            </Card>
          ))}
        </div>
      )}

      {!running && iterations.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Gera um caso simulado, redige a sentença, analisa erros jurídicos e, se o score for abaixo de 90, salva uma
          versão melhorada do prompt em <code className="rounded bg-muted px-1">agent_prompts</code>. Repete até você
          apertar "Pare" ou o score atingir a meta.
        </p>
      )}
    </Card>
  );
}
