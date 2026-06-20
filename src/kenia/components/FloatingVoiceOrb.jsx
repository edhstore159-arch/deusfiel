import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


const LOGO = "https://customer-assets.emergentagent.com/job_nude-gold-dashboard/artifacts/ckw9kwam_IMG-20241228-WA0003.jpg";

// Comandos -> rotas (match por palavras-chave)
const ROUTES = [
  { keys: ["dashboard", "atendimento", "início", "inicio", "home"], to: "/app" },
  { keys: ["chat ia", "análise", "analise"], to: "/app/chat-ia" },
  { keys: ["admin", "casos"], to: "/app/admin" },
  { keys: ["secretária", "secretaria", "tarefas"], to: "/app/secretary-tasks" },
  { keys: ["agentes", "agente"], to: "/app/agents" },
  { keys: ["crm", "pipeline", "lead"], to: "/app/crm" },
  { keys: ["agenda", "consulta", "agendamento"], to: "/app/agenda" },
  { keys: ["processos", "processo"], to: "/app/processes" },
  { keys: ["financeiro", "finança", "financa"], to: "/app/finance" },
  { keys: ["criativos", "criativo"], to: "/app/creatives" },
  { keys: ["fusão", "fusao", "imagens"], to: "/app/image-fusion" },
  { keys: ["métricas", "metricas", "analytics"], to: "/app/analytics" },
  { keys: ["logs whatsapp", "logs", "mensagens", "central"], to: "/app/whatsapp-logs" },
  { keys: ["whatsapp", "zap"], to: "/app/whatsapp" },
  { keys: ["configurações", "configuracoes", "settings"], to: "/app/settings" },
  { keys: ["debug"], to: "/app/debug" },
];

function matchRoute(text) {
  const t = (text || "").toLowerCase();
  for (const r of ROUTES) {
    if (r.keys.some((k) => t.includes(k))) return r.to;
  }
  return null;
}

export default function FloatingVoiceOrb() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const supported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const txt = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setTranscript(txt);
      if (e.results[e.results.length - 1].isFinal) {
        handleCommand(txt);
      }
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error !== "no-speech") toast.error("Erro no microfone: " + e.error);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, [supported]);

  const speak = (text) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const [thinking, setThinking] = useState(false);
  const [reply, setReply] = useState("");
  const historyRef = useRef([]);

  const askOllama = async (text) => {
    setThinking(true);
    setReply("");
    try {
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: {
          message: text,
          history: historyRef.current.slice(-8),
          session_id: "kenia-voice-orb",
        },
      });
      if (error) throw error;
      const answer = String(data?.response || data?.reply || data?.message || data?.text || "").trim();
      if (!answer) throw new Error("Resposta vazia");
      historyRef.current.push({ role: "user", content: text });
      historyRef.current.push({ role: "assistant", content: answer });
      setReply(answer);
      speak(answer);
      // Se a resposta sugerir uma rota, navegue também
      const r = matchRoute(answer);
      if (r) navigate(r);
    } catch (e) {
      toast.error("Falha ao consultar Kênia (Ollama): " + (e?.message || e));
      speak("Não consegui processar agora.");
    } finally {
      setThinking(false);
    }
  };

  const handleCommand = (text) => {
    if (!text?.trim()) return;
    const route = matchRoute(text);
    // Comandos diretos de navegação ("abrir/ir/vai para X")
    if (route && /\b(abrir|abra|ir|vai|vá|leva|leve|navegar|abre)\b/i.test(text)) {
      navigate(route);
      const label = ROUTES.find((r) => r.to === route)?.keys[0] || "página";
      toast.success(`Abrindo ${label}`);
      speak(`Abrindo ${label}`);
      setOpen(false);
      return;
    }
    // Caso geral: pergunta ao assistente (Ollama via chat-ai)
    askOllama(text);
  };


  const toggleListen = () => {
    if (!supported) {
      toast.error("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      try { rec.stop(); } catch {}
      setListening(false);
    } else {
      setTranscript("");
      try {
        rec.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed left-5 bottom-5 z-50 w-16 h-16 rounded-full overflow-hidden shadow-xl ring-2 ring-gold-400 hover:scale-105 transition-transform bg-white"
        aria-label="Assistente de voz Kênia"
        data-testid="voice-orb"
      >
        <img src={LOGO} alt="Kênia" className="w-full h-full object-cover" />
        {listening && (
          <span className="absolute inset-0 rounded-full ring-4 ring-rose-500 animate-pulse pointer-events-none" />
        )}
      </button>

      {open && (
        <div
          className="fixed left-5 bottom-24 z-50 w-72 bg-white border border-nude-200 rounded-xl shadow-2xl p-4"
          data-testid="voice-orb-panel"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-serif text-base text-nude-900">Assistente Kênia</div>
            <button onClick={() => setOpen(false)} className="text-nude-500 hover:text-nude-900">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-nude-600 mb-3">
            Toque no microfone e diga, por exemplo: <em>“abrir agenda”</em>, <em>“ir para o CRM”</em>, <em>“central de mensagens”</em>.
          </p>
          <button
            onClick={toggleListen}
            disabled={thinking}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
              listening ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-gold-600 text-white hover:bg-gold-700"
            }`}
            data-testid="voice-orb-mic"
          >
            {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            {thinking ? "Pensando…" : listening ? "Ouvindo… toque para parar" : "Falar comando"}
          </button>
          {transcript && (
            <div className="mt-3 p-2 rounded bg-nude-50 text-xs text-nude-700 break-words">
              <span className="font-medium text-nude-900">Você:</span> {transcript}
            </div>
          )}
          {reply && (
            <div className="mt-2 p-2 rounded bg-gold-50 text-xs text-nude-800 break-words max-h-40 overflow-auto">
              <span className="font-medium text-gold-700">Kênia:</span> {reply}
            </div>
          )}

        </div>
      )}
    </>
  );
}
