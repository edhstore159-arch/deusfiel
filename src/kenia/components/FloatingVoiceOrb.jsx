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

  const alwaysOnRef = useRef(false);
  const awakeUntilRef = useRef(0);
  const commandSessionActiveRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const recognitionActiveRef = useRef(false);
  const restartTimerRef = useRef(null);
  const handleCommandRef = useRef(null);
  const lastFinalRef = useRef({ text: "", at: 0 });
  const speakingRef = useRef(false);
  const speechResumeTimerRef = useRef(null);
  const [alwaysOn, setAlwaysOn] = useState(false);
  useEffect(() => { alwaysOnRef.current = alwaysOn; }, [alwaysOn]);

  const restartContinuousRecognition = (delay = 300) => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      if (!shouldRestartRef.current || !alwaysOnRef.current || recognitionActiveRef.current) return;
      if (speakingRef.current) {
        restartContinuousRecognition(500);
        return;
      }
      const rec = recognitionRef.current;
      if (!rec) return;
      try {
        rec.start();
      } catch (err) {
        if (err?.name === "InvalidStateError") {
          restartContinuousRecognition(500);
          return;
        }
        shouldRestartRef.current = false;
        alwaysOnRef.current = false;
        commandSessionActiveRef.current = false;
        setAlwaysOn(false);
        setListening(false);
        if (err?.name === "NotAllowedError") {
          toast.error("Permissão de microfone bloqueada. Ative novamente a escuta contínua.");
        }
      }
    }, delay);
  };

  const normalizeVoice = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const WAKE_RE = /(^|[\s,;:.\-!?])(ok\s+)?(secretaria|secetaria|kenia(?:\s+garcia)?|ola\s+kenia)(?=$|[\s,;:.\-!?])/i;
  const hasWakeWord = (t) => WAKE_RE.test(normalizeVoice(t));
  const stripWake = (t) => String(t || "")
    .replace(/(^|[\s,;:.\-!?])(?:ok\s+)?(?:secret[aá]ria|secretaria|secetaria|k[eê]nia(?:\s+garcia)?|kenia(?:\s+garcia)?|ol[aá]\s+k[eê]nia|ola\s+kenia)(?=$|[\s,;:.\-!?])/i, " ")
    .replace(/^[\s,;:.\-!?]+/, "")
    .trim();

  useEffect(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      recognitionActiveRef.current = true;
      setListening(true);
    };
    rec.onresult = (e) => {
      const txt = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setTranscript(txt);
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const result = e.results[i];
        if (!result?.isFinal) continue;
        const finalText = result[0]?.transcript?.trim();
        if (!finalText) continue;
        const now = Date.now();
        if (lastFinalRef.current.text === finalText && now - lastFinalRef.current.at < 1500) continue;
        lastFinalRef.current = { text: finalText, at: now };

        if (alwaysOnRef.current) {
          const woke = hasWakeWord(finalText);
          const commandText = woke ? stripWake(finalText) : finalText;
          if (woke) {
            window.speechSynthesis?.cancel?.();
            activateCommandSession();
            if (!commandText || isWakeOnlyPrompt(commandText)) {
              const msg = "Pois não? Pode falar.";
              setReply(msg);
              speak(msg);
              continue;
            }
          } else if (!commandSessionActiveRef.current) {
            continue;
          }

          handleCommandRef.current?.(commandText);
        } else {
          handleCommandRef.current?.(finalText);
          shouldRestartRef.current = false;
          try { rec.stop(); } catch {}
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        shouldRestartRef.current = false;
        alwaysOnRef.current = false;
        commandSessionActiveRef.current = false;
        recognitionActiveRef.current = false;
        setListening(false); setAlwaysOn(false);
        toast.error("Permissão de microfone negada.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        // keep going for transient errors
      }
    };
    rec.onend = () => {
      recognitionActiveRef.current = false;
      setListening(false);
      if (!shouldRestartRef.current || !alwaysOnRef.current) return;
      restartContinuousRecognition(speakingRef.current ? 700 : 300);
    };
    recognitionRef.current = rec;
    return () => {
      shouldRestartRef.current = false;
      commandSessionActiveRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (speechResumeTimerRef.current) clearTimeout(speechResumeTimerRef.current);
      recognitionRef.current = null;
      rec.onend = null;
      try { rec.abort?.(); } catch {}
      try { rec.stop(); } catch {}
    };
  }, [supported]);

  const toggleAlwaysOn = () => {
    unlockSpeech();
    if (!supported) { toast.error("Reconhecimento de voz não suportado."); return; }
    const rec = recognitionRef.current; if (!rec) return;
    if (alwaysOnRef.current) {
      shouldRestartRef.current = false;
      alwaysOnRef.current = false;
      commandSessionActiveRef.current = false;
      setAlwaysOn(false);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try { rec.abort?.(); } catch {}
      setListening(false);
      toast.message("Escuta contínua desativada.");
    } else {
      setAlwaysOn(true); alwaysOnRef.current = true; shouldRestartRef.current = true;
      commandSessionActiveRef.current = false;
      awakeUntilRef.current = 0;
      setTranscript("");
      try {
        if (!recognitionActiveRef.current) rec.start();
        toast.success('Diga "secretária" para ativar.');
        speak("Estou de prontidão. Diga secretária para falar comigo.");
      } catch (err) {
        if (err?.name === "InvalidStateError") {
          restartContinuousRecognition(500);
          toast.success('Diga "secretária" para ativar.');
          return;
        }
        shouldRestartRef.current = false;
        alwaysOnRef.current = false;
        commandSessionActiveRef.current = false;
        setAlwaysOn(false);
        setListening(false);
        toast.error("Não consegui ativar o microfone. Verifique a permissão do navegador.");
      }
    }
  };


  const speechUnlockedRef = useRef(false);
  const voicesRef = useRef([]);

  const loadVoices = () => {
    try {
      const list = window.speechSynthesis?.getVoices?.() || [];
      if (list.length) voicesRef.current = list;
    } catch {}
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { try { window.speechSynthesis.onvoiceschanged = null; } catch {} };
  }, []);

  // Deve ser chamado DE DENTRO de um gesto do usuário (click/touch).
  // Em iOS/Android o speechSynthesis fica bloqueado até esse "unlock".
  const unlockSpeech = () => {
    if (speechUnlockedRef.current) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const warm = new SpeechSynthesisUtterance(" ");
      warm.volume = 0; // silencioso, só para destravar o motor
      warm.lang = "pt-BR";
      synth.cancel();
      synth.resume?.();
      synth.speak(warm);
      speechUnlockedRef.current = true;
      loadVoices();
    } catch {}
  };

  const pickPtVoice = () => {
    const list = voicesRef.current || [];
    return (
      list.find((v) => /pt[-_]BR/i.test(v.lang)) ||
      list.find((v) => /^pt/i.test(v.lang)) ||
      null
    );
  };

  const speak = (text) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth || !text) return;
      const shouldResume = alwaysOnRef.current && shouldRestartRef.current;
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = "pt-BR";
      u.rate = 1;
      u.pitch = 1;
      u.volume = 1;
      const v = pickPtVoice();
      if (v) u.voice = v;
      u.onstart = () => {
        if (!shouldResume) return;
        speakingRef.current = true;
        try { recognitionRef.current?.abort?.(); } catch {}
      };
      const resume = () => {
        speakingRef.current = false;
        if (speechResumeTimerRef.current) clearTimeout(speechResumeTimerRef.current);
        if (shouldResume && alwaysOnRef.current && shouldRestartRef.current) {
          restartContinuousRecognition(250);
        }
      };
      u.onend = resume;
      u.onerror = resume;
      synth.cancel();
      // iOS Safari às vezes entra em "paused" — força resume antes de falar.
      try { synth.resume?.(); } catch {}
      if (speechResumeTimerRef.current) clearTimeout(speechResumeTimerRef.current);
      const fallbackMs = Math.min(15000, Math.max(2000, String(text || "").length * 80));
      speechResumeTimerRef.current = window.setTimeout(resume, fallbackMs);
      synth.speak(u);
    } catch {}
  };

  const [thinking, setThinking] = useState(false);
  const [reply, setReply] = useState("");
  const historyRef = useRef([]);
  const contextRef = useRef(null);
  const contextAtRef = useRef(0);

  const norm = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const isWakeOnlyPrompt = (text) => /^(?:fala|fale|conversa|converse|atenda|atende|escuta|escute|ouve|ouca)(?:\s+(?:comigo|me|aqui))?$/i.test(norm(text).trim());

  const userMinimizedRef = useRef(false);
  const activateCommandSession = () => {
    commandSessionActiveRef.current = true;
    awakeUntilRef.current = 0;
    // Se o usuário minimizou de propósito, mantemos minimizado — a escuta segue ativa em background.
    if (!userMinimizedRef.current) setOpen(true);
  };

  const loadClientContext = async () => {
    if (contextRef.current && Date.now() - contextAtRef.current < 60_000) return contextRef.current;
    const safe = async (p) => { try { const { data } = await api.get(p); return data; } catch { return null; } };
    const [leads, contacts, processes, appointments, analyses, logs, deadlines] = await Promise.all([
      safe("/leads"), safe("/whatsapp/contacts"), safe("/processes"), safe("/appointments"), safe("/case-analyses"), safe("/whatsapp/logs"), safe("/legal-deadlines"),
    ]);
    const pick = (d) => Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : []);
    const ctx = {
      leads: pick(leads), contacts: pick(contacts), processes: pick(processes),
      appointments: pick(appointments), analyses: pick(analyses), logs: pick(logs), deadlines: pick(deadlines),
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
        `RESUMO: ${ctx.contacts.length} contatos na central de mensagens, ${ctx.leads.length} leads no CRM, ${ctx.processes.length} processos, ${ctx.appointments.length} agendamentos, ${ctx.logs.length} mensagens registradas, ${ctx.deadlines.length} prazos.`,
        `Leads: ${JSON.stringify(ctx.leads.slice(0, 30).map((l) => ({ nome: l.name, tel: l.phone, area: l.case_type, etapa: l.stage, desc: l.description })))}`,
        `Contatos (central de mensagens): ${JSON.stringify(ctx.contacts.slice(0, 50).map((c) => ({ nome: c.name, tel: c.phone, nao_lidas: c.unread, ultima: c.last_message })))}`,
        `Processos: ${JSON.stringify(ctx.processes.slice(0, 30).map((p) => ({ cliente: p.client_name, numero: p.process_number, area: p.case_type, vara: p.court, status: p.status, proxima_audiencia: p.next_hearing })))}`,
        `Agendamentos: ${JSON.stringify(ctx.appointments.slice(0, 30).map((a) => ({ titulo: a.title, cliente: a.client_name, quando: a.starts_at, local: a.location, status: a.status })))}`,
        `Prazos: ${JSON.stringify(ctx.deadlines.slice(0, 20).map((d) => ({ cliente: d.client_name, titulo: d.title, vencimento: d.due_at, urgencia: d.urgency })))}`,
        `Mensagens recentes: ${JSON.stringify(ctx.logs.slice(-20).map((l) => ({ contato: l.contact_name, tel: l.contact_phone, texto: l.text, eu: l.from_me })))}`,
        `Análises de caso: ${JSON.stringify(ctx.analyses.slice(0, 20).map((a) => ({ cliente: a.visitor_name, tel: a.visitor_phone, area: a.area, resumo: a.resumo })))}`,
      ].join("\n") : "";

      // Busca no Jusbrasil quando a pergunta é jurídica
      const legalRe = /\b(lei|leis|art(?:igo)?\.?\s*\d|c[oó]digo|cpc|cpp|clt|cf|stf|stj|tjsp|tjmg|jurisprud[eê]ncia|s[uú]mula|processo\b(?!s? do))|\b(direito|trabalhista|c[ií]vel|criminal|penal|tribut[aá]rio|previdenci[aá]rio|consumidor|fam[ií]lia|imobili[aá]rio|herdeiro|inventario|invent[aá]rio|div[oó]rcio|guarda|pens[aã]o|alimentos|usucapi[aã]o|despejo|reintegra[cç][aã]o|habeas corpus|recurso)\b/i;
      let jusContext = "";
      if (legalRe.test(text)) {
        try {
          const { data: js } = await supabase.functions.invoke("jusbrasil-search", { body: { query: text } });
          if (js?.summary) jusContext = `\n\nRESULTADOS DA BUSCA NO JUSBRASIL (use estas referências reais, cite títulos e URLs quando útil):\n${js.summary}\nFonte da busca: ${js.source_url}`;
        } catch {}
      }

      const enrichedSystem = `Você é Kênia, assistente virtual de voz da Dra. Kênia Garcia. Você é uma assistente COMPLETA e GENERALISTA: responde sobre QUALQUER tema (direito, saúde, finanças, tecnologia, relacionamentos, carreira, educação, culinária, viagens, esportes, cultura, autoajuda, etc.) e pode dar conselhos práticos e opiniões fundamentadas em diversas áreas da vida. NUNCA recuse um tema dizendo "não posso falar sobre isso" ou "sou apenas uma assistente jurídica" — você conversa sobre tudo de forma natural, acolhedora e útil.\n\nVocê também TEM ACESSO COMPLETO aos dados internos do escritório abaixo (contatos, leads, processos, agendamentos, mensagens, prazos). Quando a pergunta for sobre o escritório/clientes, use SEMPRE esses dados com precisão e NUNCA diga "não tenho acesso". Quando a pergunta for sobre temas gerais ou conselhos, responda com seu conhecimento geral, sem precisar usar os dados do escritório. Para temas jurídicos, baseie-se também nos RESULTADOS DA BUSCA NO JUSBRASIL quando fornecidos, citando títulos e links.\n\nEstilo: respostas faladas, claras, calorosas, em português do Brasil, no máximo 3-5 frases quando possível.\n\nDADOS DO ESCRITÓRIO (use apenas se a pergunta for sobre o escritório):\n${ctxSummary}${jusContext}`;


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

  // Parse data em PT-BR: "hoje 15:00", "amanha 10h", "25/12 14:30", "25/12/2026 09:00"
  const parseDateTimePt = (raw) => {
    if (!raw) return null;
    const s = String(raw).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
    const hm = s.match(/(\d{1,2})(?:[h:](\d{2}))?/);
    let hour = hm ? parseInt(hm[1], 10) : 10;
    let min = hm && hm[2] ? parseInt(hm[2], 10) : 0;
    if (isNaN(hour) || hour > 23) { hour = 10; min = 0; }
    const d = new Date();
    if (/\bdepois de amanha\b/.test(s)) { d.setDate(d.getDate() + 2); }
    else if (/\bamanha\b/.test(s)) { d.setDate(d.getDate() + 1); }
    else if (/\bhoje\b/.test(s)) { /* keep */ }
    else {
      const dm = s.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if (dm) {
        const day = parseInt(dm[1], 10);
        const month = parseInt(dm[2], 10) - 1;
        let year = dm[3] ? parseInt(dm[3], 10) : d.getFullYear();
        if (year < 100) year += 2000;
        d.setFullYear(year, month, day);
      } else { return null; }
    }
    d.setHours(hour, min, 0, 0);
    return d;
  };

  const changeAppointmentDate = async (name, whenExpr) => {
    setThinking(true);
    try {
      const ctx = await loadClientContext();
      const list = ctx?.appointments || [];
      const n = norm(name);
      const appt = list.find((a) => norm(a.client_name || a.customer_name || a.lead_name).includes(n));
      if (!appt) {
        const msg = `Não encontrei agendamento para ${name}.`;
        setReply(msg); speak(msg); return;
      }
      const newDate = parseDateTimePt(whenExpr);
      if (!newDate) {
        const msg = `Não entendi a nova data "${whenExpr}". Diga, por exemplo: amanhã às 15h, ou 25 do 12 às 14:30.`;
        setReply(msg); speak(msg); return;
      }
      const id = appt.id || appt._id;
      const payload = {
        starts_at: newDate.toISOString(),
        appointment_date: newDate.toISOString().slice(0, 10),
        appointment_time: newDate.toTimeString().slice(0, 5),
      };
      await api.patch(`/appointments/${id}`, payload).catch(async () => api.put(`/appointments/${id}`, payload));
      contextRef.current = null;
      const who = appt.client_name || name;
      const msg = `Agendamento de ${who} alterado para ${fmtDateTime(newDate.toISOString())}.`;
      setReply(msg); speak(msg);
      toast.success(msg);
    } catch (e) {
      toast.error("Falha ao alterar agendamento: " + (e?.message || e));
      speak("Não consegui alterar o agendamento.");
    } finally {
      setThinking(false);
    }
  };

  const sendWhatsAppTo = async (name, message) => {
    setThinking(true);
    try {
      const ctx = await loadClientContext();
      const c = findClient(name, ctx);
      if (!c) { const m = `Não encontrei ${name} na central de mensagens.`; setReply(m); speak(m); return; }
      const contactId = c.id || c._id || c.contact_id;
      const phone = c.phone || c.client_phone || "";
      await api.post("/whatsapp/send", { contact_id: contactId, phone, text: message, from_me: true });
      const m = `Mensagem enviada para ${c.name || c.client_name}.`;
      setReply(m); speak(m); toast.success(m);
    } catch (e) {
      toast.error("Falha ao enviar WhatsApp: " + (e?.message || e));
      speak("Não consegui enviar a mensagem.");
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

  const [ytQuery, setYtQuery] = useState("");
  const [ytVideoId, setYtVideoId] = useState("");
  const [ytIds, setYtIds] = useState([]);
  const [ytIdx, setYtIdx] = useState(0);

  const playYouTube = async (query) => {
    const q = (query || "").trim();
    if (!q) return;
    setYtQuery(q); setYtVideoId(""); setYtIds([]); setYtIdx(0);
    setOpen(true);
    const msg = `Procurando ${q} no YouTube.`;
    setReply(msg); speak(msg);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-search", { body: { query: q } });
      if (error) throw error;
      const ids = data?.ids || (data?.videoId ? [data.videoId] : []);
      if (!ids.length) throw new Error("Nenhum vídeo encontrado");
      setYtIds(ids); setYtVideoId(ids[0]); setYtIdx(0);
    } catch (e) {
      const m = `Não consegui encontrar vídeos para ${q}.`;
      setReply(m); speak(m); toast.error(m);
    }
  };

  const ytNext = () => {
    if (!ytIds.length) return;
    const next = (ytIdx + 1) % ytIds.length;
    setYtIdx(next); setYtVideoId(ytIds[next]);
  };

  const closeYouTube = () => {
    setYtVideoId(""); setYtIds([]); setYtIdx(0); setYtQuery("");
  };

  const handleCommand = (text) => {
    if (!text?.trim()) return;
    const lower = text.toLowerCase();
    // Minimizar / fechar o painel da assistente (continua escutando, bolinha verde)
    if (/\b(minimiza[r]?|minimize|recolhe[r]?|recolha|esconde[r]?|esconda|some|sumir|fecha[r]?\s+(?:o\s+)?(?:quadro|painel|janela|caixa)|fecha[r]?\s+voc[eê])\b/i.test(lower)) {
      userMinimizedRef.current = true;
      setOpen(false);
      const m = "Minimizado. Continuo escutando.";
      setReply(m); speak(m);
      return;
    }

    // Fechar / parar música ou aba do YouTube
    if (/\b(fech[ae]r?|fecha|para|pare|parar|encerra[r]?|desliga[r]?|stop|pause|pausa[r]?)\b[\s\S]*\b(m[uú]sica|som|v[ií]deo|youtube|yt|aba|player)\b/i.test(lower)
        || /\b(m[uú]sica|som|v[ií]deo|youtube|aba|player)\b[\s\S]*\b(fech[ae]r?|fecha|para|pare|parar|encerra[r]?|desliga[r]?|stop|pause|pausa[r]?)\b/i.test(lower)) {
      closeYouTube();
      const m = "Música fechada.";
      setReply(m); speak(m); toast.success(m);
      return;
    }
    // Tocar música no YouTube — aceita "toca X", "música X", "ouvir X", com ou sem mencionar YouTube
    const ytMatch = text.match(/\b(?:toca|tocar|toque|coloca|colocar|coloque|p[oõ]e|p[oõ]r|reproduz|reproduzir|escutar|ouvir|busca[r]?|procura[r]?)\s+(?:a\s+|o\s+|uma\s+|um\s+)?(?:m[uú]sica|son[s]?|som|v[ií]deo|playlist|clipe|audio|[aá]udio|can[cç][aã]o)?\s*(?:do|da|de|dos|das|no|pelo|pela)?\s*(.+?)(?:\s+(?:no|do|pelo|pela|pelo\s+youtube|youtube))?\s*$/i);
    const musicOnly = text.match(/\b(?:m[uú]sica|can[cç][aã]o|playlist|clipe)\s+(?:do|da|de|dos|das)?\s*(.+)/i);
    if (/youtube|y\s*tube|yt\b/i.test(lower) || (ytMatch && /\b(toca|tocar|toque|coloca|colocar|coloque|p[oõ]e|reproduz|escutar|ouvir)\b/i.test(lower)) || musicOnly) {
      const q = (ytMatch ? ytMatch[1] : (musicOnly ? musicOnly[1] : text)).replace(/youtube/gi, "").replace(/\b(toca|tocar|toque|coloca|colocar|coloque|p[oõ]e|reproduz|m[uú]sica|som|v[ií]deo|can[cç][aã]o|playlist|clipe)\b/gi, "").trim();
      if (q) { userMinimizedRef.current = false; setOpen(true); playYouTube(q); return; }
    }
    // Intenção: agendamentos do dia / de hoje
    if (/\bagendamento[s]?\b/.test(lower) && /\b(hoje|do dia|de hoje|para hoje)\b/.test(lower)) {
      reportTodayAppointments();
      return;
    }
    // Enviar mensagem no WhatsApp: "enviar/mandar mensagem/whatsapp para [nome] dizendo/falando/: [texto]"
    const waMatch = text.match(/\b(?:enviar|mandar|envie|mande)\s+(?:uma\s+)?(?:mensagem|whats?app|zap)\s+(?:para|pro|pra|ao|a|o)\s+(.+?)\s+(?:dizendo|falando|com\s+a\s+mensagem|que|:)\s+(.+)/i);
    if (waMatch) { sendWhatsAppTo(waMatch[1].trim(), waMatch[2].trim()); return; }
    // Mudar data do agendamento: "mudar/alterar/remarcar agendamento de [nome] para [data]"
    const chMatch = text.match(/\b(?:mudar|alterar|trocar|remarcar|reagendar|mover|adiar)\s+(?:o\s+|a\s+)?(?:agendamento|reuniao|reunião|consulta|compromisso|hor[aá]rio)?\s*(?:de|do|da|com)?\s*(.+?)\s+(?:para|pra|pro)\s+(.+)/i);
    if (chMatch) { changeAppointmentDate(chMatch[1].trim(), chMatch[2].trim()); return; }
    // Ligar para [nome]
    const callMatch = text.match(/\b(?:ligar|telefonar|chamar|ligue|telefone)\s+(?:para|pro|pra|o|a)?\s*(.+)/i);
    if (callMatch) { callClient(callMatch[1].trim()); return; }
    // Reagendar [nome] (sem data) — abre a agenda
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

  useEffect(() => {
    handleCommandRef.current = handleCommand;
  });



  const toggleListen = () => {
    unlockSpeech();
    if (!supported) {
      toast.error("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening || recognitionActiveRef.current) {
      shouldRestartRef.current = false;
      alwaysOnRef.current = false;
      commandSessionActiveRef.current = false;
      setAlwaysOn(false);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try { rec.abort?.(); } catch {}
      setListening(false);
    } else {
      shouldRestartRef.current = false;
      alwaysOnRef.current = false;
      commandSessionActiveRef.current = false;
      setAlwaysOn(false);
      setTranscript("");
      try {
        rec.start();
        recognitionActiveRef.current = true;
        setListening(true);
      } catch (err) {
        if (err?.name === "InvalidStateError") {
          recognitionActiveRef.current = true;
          setListening(true);
          return;
        }
        recognitionActiveRef.current = false;
        setListening(false);
        toast.error("Não consegui ativar o microfone. Verifique a permissão do navegador.");
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          unlockSpeech();
          setOpen((v) => {
            const next = !v;
            userMinimizedRef.current = !next; // se está fechando, marca como minimizado pelo usuário
            return next;
          });
          // NÃO mexer em alwaysOn/recognition — escuta contínua segue ativa mesmo minimizado.
        }}
        className="fixed left-5 bottom-5 z-50 w-16 h-16 rounded-full overflow-hidden shadow-xl ring-2 ring-gold-400 hover:scale-105 transition-transform bg-white"
        aria-label="Assistente de voz Kênia"
        data-testid="voice-orb"
      >
        <img src={LOGO} alt="Kênia" className="w-full h-full object-cover" />
        {listening && (
          <span className="absolute inset-0 rounded-full ring-4 ring-rose-500 animate-pulse pointer-events-none" />
        )}
        {alwaysOn && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse"
            title="Escuta contínua ativa"
          />
        )}
      </button>

      {open && (
        <div
          className="fixed left-5 bottom-24 z-50 w-72 bg-white border border-nude-200 rounded-xl shadow-2xl p-4"
          data-testid="voice-orb-panel"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-serif text-base text-nude-900">Assistente Kênia</div>
            <button onClick={() => { userMinimizedRef.current = true; setOpen(false); }} className="text-nude-500 hover:text-nude-900" title="Minimizar (escuta continua ativa)">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-nude-600 mb-3">
            Toque no microfone e diga, por exemplo: <em>“abrir agenda”</em>. Ou ative a <strong>escuta contínua</strong> e diga <em>“secretária”</em> antes do comando.
          </p>
          <button
            onClick={toggleAlwaysOn}
            className={`w-full mb-2 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors ${alwaysOn ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-nude-100 text-nude-800 hover:bg-nude-200"}`}
          >
            {alwaysOn ? '🟢 Escuta contínua ATIVA — diga "secretária"' : "Ativar escuta contínua (palavra: secretária)"}
          </button>
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

          {ytQuery && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-nude-900 truncate">YouTube: {ytQuery}</span>
                <div className="flex items-center gap-2">
                  {ytIds.length > 1 && (
                    <button onClick={ytNext} className="text-gold-700 hover:text-gold-900 text-xs">próximo</button>
                  )}
                  <button onClick={() => { setYtQuery(""); setYtVideoId(""); setYtIds([]); }} className="text-nude-500 hover:text-nude-900 text-xs">fechar</button>
                </div>
              </div>
              <div className="aspect-video w-full rounded overflow-hidden bg-black flex items-center justify-center">
                {ytVideoId ? (
                  <iframe
                    title="YouTube"
                    className="w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&rel=0`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <span className="text-xs text-white/70">Procurando…</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
