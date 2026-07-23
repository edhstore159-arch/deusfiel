import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/kenia/lib/api";
import { loadKeniaPrompt, renderKeniaPrompt } from "@/kenia/lib/keniaPrompt";



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
  const pausedForSpeechRef = useRef(false);
  const speechResumeTimerRef = useRef(null);
  const [alwaysOn, setAlwaysOn] = useState(() => {
    try { return localStorage.getItem("kenia:voice-always-on") === "1"; } catch { return false; }
  });
  useEffect(() => {
    alwaysOnRef.current = alwaysOn;
    try { localStorage.setItem("kenia:voice-always-on", alwaysOn ? "1" : "0"); } catch {}
  }, [alwaysOn]);

  // ===== Multi-aba: apenas UMA aba pode rodar a secretária de voz por vez =====
  // Usa Web Locks API (com fallback BroadcastChannel) para eleger uma "aba líder".
  // Abas não-líderes ficam silenciosas (não escutam nem falam) para evitar conflito.
  const isLeaderRef = useRef(false);
  const [isLeader, setIsLeader] = useState(false);
  useEffect(() => {
    let release;
    let cancelled = false;
    const become = () => { if (!cancelled) { isLeaderRef.current = true; setIsLeader(true); } };
    const yieldLead = () => { isLeaderRef.current = false; setIsLeader(false); };

    if (typeof navigator !== "undefined" && navigator.locks?.request) {
      navigator.locks.request("kenia-voice-secretary", { mode: "exclusive" }, () => {
        become();
        return new Promise((res) => { release = res; });
      }).catch(() => {});
    } else if (typeof BroadcastChannel !== "undefined") {
      // Fallback simples: a primeira aba que não recebe "claim" em 300ms vira líder.
      const bc = new BroadcastChannel("kenia-voice-secretary");
      let conflict = false;
      bc.onmessage = (e) => {
        if (e.data === "claim") conflict = true;
        if (e.data === "ping" && isLeaderRef.current) bc.postMessage("claim");
      };
      bc.postMessage("ping");
      const t = setTimeout(() => { if (!conflict) { become(); bc.postMessage("claim"); } }, 300);
      release = () => { clearTimeout(t); try { bc.close(); } catch {} };
    } else {
      become();
    }

    return () => {
      cancelled = true;
      yieldLead();
      try { release && release(); } catch {}
    };
  }, []);

  // Quando esta aba perde a liderança, encerra qualquer escuta/fala em andamento.
  useEffect(() => {
    if (isLeader) return;
    try { recognitionRef.current?.abort?.(); } catch {}
    try { window.speechSynthesis?.cancel?.(); } catch {}
    recognitionActiveRef.current = false;
    setListening(false);
  }, [isLeader]);

  // Auto-reativa a escuta contínua ao recarregar, se estava ativa antes
  useEffect(() => {
    if (!alwaysOn || !supported || !isLeader) return;
    const t = setTimeout(() => {
      try {
        shouldRestartRef.current = true;
        const rec = recognitionRef.current;
        if (rec && !recognitionActiveRef.current) rec.start();
      } catch {}
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, isLeader]);

  const restartContinuousRecognition = (delay = 300) => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      if (!shouldRestartRef.current || !alwaysOnRef.current || !isLeaderRef.current || recognitionActiveRef.current) return;
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
      console.log("[Kenia-Voice] recognition STARTED");
      recognitionActiveRef.current = true;
      setListening(true);
    };
    rec.onresult = (e) => {
      const txt = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setTranscript(txt);
      console.log("[Kenia-Voice] onresult txt=", txt, "alwaysOn=", alwaysOnRef.current, "speaking=", speakingRef.current, "cmdSession=", commandSessionActiveRef.current);
      // Interrupção imediata: se a palavra "secretária" aparecer mesmo nos
      // resultados parciais (interim) enquanto a assistente está falando,
      // cancela a fala na hora — não espera o resultado final.
      if (alwaysOnRef.current && speakingRef.current) {
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const partial = e.results[i]?.[0]?.transcript;
          if (partial && hasWakeWord(partial)) {
            try { window.speechSynthesis?.cancel?.(); } catch {}
            try { if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; audioRef.current = null; } } catch {}
            speechTokenRef.current = 0;
            speakingRef.current = false;
            activateCommandSession();
            break;
          }
        }
      }
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
          // Enquanto a assistente estiver tocando algo (hino, áudio, fala),
          // só interrompe / aceita comandos se a palavra "secretária" for dita.
          if (speakingRef.current && !woke) {
            continue;
          }
          if (woke) {
            window.speechSynthesis?.cancel?.();
            activateCommandSession();
            if (!commandText || isWakeOnlyPrompt(commandText)) {
              answerWakePrompt();
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
      if (pausedForSpeechRef.current) return;
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
        rec.continuous = true;
        rec.interimResults = true;
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
  const audioRef = useRef(null);
  const speechTokenRef = useRef(0);
  const speechQueueRef = useRef([]);

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

  const splitSpeechText = (text) => {
    const clean = String(text || "")
      .replace(/<AGENDAMENTO>[\s\S]*?<\/AGENDAMENTO>/g, "")
      .replace(/https?:\/\/\S+/g, "link")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return [];
    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    const chunks = [];
    let current = "";
    const pushWords = (value) => {
      const words = String(value || "").trim().split(/\s+/).filter(Boolean);
      let part = "";
      for (const word of words) {
        if ((part + " " + word).trim().length > 210) {
          if (part) chunks.push(part.trim());
          part = word;
        } else {
          part = `${part} ${word}`.trim();
        }
      }
      if (part) chunks.push(part.trim());
    };
    for (const sentence of sentences) {
      const s = sentence.trim();
      if (!s) continue;
      if (s.length > 210) {
        if (current) { chunks.push(current.trim()); current = ""; }
        pushWords(s);
        continue;
      }
      if ((current + " " + s).trim().length > 210) {
        if (current) chunks.push(current.trim());
        current = s;
      } else {
        current = `${current} ${s}`.trim();
      }
    }
    if (current) chunks.push(current.trim());
    return chunks.slice(0, 48);
  };

  const speak = (text) => {
    // Em outras abas (não-líder) a secretária permanece em silêncio para não duplicar a fala.
    if (!isLeaderRef.current) return;
    try {
      const synth = window.speechSynthesis;
      if (audioRef.current) {
        try { audioRef.current.pause(); audioRef.current.src = ""; } catch {}
        audioRef.current = null;
      }
      if (!synth || !text) return;
      loadVoices();
      const chunks = splitSpeechText(text);
      if (!chunks.length) return;
      const shouldResume = alwaysOnRef.current && shouldRestartRef.current;
      const token = Date.now() + Math.random();
      speechTokenRef.current = token;
      speechQueueRef.current = chunks;

      const finishSpeaking = () => {
        if (speechTokenRef.current !== token) return;
        speakingRef.current = false;
        pausedForSpeechRef.current = false;
        if (speechResumeTimerRef.current) clearTimeout(speechResumeTimerRef.current);
        if (shouldResume && alwaysOnRef.current && shouldRestartRef.current) {
          restartContinuousRecognition(250);
        }
      };

      // No Chrome, criar e enfileirar o utterance precisa ser SÍNCRONO em relação
      // à intenção do usuário; setTimeout antes de new SpeechSynthesisUtterance
      // faz a chamada falhar silenciosamente. Cancelamos o que estava na fila
      // e disparamos o primeiro chunk imediatamente.
      try { synth.cancel(); } catch {}
      try { synth.resume?.(); } catch {}
      pausedForSpeechRef.current = true;
      try { recognitionRef.current?.abort?.(); } catch {}
      speakingRef.current = true;

      const speakChunk = (index = 0) => {
        if (speechTokenRef.current !== token) return;
        if (index >= chunks.length) { finishSpeaking(); return; }
        const u = new SpeechSynthesisUtterance(chunks[index]);
        u.lang = "pt-BR";
        u.rate = 1;
        u.pitch = 1;
        u.volume = 1;
        const v = pickPtVoice();
        if (v) u.voice = v;
        let done = false;
        const next = () => {
          if (done) return;
          done = true;
          if (speechResumeTimerRef.current) clearTimeout(speechResumeTimerRef.current);
          // próximo chunk síncrono (sem await) para manter o contexto do gesto.
          speakChunk(index + 1);
        };
        u.onstart = () => { speakingRef.current = true; };
        u.onend = next;
        u.onerror = next;
        const fallbackMs = Math.min(12000, Math.max(2500, chunks[index].length * 90));
        if (speechResumeTimerRef.current) clearTimeout(speechResumeTimerRef.current);
        speechResumeTimerRef.current = window.setTimeout(next, fallbackMs);
        try {
          if (synth.paused) synth.resume?.();
          synth.speak(u);
          // Chrome bug: às vezes a fila fica em "pending" por ~15s.
          // Forçar resume periodicamente mantém o áudio fluindo.
          window.setTimeout(() => { try { synth.resume?.(); } catch {} }, 250);
          window.setTimeout(() => { try { synth.resume?.(); } catch {} }, 1000);
        } catch { next(); }
      };

      // Dispara imediatamente — sem setTimeout — para preservar a confiança do gesto.
      speakChunk(0);

    } catch {}
  };

  const playAssistantReply = async (text, audioBase64) => {
    const msg = String(text || "").trim();
    if (!msg) return;
    const shouldResume = alwaysOnRef.current && shouldRestartRef.current;
    if (audioBase64) {
      try {
        window.speechSynthesis?.cancel?.();
        if (shouldResume) {
          speakingRef.current = true;
          pausedForSpeechRef.current = true;
          try { recognitionRef.current?.abort?.(); } catch {}
        }
        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        const blobUrl = URL.createObjectURL(blob);
        const audio = new Audio(blobUrl);
        audioRef.current = audio;
        const cleanup = () => { try { URL.revokeObjectURL(blobUrl); } catch {} };
        const resume = () => {
          speakingRef.current = false;
          cleanup();
          if (shouldResume && alwaysOnRef.current && shouldRestartRef.current) restartContinuousRecognition(250);
        };
        audio.onended = resume;
        audio.onerror = () => { resume(); speak(msg); };
        await audio.play();
        return;
      } catch {
        speakingRef.current = false;
      }
    }
    speak(msg);
  };

  const [thinking, setThinking] = useState(false);
  const [reply, setReply] = useState("");
  const historyRef = useRef([]);
  const contextRef = useRef(null);
  const contextAtRef = useRef(0);

  const norm = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const isWakeOnlyPrompt = (text) => /^(?:fala|fale|conversa|converse|atenda|atende|escuta|escute|ouve|ouca|responda|responde|oi|ola|alo|al[oô]|bom\s+dia|boa\s+tarde|boa\s+noite|esta\s+ai|voce\s+esta\s+ai)(?:\s+(?:comigo|me|aqui|por\s+favor))?$/i.test(norm(text).trim());

  const answerWakePrompt = () => {
    const msg = "Pois não? Estou aqui, pode falar comigo.";
    userMinimizedRef.current = false;
    activateCommandSession();
    setOpen(true);
    setReply(msg);
    speak(msg);
  };

  const userMinimizedRef = useRef(false);
  const activateCommandSession = () => {
    commandSessionActiveRef.current = true;
    awakeUntilRef.current = 0;
    // Se o usuário minimizou de propósito, mantemos minimizado — a escuta segue ativa em background.
    if (!userMinimizedRef.current) setOpen(true);
  };

  const loadClientContext = async () => {
    if (contextRef.current && Date.now() - contextAtRef.current < 180_000) return contextRef.current;
    const withTimeout = (promise, fallback, ms = 2500) => Promise.race([
      promise,
      new Promise((resolve) => window.setTimeout(() => resolve(fallback), ms)),
    ]);
    const safe = async (p) => withTimeout(api.get(p).then(({ data }) => data).catch(() => null), null);
    const safeSb = async (table) => {
      try {
        const { data } = await withTimeout(supabase.from(table).select("*").limit(120), { data: [] });
        return Array.isArray(data) ? data : [];
      } catch { return []; }
    };
    const [leads, contacts, processes, appointments, analyses, logs, deadlines, sbAppointments, sbConversations] = await Promise.all([
      safe("/leads"), safe("/whatsapp/contacts"), safe("/processes"), safe("/appointments"), safe("/case-analyses"), safe("/whatsapp/logs"), safe("/legal-deadlines"),
      safeSb("appointments"), safeSb("conversations"),
    ]);
    const pick = (d) => Array.isArray(d) ? d : (Array.isArray(d?.items) ? d.items : []);
    const apptList = pick(appointments);
    const mergedAppts = apptList.length ? apptList : sbAppointments;
    const pickedContacts = pick(contacts);
    // Fallback: monta a lista de contatos a partir dos agendamentos (com telefone real do banco)
    // quando a API externa /whatsapp/contacts não retornar nada — assim a Kênia sempre tem os
    // números reais dos clientes para informar no chat.
    const fallbackContacts = (() => {
      const map = new Map();
      for (const a of mergedAppts) {
        const phone = a.phone || a.client_phone || "";
        const name = a.client_name || a.customer_name || a.lead_name || "Cliente";
        const key = (phone || name).toString().trim();
        if (!key) continue;
        if (!map.has(key)) {
          map.set(key, { name, phone, email: a.email || null, last_contact_at: a.created_at, source: "appointment" });
        }
      }
      return Array.from(map.values());
    })();
    const ctx = {
      leads: pick(leads), contacts: pickedContacts.length ? pickedContacts : fallbackContacts, processes: pick(processes),
      appointments: mergedAppts,
      analyses: pick(analyses), logs: pick(logs), deadlines: pick(deadlines),
      conversations: sbConversations,
    };
    contextRef.current = ctx;
    contextAtRef.current = Date.now();
    return ctx;
  };

  // Sempre carrega o contexto do dashboard — a secretária precisa ter visão completa de
  // agendamentos (hoje, amanhã, qualquer data) para responder sem depender de palavra-chave.
  const needsDashboardContext = (_text) => true;

  const findClient = (name, ctx) => {
    const n = norm(name);
    if (!n) return null;
    const pools = [...(ctx?.contacts || []), ...(ctx?.leads || []), ...(ctx?.appointments || [])];
    return pools.find((c) => norm(c.name || c.client_name).includes(n)) || null;
  };

  const askOllama = async (text) => {
    setThinking(true);
    setReply("");
    try {
      const ctx = needsDashboardContext(text) ? await loadClientContext().catch(() => null) : null;
      // Computa "hoje" e "amanhã" no fuso de São Paulo para destacar agendamentos relevantes.
      const isoSP = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
      const _now = new Date();
      const _tomorrow = new Date(_now.getTime() + 24 * 60 * 60 * 1000);
      const _todayISO = isoSP(_now);
      const _tomorrowISO = isoSP(_tomorrow);
      const apptISO = (a) => {
        const raw = a.appointment_date || a.starts_at || a.date || "";
        if (!raw) return "";
        try { return isoSP(new Date(raw)); } catch { return String(raw).slice(0, 10); }
      };
      const mapAppt = (a) => ({
        cliente: a.client_name || a.customer_name || a.lead_name,
        tel: a.phone || a.client_phone,
        email: a.email,
        data: a.appointment_date || a.starts_at,
        hora: a.appointment_time,
        area: a.legal_area || a.case_type,
        cidade: a.city,
        resumo_caso: a.case_summary || a.description,
        status: a.status,
        origem: a.source,
      });
      const apptsTomorrow = (ctx?.appointments || []).filter((a) => apptISO(a) === _tomorrowISO).map(mapAppt);
      const apptsToday = (ctx?.appointments || []).filter((a) => apptISO(a) === _todayISO).map(mapAppt);

      // Agrupa TODOS os agendamentos por data (ISO) para que a secretária responda
      // sobre qualquer dia solicitado, não apenas hoje/amanhã.
      const apptsByDate = {};
      (ctx?.appointments || []).forEach((a) => {
        const k = apptISO(a) || "sem-data";
        (apptsByDate[k] ||= []).push(mapAppt(a));
      });
      const upcoming = (ctx?.appointments || [])
        .filter((a) => { const k = apptISO(a); return k && k >= _todayISO; })
        .sort((a, b) => (apptISO(a) + (a.appointment_time || "")).localeCompare(apptISO(b) + (b.appointment_time || "")))
        .slice(0, 30)
        .map((a) => ({ data: apptISO(a), ...mapAppt(a) }));

      const ctxSummary = ctx ? [
        `REGRA DE AGENDAMENTOS — RESPOSTA OBRIGATÓRIA: se o cliente perguntar sobre agendamentos de HOJE, AMANHÃ ou qualquer data específica, consulte EXCLUSIVAMENTE as listas abaixo e responda de forma direta. Se a lista do dia perguntado estiver vazia ([]), diga claramente "Não há agendamentos para [dia]". Se houver itens, diga a quantidade e enumere nome do cliente + horário. NUNCA invente, NUNCA diga que não tem acesso aos dados.`,
        `RESUMO: ${ctx.contacts.length} contatos, ${ctx.leads.length} leads, ${ctx.processes.length} processos, ${ctx.appointments.length} agendamentos (HOJE ${_todayISO}: ${apptsToday.length} | AMANHÃ ${_tomorrowISO}: ${apptsTomorrow.length}), ${ctx.logs.length} mensagens, ${ctx.deadlines.length} prazos.`,
        `AGENDAMENTOS HOJE (${_todayISO}) — total ${apptsToday.length}: ${JSON.stringify(apptsToday)}`,
        `AGENDAMENTOS AMANHÃ (${_tomorrowISO}) — total ${apptsTomorrow.length}: ${JSON.stringify(apptsTomorrow)}`,
        `PRÓXIMOS AGENDAMENTOS (até 30, ordenados por data): ${JSON.stringify(upcoming)}`,
        `AGENDAMENTOS POR DATA (ISO → lista): ${JSON.stringify(apptsByDate)}`,
        `Leads (top 10): ${JSON.stringify((ctx.leads||[]).slice(0, 10).map((l) => ({ nome: l.name, tel: l.phone, area: l.case_type, etapa: l.stage })))}`,
        `Contatos (top 10): ${JSON.stringify((ctx.contacts||[]).slice(0, 10).map((c) => ({ nome: c.name, tel: c.phone, nao_lidas: c.unread })))}`,
        `Processos (top 10): ${JSON.stringify((ctx.processes||[]).slice(0, 10).map((p) => ({ cliente: p.client_name, numero: p.process_number, area: p.case_type, status: p.status, proxima_audiencia: p.next_hearing })))}`,
        `Prazos próximos (top 8): ${JSON.stringify((ctx.deadlines||[]).slice(0, 8).map((d) => ({ cliente: d.client_name, titulo: d.title, vencimento: d.due_at, urgencia: d.urgency })))}`,
      ].join("\n") : "";


      // Busca jurídica fica concentrada no backend para evitar chamada duplicada e reduzir latência da voz.
      let jusContext = "";

      const nowBR = new Date();
      const fmtFull = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(nowBR);
      const fmtTime = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(nowBR);
      const fmtISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(nowBR);
      const hourBR = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(nowBR));
      const greeting = hourBR < 12 ? "Bom dia" : hourBR < 18 ? "Boa tarde" : "Boa noite";
      const dateContext = `DATA E HORA ATUAL (fuso America/Sao_Paulo, use SEMPRE esta como referência de "hoje", "agora", "ontem", "amanhã" — NUNCA invente outra data): ${fmtFull}, ${fmtTime} (ISO: ${fmtISO}). SAUDAÇÃO OBRIGATÓRIA: sempre inicie a resposta cumprimentando o cliente com "${greeting}" de acordo com este horário de Brasília — nunca use outra saudação. BEM-ESTAR: se o cliente perguntar como você está (ex.: "tudo bem?", "como vai?", "está bem?"), responda calorosamente que está muito bem, agradeça por perguntar e DEVOLVA a pergunta perguntando se o cliente também está bem antes de seguir com o atendimento.`;

      const enrichedSystem = renderKeniaPrompt(loadKeniaPrompt(), { dateContext, ctxSummary, jusContext });


      const authUserId = await Promise.race([
        supabase.auth.getUser().then(({ data }) => data?.user?.id || null).catch(() => null),
        new Promise((resolve) => window.setTimeout(() => resolve(null), 800)),
      ]);
      const creativeVoiceRequest = isCreativeVoiceRequest(text);
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: {
          message: text,
          history: historyRef.current.slice(-4),
          session_id: "kenia-voice-orb",
          system_prompt: enrichedSystem,
          context: ctxSummary,
          want_audio: true,
          fast_mode: !creativeVoiceRequest,
          creative_mode: creativeVoiceRequest,
          user_id: authUserId,
        },
      });
      if (error) throw error;
      const answer = String(data?.response || data?.reply || data?.message || data?.text || "").trim();
      if (!answer) throw new Error("Resposta vazia");
      historyRef.current.push({ role: "user", content: text });
      historyRef.current.push({ role: "assistant", content: answer });
      setReply(answer);
      await playAssistantReply(answer, data?.audio_base64);
      const r = matchRoute(answer);
      if (r) navigate(r);
    } catch (e) {
      const fallback = "Estou aqui. Não consegui acessar a resposta completa agora, mas pode repetir sua solicitação que vou tentar novamente.";
      setReply(fallback);
      toast.error("Falha ao consultar Kênia: " + (e?.message || e));
      speak(fallback);
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

  // Parse data em PT-BR: "hoje 15:00", "amanha 10h", "25/12 14:30", "dia 25 do 12 às 09h"
  const parseDateTimePt = (raw) => {
    if (!raw) return null;
    const s = String(raw).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
    const timeMatches = [
      ...s.matchAll(/\b(?:as|a?s|horario\s*(?:de|para)?)\s*(\d{1,2})(?:[:h](\d{1,2}))?\s*(?:h|hs|horas)?\b(?!\s*[\/\-])/gi),
      ...s.matchAll(/(?<![\/\-])\b(\d{1,2})(?:[:h](\d{1,2}))\s*(?:h|hs|horas)?\b(?!\s*[\/\-])/gi),
      ...s.matchAll(/(?<![\/\-])\b(\d{1,2})\s*(?:h|hs|horas)\b(?!\s*[\/\-])/gi),
    ].sort((a, b) => (a.index || 0) - (b.index || 0));
    const hm = timeMatches[timeMatches.length - 1];
    let hour = hm ? parseInt(hm[1], 10) : 10;
    let min = hm && hm[2] ? parseInt(hm[2], 10) : 0;
    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(min) || min < 0 || min > 59) { hour = 10; min = 0; }
    const d = new Date();
    if (/\bdepois de amanha\b/.test(s)) { d.setDate(d.getDate() + 2); }
    else if (/\bamanha\b/.test(s)) { d.setDate(d.getDate() + 1); }
    else if (/\bhoje\b/.test(s)) { /* keep */ }
    else {
      const dm = s.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/) || s.match(/\bdia\s+(\d{1,2})\s+(?:de|do)\s+(\d{1,2})(?:\s+(?:de|do)\s+(\d{2,4}))?/);
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

  const scheduleNewAppointment = async (name, whenExpr, area) => {
    setThinking(true);
    try {
      const newDate = parseDateTimePt(whenExpr);
      if (!newDate) {
        const msg = `Não entendi a data "${whenExpr}". Diga, por exemplo: amanhã às 15h, ou 25/12 às 14:30.`;
        setReply(msg); speak(msg); return;
      }
      const ctx = await loadClientContext();
      const c = findClient(name, ctx);
      const client_name = c?.name || c?.client_name || name;
      const phone = c?.phone || c?.client_phone || null;
      const email = c?.email || c?.client_email || null;
      const payload = {
        client_name,
        phone,
        email,
        legal_area: area || "Atendimento",
        appointment_date: newDate.toISOString().slice(0, 10),
        appointment_time: newDate.toTimeString().slice(0, 5),
        starts_at: newDate.toISOString(),
        status: "scheduled",
        source: "voice_orb",
      };
      let ok = false;
      try { await api.post("/appointments", payload); ok = true; } catch {}
      if (!ok) {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("appointments").insert({ ...payload, user_id: userData?.user?.id ?? null });
        if (error) throw error;
      }
      contextRef.current = null;
      const msg = `Agendamento criado para ${client_name} em ${fmtDateTime(newDate.toISOString())}.`;
      setReply(msg); speak(msg); toast.success(msg);
    } catch (e) {
      toast.error("Falha ao agendar: " + (e?.message || e));
      speak("Não consegui criar o agendamento.");
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
      const contactName = c.name || c.client_name || name;
      await api.post("/whatsapp/send", { contact_id: contactId, contact_phone: phone, phone, text: message, from_me: true });
      // Persiste no dashboard (central de mensagens)
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id;
        if (uid && contactId) {
          await supabase.from("whatsapp_messages").upsert({
            user_id: uid,
            contact_id: String(contactId),
            contact_name: contactName,
            contact_phone: phone || null,
            text: message,
            from_me: true,
            provider_message_id: `voice-${Date.now()}`,
            created_at: new Date().toISOString(),
          }, { onConflict: "user_id,contact_id,provider_message_id" });
        }
      } catch (err) { console.warn("Não foi possível espelhar mensagem no dashboard:", err); }
      const m = `Mensagem enviada para ${contactName} pela central de mensagens.`;
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

  // scope: "today" | "tomorrow" | "week" | "all"
  const reportAppointments = async (scope = "today") => {
    setThinking(true);
    setReply("");
    try {
      // Sempre tenta a API externa primeiro e cai para o Supabase como fallback,
      // garantindo que a secretária de voz veja TODOS os agendamentos do banco.
      let list = [];
      try {
        const { data } = await api.get("/appointments");
        list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.appointments) ? data.appointments : []));
      } catch {}
      if (!list.length) {
        try {
          const { data: sb } = await supabase.from("appointments").select("*").order("appointment_date", { ascending: true }).limit(500);
          list = Array.isArray(sb) ? sb : [];
        } catch {}
      }

      const getDate = (a) => a.starts_at || a.start_at || a.scheduled_at || (a.appointment_date ? `${a.appointment_date}T${a.appointment_time || "00:00"}` : a.date);
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      let filtered = list;
      let label = "";
      if (scope === "today") { filtered = list.filter((a) => isSameDay(getDate(a), today)); label = "hoje"; }
      else if (scope === "tomorrow") { filtered = list.filter((a) => isSameDay(getDate(a), tomorrow)); label = "amanhã"; }
      else if (scope === "week") {
        filtered = list.filter((a) => { const d = new Date(getDate(a)); return d >= today && d <= weekEnd; });
        label = "nesta semana";
      } else { label = "no total"; }

      filtered = filtered.sort((a, b) => new Date(getDate(a)) - new Date(getDate(b)));

      if (!filtered.length) {
        const msg = `Não há agendamentos ${label}.`;
        setReply(msg); speak(msg); return;
      }
      const lines = filtered.map((a, i) => {
        const when = fmtDateTime(getDate(a));
        const who = a.client_name || a.customer_name || a.lead_name || a.patient_name || a.contact_name || "Cliente";
        const phone = a.phone || a.client_phone || a.whatsapp || "";
        const assignee = a.assigned_to || a.attendant || a.therapist_name || a.responsible || "";
        const title = a.title || a.service || a.subject || a.legal_area || a.area || "Atendimento";
        const status = a.status || "";
        const notes = a.notes || a.description || a.case_summary || "";
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
      const header = `Você tem ${filtered.length} agendamento${filtered.length > 1 ? "s" : ""} ${label}:`;
      setReply(`${header}\n${lines.join("\n")}`);
      const spoken = `${header} ` + filtered.slice(0, 12).map((a, i) => {
        const d = new Date(getDate(a));
        const t = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const day = scope === "today" || scope === "tomorrow" ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " ";
        const who = a.client_name || a.customer_name || a.lead_name || a.patient_name || "cliente";
        const assignee = a.assigned_to || a.therapist_name || a.attendant || "";
        return `${i + 1}: ${day}às ${t} com ${who}${assignee ? ", responsável " + assignee : ""}.`;
      }).join(" ");
      speak(spoken);
    } catch (e) {
      toast.error("Não consegui buscar a agenda: " + (e?.message || e));
      speak("Não consegui buscar a agenda agora.");
    } finally {
      setThinking(false);
    }
  };
  const reportTodayAppointments = () => reportAppointments("today");

  const isCreativeVoiceRequest = (text) => /\b(conta|conte|contar|narra|narre|narrar|inventa|invente|cria|crie|escreve|escreva)\b[\s\S]*\b(hist[oó]ria|conto|f[aá]bula|poema|roteiro|personagem|di[aá]logo|chapeuzinho|chap[eé]uzinho)\b/i.test(norm(text));

  const tellLittleRedRidingHood = () => {
    const story = `Claro. Era uma vez uma menina muito querida, conhecida por todos como Chapeuzinho Vermelho, porque usava sempre uma capa vermelha feita por sua avó. Um dia, sua mãe preparou uma cesta com bolo, frutas e um pouco de mel e pediu que ela levasse tudo até a casa da vovó, que estava doente e morava do outro lado da floresta.

Antes de sair, a mãe avisou: “Vá pelo caminho certo, não converse com estranhos e não se distraia na floresta.” Chapeuzinho prometeu obedecer e seguiu feliz pelo caminho, ouvindo os pássaros e olhando as flores.

No meio da floresta, apareceu um lobo esperto. Com voz mansa, ele perguntou para onde ela ia. Chapeuzinho, inocente, contou que estava indo visitar a avó. O lobo, então, sugeriu que ela colhesse algumas flores para alegrar a vovó. Enquanto a menina se distraía, ele correu por um atalho até a casa da avó.

Chegando lá, o lobo bateu à porta, fingiu ser Chapeuzinho e entrou. A vovó percebeu o perigo e se escondeu dentro de um armário. O lobo vestiu a touca e os óculos dela, deitou-se na cama e esperou.

Quando Chapeuzinho chegou, achou a avó muito estranha e perguntou: “Vovó, que olhos grandes você tem!” O lobo respondeu: “São para te ver melhor.” A menina continuou: “Que orelhas grandes você tem!” E ele disse: “São para te ouvir melhor.” Por fim, ela perguntou: “E que boca grande você tem!” O lobo saltou da cama dizendo: “É para falar mais alto com você!”

Nesse instante, Chapeuzinho gritou. Um caçador que passava por perto ouviu o pedido de socorro, entrou na casa e espantou o lobo para bem longe da floresta. A vovó saiu do armário, abraçou a neta, e as duas agradeceram muito ao caçador.

Depois daquele dia, Chapeuzinho aprendeu a não se desviar do caminho e a ter cuidado com quem parecia gentil demais sem motivo. Ela continuou visitando a vovó, mas sempre com atenção, coragem e prudência. E assim, todos ficaram bem.`;
    userMinimizedRef.current = false;
    activateCommandSession();
    setOpen(true);
    setReply(story);
    historyRef.current.push({ role: "user", content: "Conte a história da Chapeuzinho Vermelho" });
    historyRef.current.push({ role: "assistant", content: story });
    speak(story);
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
    const woke = hasWakeWord(text);
    const commandText = woke ? stripWake(text) : String(text || "").trim();
    const effectiveText = commandText || String(text || "").trim();
    const lower = effectiveText.toLowerCase();
    if (woke && (!commandText || isWakeOnlyPrompt(commandText))) {
      answerWakePrompt();
      return;
    }
    if (/\b(chapeuzinho|chap[eé]uzinho)\s+vermelh[oa]\b/i.test(lower) && /\b(conta|conte|contar|hist[oó]ria|historinha|conto)\b/i.test(lower)) {
      tellLittleRedRidingHood();
      return;
    }
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
    const ytMatch = effectiveText.match(/\b(?:toca|tocar|toque|coloca|colocar|coloque|p[oõ]e|p[oõ]r|reproduz|reproduzir|escutar|ouvir|busca[r]?|procura[r]?)\s+(?:a\s+|o\s+|uma\s+|um\s+)?(?:m[uú]sica|son[s]?|som|v[ií]deo|playlist|clipe|audio|[aá]udio|can[cç][aã]o)?\s*(?:do|da|de|dos|das|no|pelo|pela)?\s*(.+?)(?:\s+(?:no|do|pelo|pela|pelo\s+youtube|youtube))?\s*$/i);
    const musicOnly = effectiveText.match(/\b(?:m[uú]sica|can[cç][aã]o|playlist|clipe)\s+(?:do|da|de|dos|das)?\s*(.+)/i);
    if (/youtube|y\s*tube|yt\b/i.test(lower) || (ytMatch && /\b(toca|tocar|toque|coloca|colocar|coloque|p[oõ]e|reproduz|escutar|ouvir)\b/i.test(lower)) || musicOnly) {
      const q = (ytMatch ? ytMatch[1] : (musicOnly ? musicOnly[1] : effectiveText)).replace(/youtube/gi, "").replace(/\b(toca|tocar|toque|coloca|colocar|coloque|p[oõ]e|reproduz|m[uú]sica|som|v[ií]deo|can[cç][aã]o|playlist|clipe)\b/gi, "").trim();
      if (q) { userMinimizedRef.current = false; setOpen(true); playYouTube(q); return; }
    }
    // Enviar mensagem no WhatsApp: "enviar/mandar mensagem/whatsapp para [nome] dizendo/falando/: [texto]"
    const waMatch = effectiveText.match(/\b(?:enviar|mandar|envie|mande)\s+(?:uma\s+)?(?:mensagem|whats?app|zap)\s+(?:para|pro|pra|ao|a|o)\s+(.+?)\s+(?:dizendo|falando|com\s+a\s+mensagem|que|:)\s+(.+)/i);
    if (waMatch) { sendWhatsAppTo(waMatch[1].trim(), waMatch[2].trim()); return; }
    // Criar novo agendamento: "agendar/marcar [consulta/reunião] com/para [nome] para/no dia [data/hora]"
    const newApptMatch = effectiveText.match(/\b(?:agendar|agende|marcar|marque|cria[r]?|criar|nova?|novo)\s+(?:um[a]?\s+)?(?:agendamento|consulta|reuni[ãa]o|compromisso|atendimento|hor[áa]rio)?\s*(?:com|para|pro|pra|de|do|da)\s+(.+?)\s+(?:para|pra|pro|no\s+dia|em|às|as)\s+(.+)/i);
    if (newApptMatch) { scheduleNewAppointment(newApptMatch[1].trim(), newApptMatch[2].trim()); return; }
    // Mudar data do agendamento: "mudar/alterar/remarcar agendamento de [nome] para [data]"
    const chMatch = effectiveText.match(/\b(?:mudar|alterar|trocar|remarcar|reagendar|mover|adiar)\s+(?:o\s+|a\s+)?(?:agendamento|reuniao|reunião|consulta|compromisso|hor[aá]rio)?\s*(?:de|do|da|com)?\s*(.+?)\s+(?:para|pra|pro)\s+(.+)/i);
    if (chMatch) { changeAppointmentDate(chMatch[1].trim(), chMatch[2].trim()); return; }
    // Intenção: consultar agendamentos (hoje, amanhã, semana, todos). Fica depois de criar/reagendar
    // para não engolir comandos como "reagendar o agendamento de Maria para amanhã às 15h".
    if (/\b(agendamento[s]?|agenda|compromisso[s]?|consulta[s]?)\b/.test(lower)) {
      let scope = "today";
      if (/\b(amanh[aã])\b/.test(lower)) scope = "tomorrow";
      else if (/\b(semana|pr[oó]xim[oa]s\s+dias|esta\s+semana)\b/.test(lower)) scope = "week";
      else if (/\b(tod[oa]s|todos\s+os|completa|geral|lista|listar|mostrar?\s+(?:todos|tudo))\b/.test(lower)) scope = "all";
      else if (/\b(hoje|do\s+dia|de\s+hoje|para\s+hoje|agora)\b/.test(lower)) scope = "today";
      else if (/\b(quais|qual|listar?|mostrar?|ver|me\s+(?:fala|diga|mostre))\b/.test(lower)) scope = "all";
      else scope = "today";
      reportAppointments(scope);
      return;
    }
    // Ligar para [nome]
    const callMatch = effectiveText.match(/\b(?:ligar|telefonar|chamar|ligue|telefone)\s+(?:para|pro|pra|o|a)?\s*(.+)/i);
    if (callMatch) { callClient(callMatch[1].trim()); return; }
    // Reagendar [nome] (sem data) — abre a agenda
    const reMatch = effectiveText.match(/\b(?:reagendar|remarcar|reagenda|remarca)\s+(?:com|para|o|a)?\s*(.+)/i);
    if (reMatch) { rescheduleClient(reMatch[1].trim()); return; }

    const route = matchRoute(effectiveText);
    // Comandos diretos de navegação ("abrir/ir/vai para X")
    if (route && /\b(abrir|abra|ir|vai|vá|leva|leve|navegar|abre)\b/i.test(effectiveText)) {
      navigate(route);
      const label = ROUTES.find((r) => r.to === route)?.keys[0] || "página";
      toast.success(`Abrindo ${label}`);
      speak(`Abrindo ${label}`);
      setOpen(false);
      return;
    }
    // Caso geral: pergunta ao assistente (Ollama via chat-ai)
    askOllama(effectiveText);
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
        rec.continuous = false;
        rec.interimResults = true;
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
      <div className="sr-only" data-testid="voice-orb-wrap" aria-hidden="true">
        <button
          type="button"
          onClick={() => {
            unlockSpeech();
            setOpen((v) => {
              const next = !v;
              userMinimizedRef.current = !next;
              return next;
            });
          }}
          aria-label="Assistente de voz Kênia"
          data-testid="voice-orb"
        >
          Kênia
        </button>
      </div>

      {open && (
        <div
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-72 max-w-[calc(100vw-2.5rem)] bg-white border border-nude-200 rounded-xl shadow-2xl p-4"
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
