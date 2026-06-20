import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/kenia/lib/api";



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
  const contextRef = useRef(null);
  const contextAtRef = useRef(0);

  const norm = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

  const loadClientContext = async () => {
    if (contextRef.current && Date.now() - contextAtRef.current < 60_000) return contextRef.current;
    const safe = async (p) => { try { const { data } = await api.get(p); return data; } catch { return null; } };
    const [leads, contacts, processes, appointments, analyses] = await Promise.all([
      safe("/leads"), safe("/contacts"), safe("/processes"), safe("/appointments"), safe("/case-analyses"),
    ]);
    const pick = (d) => Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : []);
    const ctx = {
      leads: pick(leads), contacts: pick(contacts), processes: pick(processes),
      appointments: pick(appointments), analyses: pick(analyses),
    };
    contextRef.current = ctx;
    contextAtRef.current = Date.now();
    return ctx;
  };

  const findClient = (name, ctx) => {
    const n = norm(name);
    if (!n) return null;
    const pools = [...(ctx?.contacts || []), ...(ctx?.leads || [])];
    return pools.find((c) => norm(c.name || c.client_name).includes(n)) || null;
  };

  const askOllama = async (text) => {
    setThinking(true);
    setReply("");
    try {
      const ctx = await loadClientContext().catch(() => null);
      const ctxSummary = ctx ? [
        `Leads: ${JSON.stringify(ctx.leads.slice(0, 30).map((l) => ({ nome: l.name, tel: l.phone, area: l.case_type, etapa: l.stage, desc: l.description })))}`,
        `Contatos: ${JSON.stringify(ctx.contacts.slice(0, 30).map((c) => ({ nome: c.name, tel: c.phone, ultima: c.last_message })))}`,
        `Processos: ${JSON.stringify(ctx.processes.slice(0, 30).map((p) => ({ cliente: p.client_name, numero: p.process_number, area: p.case_type, vara: p.court, status: p.status, proxima_audiencia: p.next_hearing, descricao: p.description })))}`,
        `Agendamentos: ${JSON.stringify(ctx.appointments.slice(0, 30).map((a) => ({ titulo: a.title, cliente: a.client_name, quando: a.starts_at, local: a.location, status: a.status })))}`,
        `Análises: ${JSON.stringify(ctx.analyses.slice(0, 20).map((a) => ({ cliente: a.visitor_name, tel: a.visitor_phone, area: a.area, resumo: a.resumo })))}`,
      ].join("\n") : "";
      const enrichedSystem = `Você é Kênia, assistente da Dra. Kênia Garcia. Tem acesso aos dados internos do escritório abaixo e deve usá-los para responder com precisão. Pode informar telefones, processos, status e sugerir reagendar reuniões ou ligar para clientes. Não invente dados que não estejam na lista.\n\nDADOS:\n${ctxSummary}`;
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: {
          message: text,
          history: historyRef.current.slice(-8),
          session_id: "kenia-voice-orb",
          system_prompt: enrichedSystem,
          context: ctxSummary,
        },
      });
      if (error) throw error;
      const answer = String(data?.response || data?.reply || data?.message || data?.text || "").trim();
      if (!answer) throw new Error("Resposta vazia");
      historyRef.current.push({ role: "user", content: text });
      historyRef.current.push({ role: "assistant", content: answer });
      setReply(answer);
      speak(answer);
      const r = matchRoute(answer);
      if (r) navigate(r);
    } catch (e) {
      toast.error("Falha ao consultar Kênia (Ollama): " + (e?.message || e));
      speak("Não consegui processar agora.");
    } finally {
      setThinking(false);
    }
  };

  const callClient = async (name) => {
    setThinking(true);
    try {
      const ctx = await loadClientContext();
      const c = findClient(name, ctx);
      if (!c) {
        const msg = `Não encontrei o cliente ${name}.`;
        setReply(msg); speak(msg); return;
      }
      const phone = c.phone || c.client_phone || "";
      const msg = `Abrindo central de mensagens para ligar para ${c.name || c.client_name}${phone ? " (" + phone + ")" : ""}.`;
      setReply(msg); speak(msg);
      navigate(`/app/whatsapp-logs?call=${encodeURIComponent(phone)}&name=${encodeURIComponent(c.name || c.client_name || "")}`);
      setOpen(false);
    } catch (e) {
      toast.error("Não consegui ligar: " + (e?.message || e));
    } finally {
      setThinking(false);
    }
  };

  const rescheduleClient = async (name) => {
    setThinking(true);
    try {
      const ctx = await loadClientContext();
      const c = findClient(name, ctx);
      const target = c?.name || c?.client_name || name;
      const msg = `Abrindo a agenda para reagendar com ${target}.`;
      setReply(msg); speak(msg);
      navigate(`/app/agenda?reschedule=${encodeURIComponent(target)}`);
      setOpen(false);
    } finally {
      setThinking(false);
    }
  };


  const fmtDateTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch { return String(iso || ""); }
  };

  const isSameDay = (iso, ref) => {
    try {
      const d = new Date(iso);
      return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
    } catch { return false; }
  };

  const reportTodayAppointments = async () => {
    setThinking(true);
    setReply("");
    try {
      const { data } = await api.get("/appointments");
      const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.appointments) ? data.appointments : []));
      const today = new Date();
      const todays = list
        .filter((a) => isSameDay(a.starts_at || a.start_at || a.date || a.scheduled_at, today))
        .sort((a, b) => new Date(a.starts_at || a.start_at || a.date) - new Date(b.starts_at || b.start_at || b.date));
      if (!todays.length) {
        const msg = "Não há agendamentos para hoje.";
        setReply(msg); speak(msg); return;
      }
      const lines = todays.map((a, i) => {
        const when = fmtDateTime(a.starts_at || a.start_at || a.date || a.scheduled_at);
        const who = a.client_name || a.customer_name || a.lead_name || a.patient_name || a.contact_name || "Cliente";
        const phone = a.phone || a.client_phone || a.whatsapp || "";
        const assignee = a.assigned_to || a.attendant || a.therapist_name || a.responsible || "";
        const title = a.title || a.service || a.subject || a.area || "Atendimento";
        const status = a.status || "";
        const notes = a.notes || a.description || "";
        const link = a.meet_url || a.meeting_link || a.room_url || "";
        const parts = [
          `${i + 1}. ${when} — ${title}`,
          `   Cliente: ${who}${phone ? " (" + phone + ")" : ""}`,
          assignee ? `   Responsável: ${assignee}` : "",
          status ? `   Status: ${status}` : "",
          link ? `   Link: ${link}` : "",
          notes ? `   Obs.: ${notes}` : "",
        ].filter(Boolean);
        return parts.join("\n");
      });
      const header = `Você tem ${todays.length} agendamento${todays.length > 1 ? "s" : ""} hoje:`;
      const full = `${header}\n${lines.join("\n")}`;
      setReply(full);
      // Resumo curto na voz
      const spoken = `${header} ` + todays.map((a, i) => {
        const t = new Date(a.starts_at || a.start_at || a.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const who = a.client_name || a.customer_name || a.lead_name || a.patient_name || "cliente";
        const assignee = a.assigned_to || a.therapist_name || a.attendant || "";
        return `${i + 1}: às ${t} com ${who}${assignee ? ", responsável " + assignee : ""}.`;
      }).join(" ");
      speak(spoken);
    } catch (e) {
      toast.error("Não consegui buscar a agenda: " + (e?.message || e));
      speak("Não consegui buscar a agenda agora.");
    } finally {
      setThinking(false);
    }
  };

  const handleCommand = (text) => {
    if (!text?.trim()) return;
    const lower = text.toLowerCase();
    // Intenção: agendamentos do dia / de hoje
    if (/\bagendamento[s]?\b/.test(lower) && /\b(hoje|do dia|de hoje|para hoje)\b/.test(lower)) {
      reportTodayAppointments();
      return;
    }
    // Ligar para [nome]
    const callMatch = text.match(/\b(?:ligar|telefonar|chamar|ligue|telefone)\s+(?:para|pro|pra|o|a)?\s*(.+)/i);
    if (callMatch) { callClient(callMatch[1].trim()); return; }
    // Reagendar [nome]
    const reMatch = text.match(/\b(?:reagendar|remarcar|reagenda|remarca)\s+(?:com|para|o|a)?\s*(.+)/i);
    if (reMatch) { rescheduleClient(reMatch[1].trim()); return; }
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
