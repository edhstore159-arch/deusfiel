import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Badge } from "@/kenia/components/ui/badge";
import { Separator } from "@/kenia/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare, Image, Loader2, CheckCircle2, XCircle,
  Sparkles, Save, Info, Mic, RotateCcw, RefreshCcw, KeyRound,
  Zap, CreditCard,
} from "lucide-react";
import { loadKeniaPrompt, saveKeniaPrompt, DEFAULT_KENIA_PROMPT } from "@/kenia/lib/keniaPrompt";

const PROVIDER_STORAGE_KEY = "kenia:ai-provider";

export type AIProviderMode = "free" | "paid";

export function getAIProviderMode(): AIProviderMode {
  try { return (localStorage.getItem(PROVIDER_STORAGE_KEY) as AIProviderMode) || "free"; }
  catch { return "free"; }
}

export function setAIProviderMode(mode: AIProviderMode) {
  try { localStorage.setItem(PROVIDER_STORAGE_KEY, mode); } catch {}
}

type SecretMap = { lovable: boolean; openai: boolean; emergent: boolean; gemini: boolean };
type TestResult = { ok: boolean; error?: string; model?: string; reply?: string } | null;

const SECRET_LABELS: Array<{ key: keyof SecretMap; label: string; role: string }> = [
  { key: "lovable", label: "LAK", role: "Gateway universal (chat + imagens)" },
  { key: "openai", label: "OAK", role: "Fallback OpenAI direto" },
  { key: "emergent", label: "EAK", role: "Fallback Claude/GPT via Emergent" },
  { key: "gemini", label: "GAK", role: "Fallback Google Gemini" },
];

export default function Settings() {
  const [secrets, setSecrets] = useState<SecretMap | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [testingText, setTestingText] = useState(false);
  const [testingImage, setTestingImage] = useState(false);
  const [textResult, setTextResult] = useState<TestResult>(null);
  const [imageResult, setImageResult] = useState<TestResult>(null);
  const [keniaPrompt, setKeniaPrompt] = useState("");
  const [aiProvider, setAiProvider] = useState<AIProviderMode>(getAIProviderMode);
  const [testingProvider, setTestingProvider] = useState(false);
  const [providerResult, setProviderResult] = useState<TestResult>(null);
  const [emergentKey, setEmergentKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("settings-test", { body: { action: "status" } });
      if (error) throw error;
      setSecrets(data?.secrets || null);
    } catch (e: any) {
      toast.error("Falha ao consultar status das chaves: " + (e?.message || e));
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    setKeniaPrompt(loadKeniaPrompt());
    loadStatus();
  }, []);

  const switchProvider = async (mode: AIProviderMode) => {
    setAiProvider(mode);
    setAIProviderMode(mode);
    setTestingProvider(true);
    setProviderResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("settings-test", { body: { action: "test_provider", provider: mode } });
      if (error) throw error;
      setProviderResult(data);
      data?.ok
        ? toast.success(`Provider "${mode === "free" ? "Claude Free" : "Claude Pago"}" funcionando!`)
        : toast.error(`Provider "${mode === "free" ? "Claude Free" : "Claude Pago"}" falhou`);
    } catch (e: any) {
      setProviderResult({ ok: false, error: e?.message || String(e) });
      toast.error("Erro ao testar provider");
    } finally {
      setTestingProvider(false);
    }
  };

  const saveEmergentKey = async () => {
    if (!emergentKey.trim()) { toast.error("Digite uma chave válida"); return; }
    setSavingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke("settings-test", {
        body: { action: "save_emergent_key", key: emergentKey.trim() },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success("Chave Emergent salva! Provider Pago ativo.");
        setEmergentKey("");
        loadStatus();
      } else {
        toast.error(data?.error || "Erro ao salvar chave");
      }
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || e));
    } finally {
      setSavingKey(false);
    }
  };

  const runTest = async (kind: "text" | "image") => {
    if (kind === "text") { setTestingText(true); setTextResult(null); }
    else { setTestingImage(true); setImageResult(null); }
    try {
      const { data, error } = await supabase.functions.invoke("settings-test", { body: { action: kind } });
      if (error) throw error;
      if (data?.secrets) setSecrets(data.secrets);
      if (kind === "text") { setTextResult(data); data?.ok ? toast.success("Chat funcionando") : toast.error("Chat falhou"); }
      else { setImageResult(data); data?.ok ? toast.success("Geração de imagem funcionando") : toast.error("Imagem falhou"); }
    } catch (e: any) {
      const err = { ok: false, error: e?.message || String(e) };
      if (kind === "text") setTextResult(err); else setImageResult(err);
      toast.error("Erro no teste");
    } finally {
      if (kind === "text") setTestingText(false); else setTestingImage(false);
    }
  };

  const totalWorking = secrets ? Object.values(secrets).filter(Boolean).length : 0;

  return (
    <div className="h-screen flex flex-col bg-nude-50 overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-nude-200 flex items-center justify-between">
        <div>
          <div className="text-xs tracking-widest uppercase text-gold-600 font-semibold">Configurações</div>
          <h1 className="font-display font-bold text-2xl">Backend, Chaves & Persona</h1>
        </div>
        <Button variant="outline" onClick={loadStatus} disabled={loadingStatus}>
          {loadingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
          Recarregar status
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4 max-w-4xl">
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-nude-700">
              <div className="font-medium mb-1">Como funcionam as chaves neste projeto</div>
              <div className="text-xs">
                As chaves de IA vivem em <strong>Secrets do backend</strong> (Lovable Cloud) e são lidas
                automaticamente pelas edge functions — <strong>não precisam ser digitadas aqui</strong>.
                Use os botões de teste abaixo para validar que o gateway está respondendo.
              </div>
            </div>
          </div>
        </Card>

        {/* Toggle Free vs Paid */}
        <Card className="border-nude-200 p-5">
          <div className="flex items-start gap-3 mb-4">
            <Zap className="w-5 h-5 text-gold-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-display font-semibold text-lg">Provider de IA — Free vs Pago</div>
              <div className="text-xs text-nude-600 mt-1">
                Escolha entre <strong>Claude Free</strong> (Nemotron gratuito via ngrok) ou <strong>Claude Pago</strong> (Claude via Emergent). Quando no modo Pago, o Nemotron gera e o Claude revisa automaticamente.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Free */}
            <button
              onClick={() => switchProvider("free")}
              disabled={testingProvider}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                aiProvider === "free"
                  ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                  : "border-nude-200 bg-white hover:border-emerald-300"
              }`}
            >
              {aiProvider === "free" && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-lg font-bold text-emerald-600">N</span>
              </div>
              <div className="font-bold text-sm">Claude Free</div>
              <div className="text-[11px] text-nude-500 text-center">Nemotron (NVIDIA)<br/>Gratuito, sem revisão</div>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Sem custo</Badge>
            </button>

            {/* Paid */}
            <button
              onClick={() => switchProvider("paid")}
              disabled={testingProvider}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                aiProvider === "paid"
                  ? "border-violet-500 bg-violet-50 shadow-lg shadow-violet-100"
                  : "border-nude-200 bg-white hover:border-violet-300"
              }`}
            >
              {aiProvider === "paid" && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                <span className="text-lg font-bold text-violet-600">C</span>
              </div>
              <div className="font-bold text-sm">Claude Pago</div>
              <div className="text-[11px] text-nude-500 text-center">Claude via Emergent<br/>Nemotron + Claude revisa</div>
              <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-[10px]">Pipeline duplo</Badge>
            </button>
          </div>

          {testingProvider && (
            <div className="flex items-center gap-2 text-sm text-nude-500 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Testando provider...
            </div>
          )}

          {providerResult && (
            <div className={`mt-2 text-sm ${providerResult.ok ? "text-emerald-700" : "text-rose-700"}`}>
              <div className="flex items-center gap-2">
                {providerResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {providerResult.ok
                  ? <>Funcionando — modelo <code className="text-xs">{providerResult.model}</code></>
                  : <>Erro: {providerResult.error}</>}
              </div>
              {providerResult.ok && providerResult.reply && (
                <div className="mt-1 text-xs text-nude-600 bg-nude-50 border border-nude-200 rounded p-2 font-mono max-h-24 overflow-auto">
                  {providerResult.reply}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Chave Emergent */}
        <Card className="border-nude-200 p-5">
          <div className="flex items-start gap-3 mb-4">
            <KeyRound className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-display font-semibold text-lg">Chave Emergent (Claude Pago)</div>
              <div className="text-xs text-nude-600 mt-1">
                Adicione sua chave da Emergent API para ativar o <strong>Claude Pago</strong>. 
                O Nemotron gera e o Claude revisa automaticamente.
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              value={emergentKey}
              onChange={(e) => setEmergentKey(e.target.value)}
              placeholder="sk-emergent-..."
              className="flex-1 text-sm border border-nude-200 rounded-md px-3 py-2 bg-white text-nude-800 focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
            />
            <Button
              size="sm"
              onClick={saveEmergentKey}
              disabled={savingKey || !emergentKey.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
          </div>

          {secrets?.emergent && (
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              Chave configurada no backend
            </div>
          )}
        </Card>

        {/* Secrets do backend — gated by password */}
        <SecretsDebugCard secrets={secrets} loadingStatus={loadingStatus} totalWorking={totalWorking} />


        {/* Teste Chat */}
        <Card className="border-nude-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-gold-600" />
                <h3 className="font-display font-semibold text-base">Chat & Copiloto Jurídico</h3>
              </div>
              <p className="text-sm text-nude-500">
                Testa uma chamada real no gateway (<code className="text-xs bg-nude-100 px-1 rounded">google/gemini-2.5-flash-lite</code>).
              </p>
            </div>
            <Button variant="outline" onClick={() => runTest("text")} disabled={testingText}>
              {testingText ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Testar agora
            </Button>
          </div>
          {textResult && (
            <div className={`mt-2 text-sm ${textResult.ok ? "text-emerald-700" : "text-rose-700"}`}>
              <div className="flex items-center gap-2">
                {textResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {textResult.ok ? <>Funcionando — modelo <code className="text-xs">{textResult.model}</code></> : <>Erro: {textResult.error}</>}
              </div>
              {textResult.ok && textResult.reply && (
                <div className="mt-1 text-xs text-nude-600 bg-nude-50 border border-nude-200 rounded p-2 font-mono">
                  {textResult.reply}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Teste Imagem */}
        <Card className="border-nude-200 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Image className="w-4 h-4 text-purple-600" />
                <h3 className="font-display font-semibold text-base">Geração de Imagens (Criativos)</h3>
              </div>
              <p className="text-sm text-nude-500">
                Testa geração no gateway (<code className="text-xs bg-nude-100 px-1 rounded">google/gemini-2.5-flash-image</code>).
              </p>
            </div>
            <Button variant="outline" onClick={() => runTest("image")} disabled={testingImage}>
              {testingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Testar agora
            </Button>
          </div>
          {imageResult && (
            <div className={`mt-2 text-sm flex items-center gap-2 ${imageResult.ok ? "text-emerald-700" : "text-rose-700"}`}>
              {imageResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {imageResult.ok ? <>Funcionando — modelo <code className="text-xs">{imageResult.model}</code></> : <>Erro: {imageResult.error}</>}
            </div>
          )}
        </Card>

        <Separator />

        {/* Prompt da Kênia */}
        <Card className="p-5 border-gold-300">
          <div className="flex items-start gap-3 mb-3">
            <Mic className="w-5 h-5 text-gold-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-display font-semibold text-lg">Prompt da atendente virtual (Kênia)</div>
              <div className="text-xs text-nude-600">
                Persistido no navegador. Placeholders: <code>{"{dateContext}"}</code>, <code>{"{ctxSummary}"}</code>, <code>{"{jusContext}"}</code>.
              </div>
            </div>
          </div>
          <Textarea
            value={keniaPrompt}
            onChange={(e) => setKeniaPrompt(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => { saveKeniaPrompt(keniaPrompt); toast.success("Prompt salvo"); }}
              className="bg-nude-900 hover:bg-nude-800"
            >
              <Save className="w-4 h-4 mr-2" /> Salvar prompt
            </Button>
            <Button
              variant="outline"
              onClick={() => { setKeniaPrompt(DEFAULT_KENIA_PROMPT); saveKeniaPrompt(DEFAULT_KENIA_PROMPT); toast.success("Prompt restaurado"); }}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Restaurar padrão
            </Button>
          </div>
        </Card>

        {/* Persona WhatsApp */}
        <Card className="border-nude-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-gold-600" />
            <h3 className="font-display font-semibold text-base">Persona do robô WhatsApp</h3>
          </div>
          <p className="text-sm text-nude-500 mb-3">
            O atendente virtual se apresenta como <strong>Kênia Garcia</strong> e nunca revela ser IA. Para editar o prompt, acesse <a href="/app/whatsapp" className="text-gold-600 hover:underline">WhatsApp → Robô Atendente IA</a>.
          </p>
          <div className="text-xs space-y-1 text-nude-600">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-gold-600" /> Se apresenta como Kênia Garcia</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-gold-600" /> Nunca diz que é robô/IA</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-gold-600" /> Detecta estilo do cliente (visual/auditivo/cinestésico)</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-gold-600" /> Adapta linguagem automaticamente</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-gold-600" /> Classifica área + urgência + score de cada lead</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SecretsDebugCard({ secrets, loadingStatus, totalWorking }: { secrets: SecretMap | null; loadingStatus: boolean; totalWorking: number }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("secrets_debug_unlocked") === "1");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  const tryUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd === "DeusFiel") {
      sessionStorage.setItem("secrets_debug_unlocked", "1");
      setUnlocked(true);
      setErr("");
      setPwd("");
    } else {
      setErr("Senha incorreta.");
    }
  };

  if (!unlocked) {
    return (
      <Card className="border-nude-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-gold-600" />
          <h3 className="font-display font-semibold text-base">Debug de secrets (restrito)</h3>
        </div>
        <p className="text-xs text-nude-500 mb-3">Área restrita. Informe a senha para visualizar o status das chaves.</p>
        <form onSubmit={tryUnlock} className="flex items-center gap-2">
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Senha"
            className="flex-1 border border-nude-300 rounded px-3 py-2 text-sm"
            autoComplete="off"
          />
          <Button type="submit" size="sm">Acessar</Button>
        </form>
        {err && <div className="text-xs text-rose-600 mt-2">{err}</div>}
      </Card>
    );
  }

  return (
    <Card className="border-nude-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-gold-600" />
          <h3 className="font-display font-semibold text-base">Debug de secrets</h3>
        </div>
        <Badge className="bg-nude-900 text-white hover:bg-nude-900">
          {loadingStatus ? "…" : `${totalWorking}/${SECRET_LABELS.length} configuradas`}
        </Badge>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {SECRET_LABELS.map(({ key, label, role }) => {
          const ok = !!secrets?.[key];
          return (
            <div key={key} className={`flex items-center gap-3 rounded-md border px-3 py-2 ${ok ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"}`}>
              {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-nude-900 truncate">{label}</div>
                <div className="text-[11px] text-nude-500 truncate">{role}</div>
              </div>
              <Badge variant="outline" className={ok ? "border-emerald-300 text-emerald-700" : "border-rose-300 text-rose-700"}>
                {ok ? "Ativa" : "Ausente"}
              </Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

