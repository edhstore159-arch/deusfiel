import { useEffect, useState, useRef } from "react";
import { api } from "@/kenia/lib/api";
import { extractWhatsAppDigits, formatWhatsAppPhone, pickWhatsAppNumber } from "@/kenia/lib/phone";
import { Card } from "@/kenia/components/ui/card";
import { Input } from "@/kenia/components/ui/input";
import { Button } from "@/kenia/components/ui/button";
import { Badge } from "@/kenia/components/ui/badge";
import { ScrollArea } from "@/kenia/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/kenia/components/ui/avatar";
import { Separator } from "@/kenia/components/ui/separator";
import { Progress } from "@/kenia/components/ui/progress";
import { Search, Send, Phone, MoreVertical, Bot, Sparkles, Paperclip, Mail, MessageSquare, FileText, Flame, Tag, Calendar, AlertTriangle, ArrowLeft, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/kenia/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SystemReportCard from "@/kenia/components/SystemReportCard";


const URG_COLORS = {
  baixa: "bg-nude-100 text-nude-700",
  media: "bg-blue-100 text-blue-700",
  alta: "bg-gold-100 text-gold-800",
  critica: "bg-rose-100 text-rose-700",
};

const COPILOTO_JURIDICO_PROMPT = `ATUE COMO UM JUIZ FEDERAL ESPECIALISTA EM DIREITO PREVIDENCIÁRIO (RGPS), COM ATUAÇÃO TAMBÉM COMO PERITO ANALISTA DE PROVAS DOCUMENTAIS.

BASE LEGAL OBRIGATÓRIA:
EC 103/2019, Lei 8.213/91, Decreto 3.048/99, CF/88, e jurisprudência consolidada do STF e STJ.

OBJETIVO:
Entregar parecer jurídico previdenciário com precisão máxima (≈99,9%), baseado NÃO APENAS em alegações, mas também em PROVAS DOCUMENTAIS (CNIS, CTPS, PPP, etc.), com validação técnica completa e auditoria interna.

━━━━━━━━━━━━━━━━━━━━━━━
🧠 CAMADA 1 — ANÁLISE INICIAL (ENTRADA)
━━━━━━━━━━━━━━━━━━━━━━━
Identificar:
✔ Tipo de caso (aposentadoria, revisão, benefício por incapacidade etc.)
✔ Regime (RGPS ou RPPS)
✔ Se há documentos/imagens anexados

Se faltarem dados essenciais → listar exatamente o que falta; NÃO presumir dados críticos.

━━━━━━━━━━━━━━━━━━━━━━━
📄 CAMADA 2 — MODO ANÁLISE DOCUMENTAL (PERITO)
━━━━━━━━━━━━━━━━━━━━━━━
SE HOUVER DOCUMENTOS OU IMAGENS:
1. IDENTIFICAR: CNIS, CTPS, PPP, LTCAT, Carta de concessão, Extratos.
2. EXTRAIR: vínculos empregatícios (empresa, datas), salários de contribuição, períodos de contribuição, períodos sem contribuição, indicadores (vínculos extemporâneos, pendências).
3. VALIDAR PROVA: consistência interna; detectar vínculos faltando, salários divergentes, períodos não computados, erros do INSS; cruzar CNIS x CTPS e CNIS x PPP.
4. IMAGEM: verificar legibilidade; alertar risco de OCR; NÃO assumir dados ilegíveis; pedir confirmação se houver dúvida.
5. RESULTADO: tempo total validado; tempo reconhecido vs real; erros encontrados; possibilidade de revisão.

━━━━━━━━━━━━━━━━━━━━━━━
⚖️ CAMADA 3 — FUNDAMENTAÇÃO JURÍDICA
━━━━━━━━━━━━━━━━━━━━━━━
Aplicar: regra permanente; TODAS as transições (pontos, idade progressiva, pedágio 50%, pedágio 100%); direito adquirido; aposentadoria especial; professor; incapacidade permanente. Diferenciar antes/depois EC 103 e RGPS x RPPS. Explicar cálculo: média de 100% dos salários desde 07/1994; coeficiente 60% + 2% por ano excedente.

━━━━━━━━━━━━━━━━━━━━━━━
📊 CAMADA 4 — ANÁLISE ESTRATÉGICA
━━━━━━━━━━━━━━━━━━━━━━━
Obrigatório: melhor regra aplicável; quando aposentar; se vale esperar; cenários Melhor / Intermediário / Pior; impacto financeiro estimado.

━━━━━━━━━━━━━━━━━━━━━━━
🚨 CAMADA 5 — MODO AUDITOR (ANTI-ERRO)
━━━━━━━━━━━━━━━━━━━━━━━
Antes de entregar, executar:
🔍 Tabelas: idade progressiva e pontuação por ano corretas.
🔍 Matemática: soma idade+tempo, tempo de contribuição, coeficiente.
🔍 Legal: regra correta; sem mistura de regimes.
🔍 Erros clássicos: 15 vs 20 anos; conversão especial pós-2019 vedada; direito adquirido; tabelas.
🔍 Consistência final: conclusão compatível; datas coerentes.
🚫 SE QUALQUER ERRO → REFAZER A RESPOSTA AUTOMATICAMENTE.

━━━━━━━━━━━━━━━━━━━━━━━
⚖️ CAMADA 6 — TESE JURÍDICA
━━━━━━━━━━━━━━━━━━━━━━━
Incluir tese aplicável, interpretação dominante e controvérsias relevantes, sem inventar precedentes.

━━━━━━━━━━━━━━━━━━━━━━━
📑 CAMADA 7 — ESTRUTURA FINAL
━━━━━━━━━━━━━━━━━━━━━━━
A resposta DEVE conter, nesta ordem:
1. Relatório
2. Análise documental (se houver)
3. Fundamentação jurídica
4. Comparação entre regras
5. Análise prática
6. Conclusão
7. Diligências
8. Resumo leigo

━━━━━━━━━━━━━━━━━━━━━━━
🧾 CAMADA 8 — CERTIFICAÇÃO FINAL
━━━━━━━━━━━━━━━━━━━━━━━
Encerre com o bloco literal:
> ✔ Resposta auditada internamente
> ✔ Documentos analisados tecnicamente
> ✔ Cálculos conferidos
> ✔ Sem inconsistências relevantes

Se houver limitação, substitua a linha correspondente por "⚠ Limitação: <descrição>".

🎯 OBJETIVO FINAL: atuar simultaneamente como Juiz (decide), Advogado (estratégia), Perito (analisa prova) e Auditor (corrige erros), com precisão máxima e confiabilidade profissional. Linguagem formal, técnica, impessoal. Sem saudações e sem promessas absolutas. Para consultas fora do previdenciário (Civil, Trabalhista, Consumidor, Família, Tributário, Empresarial, Criminal), mantenha o mesmo rigor com auditoria interna e certificação final equivalentes.`;



export default function Dashboard() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [leadForContact, setLeadForContact] = useState(null);
  const [caseAnalysisForContact, setCaseAnalysisForContact] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [draft, setDraft] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const AI_WELCOME = { role: "assistant", content: "Olá! Sou o copiloto jurídico. Posso te ajudar a redigir uma resposta para o cliente, sugerir próximos passos do caso ou pesquisar precedentes. Como posso ajudar?" };
  const [aiSession, setAiSession] = useState(() => {
    try { return localStorage.getItem("kenia:dashboard-ai-session") || null; } catch { return null; }
  });
  const [aiMessages, setAiMessages] = useState(() => {
    try {
      const raw = localStorage.getItem("kenia:dashboard-ai-messages");
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
    return [AI_WELCOME];
  });
  const [aiThinking, setAiThinking] = useState(false);
  const [trainingStats, setTrainingStats] = useState(() => {
    try {
      const raw = localStorage.getItem("legal-training:state");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.stats || null;
    } catch { return null; }
  });
  const AI_AGENTS = [
    { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    { id: "openai/gpt-5-mini", label: "ChatGPT" },
    { id: "openai/gpt-5.5", label: "ChatGPT Pro" },
  ];
  const [aiAgent, setAiAgent] = useState(() => {
    try { return localStorage.getItem("kenia:dashboard-ai-agent") || "claude-3-5-sonnet-20241022"; } catch { return "claude-3-5-sonnet-20241022"; }
  });
  const changeAiAgent = (m) => {
    setAiAgent(m);
    try { localStorage.setItem("kenia:dashboard-ai-agent", m); } catch {}
  };

  useEffect(() => {
    try { localStorage.setItem("kenia:dashboard-ai-messages", JSON.stringify(aiMessages)); } catch {}
  }, [aiMessages]);
  useEffect(() => {
    try {
      if (aiSession) localStorage.setItem("kenia:dashboard-ai-session", aiSession);
    } catch {}
  }, [aiSession]);
  const [search, setSearch] = useState("");
  const [whatsAppCenter, setWhatsAppCenter] = useState({ connected: false, phone: "" });
  const aiBoxRef = useRef(null);

  const messageCacheKey = (cid) => `kenia:whatsapp-messages:${cid}`;
  const readCachedMessages = (cid) => {
    try {
      const cached = JSON.parse(localStorage.getItem(messageCacheKey(cid)) || "[]");
      return Array.isArray(cached) ? cached : [];
    } catch {
      return [];
    }
  };
  const persistCachedMessages = (cid, list) => {
    try { localStorage.setItem(messageCacheKey(cid), JSON.stringify(list)); } catch {}
  };
  const stableMessageId = (contact, msg) => {
    const rawId = msg?.id || msg?.provider_message_id || msg?.key?.id;
    if (rawId) return String(rawId);
    const signature = [
      contact?.id || "sem-contato",
      msg?.from_me ? "enviada" : "recebida",
      msg?.created_at || msg?.timestamp || "sem-data",
      msg?.text || msg?.message || msg?.body || msg?.content || "",
    ].join("|");
    let hash = 0;
    for (let i = 0; i < signature.length; i += 1) hash = ((hash << 5) - hash + signature.charCodeAt(i)) | 0;
    return `sig-${Math.abs(hash).toString(36)}`;
  };
  const getAuthenticatedUserId = async () => {
    if (user?.id) return user.id;
    const { data } = await supabase.auth.getUser().catch(() => ({ data: null }));
    return data?.user?.id || null;
  };

  const loadPersistedWhatsAppMessages = async (contact) => {
    if (!contact?.id) return [];
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("id,contact_id,contact_name,contact_phone,text,from_me,provider_message_id,created_at")
        .eq("contact_id", String(contact.id))
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) {
        console.warn("Não foi possível carregar mensagens salvas do atendimento:", error.message);
        return [];
      }
      return (data || []).map((row) => ({
        id: row.provider_message_id || `saved-${row.id}`,
        text: row.text,
        from_me: Boolean(row.from_me),
        created_at: row.created_at,
        saved_in_platform: true,
      }));
    } catch {
      return [];
    }
  };
  const loadPersistedWhatsAppContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("contact_id,contact_name,contact_phone,text,from_me,created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) {
        console.warn("Não foi possível carregar contatos salvos do atendimento:", error.message);
        return [];
      }

      const byContact = new Map();
      for (const row of data || []) {
        const id = String(row.contact_id || row.contact_phone || "").trim();
        if (!id) continue;
        const current = byContact.get(id);
        if (!current) {
          const phone = row.contact_phone || row.contact_id || "";
          byContact.set(id, {
            id,
            name: row.contact_name || formatWhatsAppPhone(phone) || "Cliente",
            phone,
            last_message: row.text || "",
            last_message_at: row.created_at || new Date().toISOString(),
            unread: row.from_me ? 0 : 1,
            avatar_color: "bg-gold-600",
            saved_in_platform: true,
          });
        } else if (!row.from_me) {
          current.unread = Number(current.unread || 0) + 1;
        }
      }
      return Array.from(byContact.values());
    } catch {
      return [];
    }
  };
  const savePersistedWhatsAppMessage = async (contact, msg) => {
    if (!contact?.id || !msg?.text) return;
    try {
      const userId = await getAuthenticatedUserId();
      if (!userId) {
        console.warn("Mensagem do atendimento não salva: usuário autenticado não encontrado.");
        return;
      }
      const { error } = await supabase.from("whatsapp_messages").upsert({
        user_id: userId,
        contact_id: String(contact.id),
        contact_name: contact.name || null,
        contact_phone: contact.phone || null,
        text: msg.text,
        from_me: Boolean(msg.from_me),
        provider_message_id: stableMessageId(contact, msg),
        created_at: msg.created_at || new Date().toISOString(),
      }, { onConflict: "user_id,contact_id,provider_message_id" });
      if (error) console.warn("Não foi possível salvar a mensagem do atendimento:", error.message);
    } catch {}
  };
  const dedupeMessages = (list = []) => {
    const seen = new Set();
    const unique = [];
    for (const raw of list || []) {
      const m = {
        ...raw,
        text: raw?.text ?? raw?.message ?? raw?.body ?? raw?.content ?? "",
        created_at: raw?.created_at || raw?.timestamp || new Date().toISOString(),
      };
      const key = m.provider_message_id || m.id || `${m.from_me ? "1" : "0"}|${m.created_at}|${m.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(m);
    }
    return unique.sort((a, b) => new Date(a.created_at || a.timestamp || 0) - new Date(b.created_at || b.timestamp || 0));
  };

  useEffect(() => {
    loadContacts();
    loadMetrics();
    loadAppointments();
    loadWhatsAppCenter();
  }, []);

  useEffect(() => {
    if (activeContact) {
      loadMessages(activeContact);
      loadLeadForContact(activeContact.phone);
      loadCaseAnalysisForContact(activeContact);
    }
  }, [activeContact]);

  useEffect(() => {
    if (aiBoxRef.current) aiBoxRef.current.scrollTop = aiBoxRef.current.scrollHeight;
  }, [aiMessages]);

  // Auto-refresh every 3s — fast enough to feel real-time
  useEffect(() => {
    const t = setInterval(() => {
      loadContacts();
      loadAppointments();
      loadWhatsAppCenter();
      if (activeContact) loadMessages(activeContact);
      if (activeContact) loadCaseAnalysisForContact(activeContact);
    }, 3000);
    return () => clearInterval(t);
  }, [activeContact]);


  const loadContacts = async () => {
    try {
      const [{ data }, persistedContacts] = await Promise.all([
        api.get("/whatsapp/contacts").catch(() => ({ data: [] })),
        loadPersistedWhatsAppContacts(),
      ]);
      // Mescla contatos vindos do backend com os contatos reais já salvos no Supabase.
      // Assim conversas novas, como a do Erick, aparecem no dashboard mesmo quando
      // o backend do WhatsApp ainda não devolveu a lista atualizada de contatos.
      const seen = new Set();
      const unique = [];
      for (const c of [...(persistedContacts || []), ...(data || [])]) {
        const key = c.id || (c.phone || "").replace(/\D/g, "");
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push({
          ...c,
          name: c.name || "Cliente",
          phone: c.phone || c.id,
          last_message: c.last_message || "",
          last_message_at: c.last_message_at || new Date().toISOString(),
          unread: Number(c.unread || 0),
        });
      }
      // Sort by last_message_at DESC so newest conversations bubble up
      const sorted = unique.sort((a, b) => {
        const ta = a.last_message_at || "";
        const tb = b.last_message_at || "";
        return tb.localeCompare(ta);
      });
      setContacts(sorted);
      if (sorted.length > 0 && !activeContact) setActiveContact(sorted[0]);
    } catch {
      // silenciar erro no refresh automatico para nao spam toast
    }
  };

  const loadMessages = async (contactOrCid) => {
    const contact = typeof contactOrCid === "object" ? contactOrCid : activeContact;
    const cid = typeof contactOrCid === "object" ? contactOrCid?.id : contactOrCid;
    if (!cid) return;
    try {
      const [{ data }, persisted] = await Promise.all([
        api.get(`/whatsapp/messages/${cid}`).catch(() => ({ data: [] })),
        loadPersistedWhatsAppMessages(contact),
      ]);
      const cached = readCachedMessages(cid);
      const unique = dedupeMessages([...(cached || []), ...(persisted || []), ...(data || [])]);
      persistCachedMessages(cid, unique);
      if (contact) {
        Promise.allSettled(unique.map((msg) => savePersistedWhatsAppMessage(contact, msg))).catch(() => {});
      }
      setMessages(unique);
    } catch {
      setMessages(dedupeMessages(readCachedMessages(cid)));
    }
  };

  const loadMetrics = async () => {
    try {
      const { data } = await api.get("/dashboard/metrics");
      setMetrics(data);
    } catch {}
  };

  const loadAppointments = async () => {
    try {
      const { data } = await api.get("/appointments");
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const now = Date.now();
      const withDate = list.filter((a) => a?.starts_at);
      const upcoming = withDate
        .filter((a) => new Date(a.starts_at).getTime() >= now - 60 * 60 * 1000)
        .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
      const recent = withDate
        .slice()
        .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
      setAppointments(upcoming.length ? upcoming : recent);
    } catch (err) {
      console.warn("[Dashboard] loadAppointments error:", err?.message || err);
    }
  };

  const loadWhatsAppCenter = async () => {
    try {
      const [{ data: cfg }, { data: status }] = await Promise.all([
        api.get("/whatsapp/config").catch(() => ({ data: null })),
        api.get("/whatsapp/baileys/status").catch(() => ({ data: null })),
      ]);
      const digits = pickWhatsAppNumber(status, cfg);
      setWhatsAppCenter({
        connected: Boolean(status?.connected || digits),
        phone: digits,
      });
    } catch {
      setWhatsAppCenter({ connected: false, phone: "" });
    }
  };

  const loadLeadForContact = async (phone) => {
    try {
      const { data } = await api.get("/leads");
      const digits = (phone || "").replace(/\D/g, "");
      const match = data.find((l) => (l.phone || "").replace(/\D/g, "").includes(digits.slice(-8)));
      setLeadForContact(match || null);
    } catch {
      setLeadForContact(null);
    }
  };

  const loadCaseAnalysisForContact = async (contact) => {
    if (!contact) return;
    try {
      const phoneDigits = extractWhatsAppDigits(contact.phone || contact.id || "");
      const phoneTail = phoneDigits.length >= 8 ? phoneDigits.slice(-8) : "";
      const { data } = await api.get("/admin/case-analyses");
      const items = Array.isArray(data?.items) ? data.items : [];
      const match = items.find((item) => {
        const sessionDigits = extractWhatsAppDigits(item.session_id || "");
        const visitorDigits = extractWhatsAppDigits(item.visitor_phone || "");
        return (
          (contact.id && String(item.session_id || "") === String(contact.id)) ||
          (phoneTail && (sessionDigits.endsWith(phoneTail) || visitorDigits.endsWith(phoneTail)))
        );
      });
      setCaseAnalysisForContact(match || null);
    } catch {
      setCaseAnalysisForContact(null);
    }
  };

  const sendWhatsApp = async () => {
    if (!draft.trim() || !activeContact) return;
    const textToSend = draft.trim();
    const localMsg = { id: `local-${Date.now()}`, text: textToSend, from_me: true, created_at: new Date().toISOString(), pending_local: true };
    try {
      const { data } = await api.post("/whatsapp/send", {
        contact_id: activeContact.id,
        contact_phone: activeContact.phone,
        phone: activeContact.phone,
        text: textToSend,
      });
      // Backend retorna {message, provider_result} — extrai a mensagem pura
      const msg = data?.message || (data?.text || data?.body || data?.content ? data : null) || localMsg;
      const finalMsg = { ...localMsg, ...msg, text: msg.text ?? msg.message ?? msg.body ?? msg.content ?? textToSend, from_me: true, pending_local: false };
      persistCachedMessages(activeContact.id, dedupeMessages([...readCachedMessages(activeContact.id), finalMsg]));
      await savePersistedWhatsAppMessage(activeContact, finalMsg);
      setMessages((prev) => {
        const next = dedupeMessages([...prev, finalMsg]);
        persistCachedMessages(activeContact.id, next);
        return next;
      });
      setDraft("");
      loadContacts();
      // Recarrega mensagens do servidor em 1s para pegar resposta do bot
      setTimeout(() => activeContact && loadMessages(activeContact), 1200);
    } catch (e) {
      const detail = e?.response?.data?.error || e?.message || "Erro ao enviar";
      toast.error(detail);
    }
  };

  const sendCopilotWhatsApp = async (contact, text) => {
    if (!contact || !text) return false;
    const localMsg = { id: `local-${Date.now()}`, text, from_me: true, created_at: new Date().toISOString(), pending_local: true };
    try {
      const { data } = await api.post("/whatsapp/send", {
        contact_id: contact.id, contact_phone: contact.phone, phone: contact.phone, text,
      });
      const msg = data?.message || localMsg;
      const finalMsg = { ...localMsg, ...msg, text: msg.text ?? msg.message ?? text, from_me: true, pending_local: false };
      try { await savePersistedWhatsAppMessage(contact, finalMsg); } catch {}
      if (activeContact && activeContact.id === contact.id) {
        setMessages((prev) => dedupeMessages([...prev, finalMsg]));
      }
      loadContacts();
      return true;
    } catch (e) {
      toast.error(e?.response?.data?.error || "Falha ao enviar pelo WhatsApp");
      return false;
    }
  };

  const findContactByName = (name) => {
    const n = (name || "").trim().toLowerCase();
    if (!n) return null;
    return contacts.find((c) => (c.name || "").toLowerCase().includes(n)) || null;
  };

  const askAI = async () => {
    if (!aiPrompt.trim()) return;
    const userMsg = { role: "user", content: aiPrompt };
    setAiMessages((m) => [...m, userMsg]);
    const prompt = aiPrompt;
    setAiPrompt("");

    // Detecta comando de envio direto pelo copiloto
    const sendCmd = prompt.match(/\b(?:envie|enviar|mande|mandar|manda|envia)\s+(?:uma\s+)?(?:mensagem|whats?app|zap)\s+(?:para|pro|pra|ao|a)\s+(.+?)\s+(?:dizendo|falando|com\s+a\s+mensagem|que|:)\s+(.+)/i);
    if (sendCmd) {
      const target = findContactByName(sendCmd[1]) || activeContact;
      const text = sendCmd[2].trim().replace(/^["'`]|["'`]$/g, "");
      if (!target) {
        setAiMessages((m) => [...m, { role: "assistant", content: `Não encontrei o contato "${sendCmd[1]}" na Central de Mensagens. Abra a conversa primeiro ou diga o nome exato.` }]);
        return;
      }
      const ok = await sendCopilotWhatsApp(target, text);
      setAiMessages((m) => [...m, { role: "assistant", content: ok ? `✅ Mensagem enviada para ${target.name} via Central de Mensagens: "${text}"` : `❌ Não consegui enviar para ${target.name}.` }]);
      return;
    }

    // Envio rápido para o contato ativo: "envie agora", "envie essa", "manda essa"
    const sendActive = prompt.match(/\b(?:envie|enviar|mande|mandar|manda|envia)\s+(?:agora|essa|isso|esta\s+mensagem|para\s+(?:o|a)\s+cliente)\s*:?\s*(.*)/i);
    if (sendActive && activeContact) {
      const text = (sendActive[1] || "").trim().replace(/^["'`]|["'`]$/g, "");
      const lastAi = [...aiMessages].reverse().find((m) => m.role === "assistant" && m.content);
      const toSend = text || lastAi?.content || "";
      if (toSend) {
        const ok = await sendCopilotWhatsApp(activeContact, toSend);
        setAiMessages((m) => [...m, { role: "assistant", content: ok ? `✅ Enviado para ${activeContact.name}.` : `❌ Falha ao enviar.` }]);
        return;
      }
    }

    setAiThinking(true);
    try {
      const contextual = activeContact
        ? `Cliente: ${activeContact.name}. Última mensagem: "${activeContact.last_message}". Pergunta do advogado: ${prompt}\n\nIMPORTANTE: Se o advogado pedir para enviar mensagem, ele pode usar comandos como "envie mensagem para [nome] dizendo [texto]" ou "envie agora" para enviar pelo WhatsApp.`
        : prompt;
      const { data } = await api.post("/chat/message", {
        message: contextual,
        session_id: activeContact?.id || activeContact?.phone || aiSession,
        user_id: user?.id || null,
        visitor_name: activeContact?.name || null,
        visitor_phone: activeContact?.phone || null,
        want_audio: false,
        model: aiAgent,
        return_analysis: true,
        system_prompt: COPILOTO_JURIDICO_PROMPT,
      });
      setAiSession(data.session_id);
      setAiMessages((m) => [...m, {
        role: "assistant",
        content: data.response,
        audio_base64: data.audio_base64,
        analysis: data.analysis,
        ai_provider: data.ai_provider,
        ai_model: data.ai_model,
      }]);
      // Aplica a análise da IA aos dados do cliente (leadForContact)
      if (data.analysis && activeContact) {
        try {
          const a = data.analysis;
          const urgency = a.acertividade >= 80 ? "alta" : a.acertividade >= 50 ? "media" : "baixa";
          const stageMap = { qualificado: "qualificado", nao_qualificado: "nao_interessado", necessita_mais_info: "em_contato" };
          const patch = {
            case_type: a.area || leadForContact?.case_type || "Atendimento jurídico",
            description: a.resumo || leadForContact?.description || prompt,
            score: Math.round(Number(a.acertividade) || leadForContact?.score || 50),
            urgency,
            stage: stageMap[a.qualificacao] || leadForContact?.stage || "em_contato",
            tags: a.fundamentos?.slice(0, 4) || leadForContact?.tags || [],
            source: leadForContact?.source || "Chat IA",
            name: activeContact.name,
            phone: activeContact.phone,
          };
          if (leadForContact?.id) {
            await api.patch(`/leads/${leadForContact.id}`, patch);
          } else {
            await api.post("/leads", patch);
          }
          loadLeadForContact(activeContact.phone);
          setCaseAnalysisForContact({
            id: `case-${String(activeContact.id || activeContact.phone).replace(/[^a-zA-Z0-9_-]+/g, "-")}`,
            session_id: activeContact.id || activeContact.phone,
            visitor_name: activeContact.name,
            visitor_phone: activeContact.phone,
            ...data.analysis,
          });
          setTimeout(() => loadCaseAnalysisForContact(activeContact), 800);
        } catch (err) {
          console.error("Falha ao atualizar lead com análise da IA:", err);
        }
      }
      // Auto-play audio
      if (data.audio_base64) {
        try {
          const a = new Audio(`data:audio/mpeg;base64,${data.audio_base64}`);
          a.play().catch(() => {});
        } catch {}
      }

    } catch {
      setAiMessages((m) => [...m, { role: "assistant", content: "Desculpe, não consegui processar agora." }]);
    } finally {
      setAiThinking(false);
    }
  };

  const playMessageAudio = (b64) => {
    if (!b64) return;
    try {
      const a = new Audio(`data:audio/mpeg;base64,${b64}`);
      a.play().catch(() => {});
    } catch {}
  };

  const applyAIReply = (text) => {
    setDraft(text);
    toast.success("Resposta copiada para o WhatsApp");
  };

  const filtered = contacts.filter(c =>
    (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );

  const initials = (name) => name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const centerPhoneLabel = whatsAppCenter.phone ? formatWhatsAppPhone(whatsAppCenter.phone) : "Número não identificado";

  return (
    <div className="h-screen flex flex-col bg-background" data-testid="dashboard-page">
      {/* Header */}
      <div className="px-8 py-5 bg-card border-b border-nude-200 flex items-center justify-between shrink-0">
        <div>
          <div className="overline text-gold-600">Atendimento</div>
          <h1 className="font-serif text-3xl text-nude-900 mt-1 tracking-tight">Central de Mensagens</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-gold-50 text-gold-700 hover:bg-gold-50 border border-gold-200 gap-1.5 px-3 py-1.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse-soft" /> {whatsAppCenter.connected ? "WhatsApp conectado" : "WhatsApp"}
          </Badge>
          <Badge variant="outline" className="border-nude-200 bg-white text-nude-700 px-3 py-1.5 rounded-full font-mono">
            Central: {centerPhoneLabel}
          </Badge>
        </div>
      </div>

      <SystemReportCard />

      {/* Training Stats Widget */}
      {trainingStats && (trainingStats.lawyer?.total > 0 || trainingStats.judge?.total > 0) && (
        <div className="px-8 py-3 bg-card border-b border-nude-200 flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-gold-600" />
            <span className="text-xs font-semibold text-nude-800">Treinamento Jurídico</span>
          </div>
          {trainingStats.lawyer?.total > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Advogados:</span>
              <Badge variant="secondary" className="text-[10px]">{Math.round((trainingStats.lawyer.passed / trainingStats.lawyer.total) * 100)}% acerto</Badge>
              <span className="text-[10px] text-muted-foreground">({trainingStats.lawyer.total} casos)</span>
            </div>
          )}
          {trainingStats.judge?.total > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Juízes:</span>
              <Badge variant="secondary" className="text-[10px]">{Math.round((trainingStats.judge.passed / trainingStats.judge.total) * 100)}% acerto</Badge>
              <span className="text-[10px] text-muted-foreground">({trainingStats.judge.total} casos)</span>
            </div>
          )}
          <a href="/app/legal-training" className="text-[10px] text-gold-600 hover:text-gold-800 ml-auto">Abrir Treinamento →</a>
        </div>
      )}


      {/* 3-column layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* LEFT - WhatsApp Contacts */}
        <Card className={`${activeContact ? "hidden md:flex" : "flex"} md:col-span-4 lg:col-span-3 flex-col overflow-hidden border-nude-200`} data-testid="whatsapp-panel">
          <div className="p-4 border-b border-nude-200">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-gold-600" />
              <h2 className="font-display font-semibold text-sm">WhatsApp</h2>
              <Badge variant="secondary" className="ml-auto text-xs">{contacts.length}</Badge>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nude-400" />
              <Input
                placeholder="Buscar contato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
                data-testid="contact-search"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveContact(c)}
                data-testid={`whatsapp-contact-item-${c.id}`}
                className={`w-full text-left px-4 py-3 border-b border-nude-100 hover:bg-nude-50 transition-colors flex items-start gap-3 ${
                  activeContact?.id === c.id ? "bg-gold-50" : ""
                }`}
              >
                <Avatar className={`w-10 h-10 ${c.avatar_color || "bg-nude-500"}`}>
                  {(c.profile_pic_url || c.picture || c.avatar_url) && (
                    <AvatarImage src={c.profile_pic_url || c.picture || c.avatar_url} alt={c.name} />
                  )}
                  <AvatarFallback className="bg-transparent text-white text-xs font-semibold">
                    {initials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm text-nude-900 truncate">{c.name}</div>
                    {c.unread > 0 && (
                      <Badge className="bg-gold-600 hover:bg-gold-600 text-white h-5 min-w-[20px] px-1.5 text-[10px]">
                        {c.unread}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-nude-500 truncate mt-0.5">{c.last_message}</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-nude-500">Nenhum contato encontrado</div>
            )}
          </ScrollArea>
        </Card>

        {/* CENTER - Active Chat + AI */}
        <Card className={`${activeContact ? "flex" : "hidden md:flex"} md:col-span-8 lg:col-span-6 flex-col overflow-hidden border-nude-200`} data-testid="chat-panel">
          {activeContact ? (
            <>
              <div className="px-5 py-3 border-b border-nude-200 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:hidden"
                  onClick={() => setActiveContact(null)}
                  data-testid="back-to-contacts"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className={`w-9 h-9 ${activeContact.avatar_color}`}>
                  {(activeContact.profile_pic_url || activeContact.picture || activeContact.avatar_url) && (
                    <AvatarImage src={activeContact.profile_pic_url || activeContact.picture || activeContact.avatar_url} alt={activeContact.name} />
                  )}
                  <AvatarFallback className="bg-transparent text-white text-xs font-semibold">
                    {initials(activeContact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{activeContact.name}</div>
                  <div className="text-xs text-nude-500">{formatWhatsAppPhone(activeContact.phone)}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={`tel:+${extractWhatsAppDigits(activeContact.phone)}`} aria-label="Telefonar">
                    <Phone className="w-4 h-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
              </div>

              {/* WhatsApp messages */}
              <ScrollArea className="flex-1 px-5 py-4 bg-nude-50/50">
                <div className="space-y-3">
                  {messages.map((m) => {
                    const urlMatch = /(https?:\/\/[^\s]+)/i.exec(m.text || "");
                    const url = urlMatch ? urlMatch[1] : null;
                    const isImage = url && /\.(png|jpe?g|webp|gif|heic)(\?|$)/i.test(url);
                    return (
                      <div key={m.id} className={`flex ${m.from_me ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] px-3.5 py-2 ${m.from_me ? "bubble-out" : "bubble-in"}`}>
                          <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
                          {url && (
                            <div className="mt-2">
                              {isImage ? (
                                <a href={url} target="_blank" rel="noreferrer">
                                  <img src={url} alt="anexo" className="max-h-52 rounded-md border border-nude-200" />
                                </a>
                              ) : (
                                <a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium text-gold-700 underline">
                                  Abrir arquivo
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-center text-xs text-nude-400 py-8">Nenhuma mensagem ainda</div>
                  )}
                </div>
              </ScrollArea>

              {/* WhatsApp input */}
              <div className="p-3 border-t border-nude-200 bg-white">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9"><Paperclip className="w-4 h-4" /></Button>
                  <Input
                    placeholder="Mensagem..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendWhatsApp()}
                    data-testid="whatsapp-input"
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={sendWhatsApp}
                    className="h-9 w-9 bg-gold-600 hover:bg-gold-700"
                    data-testid="whatsapp-send-btn"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* AI Copilot */}
              <div className="bg-nude-50 p-4 max-h-72 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-nude-900 grid place-items-center">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="font-display font-semibold text-sm">Copiloto Jurídico IA</h3>
                  <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                </div>
                <ScrollArea className="flex-1 mb-2" ref={aiBoxRef}>
                  <div className="space-y-2 pr-3">
                    {aiMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-md text-sm ${
                          m.role === "user" ? "bg-nude-900 text-white" : "bg-white border border-nude-200"
                        }`}>
                          <div className="whitespace-pre-wrap">{m.content}</div>
                          {m.role === "assistant" && i > 0 && (
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <button
                                onClick={() => applyAIReply(m.content)}
                                className="text-xs text-gold-600 hover:text-gold-700 font-medium"
                                data-testid={`use-ai-reply-${i}`}
                              >
                                ↗ Usar resposta
                              </button>
                              {m.audio_base64 && (
                                <button
                                  onClick={() => playMessageAudio(m.audio_base64)}
                                  className="text-xs text-nude-700 hover:text-nude-900 font-medium inline-flex items-center gap-1"
                                  data-testid={`play-ai-audio-${i}`}
                                >
                                  🔊 Ouvir
                                </button>
                              )}
                              {m.analysis && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold-100 text-gold-800 font-semibold">
                                  Acertividade {m.analysis.acertividade}% · {m.analysis.qualificacao === "qualificado" ? "✓ Qualificado" : m.analysis.qualificacao === "nao_qualificado" ? "✗ Não Qualif." : "+ info"}
                                </span>
                              )}
                              {m.ai_provider && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-nude-100 text-nude-700 font-semibold">
                                  {m.ai_provider}{m.ai_model ? ` · ${m.ai_model}` : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {aiThinking && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-nude-200 rounded-md px-3 py-2 text-sm text-nude-500">
                          <span className="animate-pulse-soft">Pensando...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className="text-[10px] text-nude-500 self-center mr-1">Agente IA:</span>
                  {AI_AGENTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => changeAiAgent(a.id)}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium border transition ${
                        aiAgent === a.id
                          ? "bg-nude-900 text-white border-nude-900"
                          : "bg-white text-nude-700 border-nude-200 hover:bg-nude-50"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Pergunte ao copiloto..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && askAI()}
                    className="h-9"
                    data-testid="ai-prompt-input"
                  />
                  <Button
                    size="sm"
                    onClick={askAI}
                    disabled={aiThinking}
                    className="bg-nude-900 hover:bg-nude-800"
                    data-testid="ai-send-btn"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Pedir
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-nude-400 text-sm">Selecione um contato</div>
          )}
        </Card>

        {/* RIGHT - Client Data */}
        <Card className="hidden lg:flex lg:col-span-3 flex-col overflow-hidden border-nude-200" data-testid="client-panel">
          <div className="p-4 border-b border-nude-200">
            <h2 className="font-display font-semibold text-sm">Dados do Cliente</h2>
          </div>
          {!activeContact && (
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                <div>
                  <div className="text-xs tracking-widest uppercase font-semibold text-nude-500 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-gold-600" /> Próximas reuniões (Meet)
                  </div>
                  {appointments.length === 0 ? (
                    <div className="text-xs text-nude-400">Nenhum agendamento futuro.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {appointments.slice(0, 6).map((a) => {
                        const link = a.meeting_link || a.meet_url;
                        const when = new Date(a.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
                        return (
                          <div key={a.id} className="p-2 bg-gold-50 border border-gold-200 rounded-md text-xs">
                            <div className="font-medium text-nude-900 truncate">{a.client_name || a.title || "Reunião"}</div>
                            <div className="text-nude-600 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" /> {when} • {a.duration_min || 60} min
                            </div>
                            {link && (
                              <a href={link} target="_blank" rel="noreferrer" className="text-gold-700 hover:underline truncate block mt-1">
                                🔗 Entrar no Meet
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
          {activeContact ? (
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                <div className="text-center">
                  <Avatar className={`w-16 h-16 mx-auto ${activeContact.avatar_color}`}>
                    {(activeContact.profile_pic_url || activeContact.picture || activeContact.avatar_url) && (
                      <AvatarImage src={activeContact.profile_pic_url || activeContact.picture || activeContact.avatar_url} alt={activeContact.name} />
                    )}
                    <AvatarFallback className="bg-transparent text-white text-lg font-semibold">
                      {initials(activeContact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-display font-semibold text-base mt-3">{activeContact.name}</div>
                  <div className="text-xs text-nude-500 mt-0.5">{formatWhatsAppPhone(activeContact.phone)}</div>
                </div>

                {appointments.length > 0 && (
                  <div>
                    <div className="text-xs tracking-widest uppercase font-semibold text-nude-500 mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-gold-600" /> Próximas reuniões (Meet)
                    </div>
                    <div className="space-y-1.5">
                      {appointments.slice(0, 4).map((a) => {
                        const link = a.meeting_link || a.meet_url;
                        const when = new Date(a.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
                        return (
                          <div key={a.id} className="p-2 bg-gold-50 border border-gold-200 rounded-md text-xs">
                            <div className="font-medium text-nude-900 truncate">{a.client_name || a.title || "Reunião"}</div>
                            <div className="text-nude-600 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" /> {when} • {a.duration_min || 60} min
                            </div>
                            {link && (
                              <a href={link} target="_blank" rel="noreferrer" className="text-gold-700 hover:underline truncate block mt-1">
                                🔗 Entrar no Meet
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {metrics?.alerts?.upcoming_hearings?.length > 0 && (
                  <div>
                    <div className="text-xs tracking-widest uppercase font-semibold text-nude-500 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-gold-600" /> Prazos próximos
                    </div>
                    <div className="space-y-1.5">
                      {metrics.alerts.upcoming_hearings.slice(0, 3).map((h) => (
                        <div key={h.process_id} className="p-2 bg-gold-50 border border-gold-200 rounded-md text-xs">
                          <div className="font-medium text-nude-900 truncate">{h.client_name}</div>
                          <div className="text-nude-600 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> {h.days_left === 0 ? "Hoje" : `${h.days_left}d`} • {h.case_type}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  {caseAnalysisForContact && (
                    <div className="rounded-xl border border-gold-200 bg-gold-50/60 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs tracking-widest uppercase font-semibold text-gold-800 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> Análise em tempo real
                        </div>
                        <Badge className="bg-white text-gold-800 border border-gold-200 hover:bg-white">
                          {caseAnalysisForContact.qualificacao === "qualificado" ? "Qualificado" : caseAnalysisForContact.qualificacao === "nao_qualificado" ? "Não qualificado" : "Precisa de info"}
                        </Badge>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-nude-700 mb-1">
                          <span>Acertividade do caso</span>
                          <span className="font-semibold">{Math.round(Number(caseAnalysisForContact.acertividade) || 0)}%</span>
                        </div>
                        <Progress value={Math.round(Number(caseAnalysisForContact.acertividade) || 0)} className="h-2" />
                      </div>
                      <Field label="Área analisada" value={caseAnalysisForContact.area || "Em análise"} />
                      {caseAnalysisForContact.resumo && (
                        <div>
                          <div className="text-xs text-nude-500 mb-1">Resumo da análise</div>
                          <div className="text-xs text-nude-700 bg-white/80 border border-gold-100 rounded-md p-2">
                            {caseAnalysisForContact.resumo}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-white/80 border border-gold-100 rounded-md p-1.5">
                          <div className="text-nude-500">Probabilidade</div>
                          <div className="font-semibold text-nude-800">{caseAnalysisForContact.probabilidade_exito || "—"}</div>
                        </div>
                        <div className="bg-white/80 border border-gold-100 rounded-md p-1.5">
                          <div className="text-nude-500">Complexidade</div>
                          <div className="font-semibold text-nude-800">{caseAnalysisForContact.complexidade || "—"}</div>
                        </div>
                        <div className="bg-white/80 border border-gold-100 rounded-md p-1.5">
                          <div className="text-nude-500">Potencial financeiro</div>
                          <div className="font-semibold text-nude-800">{caseAnalysisForContact.potencial_financeiro || "—"}</div>
                        </div>
                        <div className="bg-white/80 border border-gold-100 rounded-md p-1.5">
                          <div className="text-nude-500">Score viabilidade</div>
                          <div className="font-semibold text-nude-800">{Math.round(Number(caseAnalysisForContact.score_viabilidade) || 0)}/100</div>
                        </div>
                      </div>
                      {caseAnalysisForContact.provas && (
                        <div className="text-[11px] text-nude-700 bg-white/80 border border-gold-100 rounded-md p-2">
                          <span className="font-semibold">Provas:</span>{" "}
                          {["documentos","testemunhas","mensagens","suficientes"].map((k) => (
                            <span key={k} className="mr-2">{k}: {caseAnalysisForContact.provas[k] ? "✓" : "—"}</span>
                          ))}
                        </div>
                      )}
                      {caseAnalysisForContact.risco_prazo && (
                        <div className="text-[11px] text-nude-700"><span className="font-semibold">Risco de prazo:</span> {caseAnalysisForContact.risco_prazo}</div>
                      )}
                      {Array.isArray(caseAnalysisForContact.pontos_favoraveis) && caseAnalysisForContact.pontos_favoraveis.length > 0 && (
                        <div className="text-[11px] text-nude-700"><span className="font-semibold">Pontos favoráveis:</span> {caseAnalysisForContact.pontos_favoraveis.join("; ")}</div>
                      )}
                      {Array.isArray(caseAnalysisForContact.pontos_atencao) && caseAnalysisForContact.pontos_atencao.length > 0 && (
                        <div className="text-[11px] text-nude-700"><span className="font-semibold">Pontos de atenção:</span> {caseAnalysisForContact.pontos_atencao.join("; ")}</div>
                      )}
                      {Array.isArray(caseAnalysisForContact.documentos_necessarios) && caseAnalysisForContact.documentos_necessarios.length > 0 && (
                        <div className="text-[11px] text-nude-700"><span className="font-semibold">Documentos necessários:</span> {caseAnalysisForContact.documentos_necessarios.join("; ")}</div>
                      )}
                      {Array.isArray(caseAnalysisForContact.informacoes_faltantes) && caseAnalysisForContact.informacoes_faltantes.length > 0 && (
                        <div className="text-[11px] text-nude-700"><span className="font-semibold">Informações faltantes:</span> {caseAnalysisForContact.informacoes_faltantes.join("; ")}</div>
                      )}
                      {caseAnalysisForContact.recomendacao && (
                        <div className="text-[11px] text-nude-700 bg-white/80 border border-gold-100 rounded-md p-2"><span className="font-semibold">Recomendação ao advogado:</span> {caseAnalysisForContact.recomendacao}</div>
                      )}
                      {caseAnalysisForContact.proxima_pergunta && (
                        <div className="text-[11px] text-nude-600">
                          <span className="font-semibold">Próxima pergunta:</span> {caseAnalysisForContact.proxima_pergunta}
                        </div>
                      )}
                    </div>
                  )}
                  {activeContact.sinestesic_style && (
                    <div>
                      <div className="text-xs text-nude-500 mb-1">Estilo do cliente (IA)</div>
                      <Badge className={
                        activeContact.sinestesic_style === "visual" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" :
                        activeContact.sinestesic_style === "auditivo" ? "bg-purple-100 text-purple-800 hover:bg-purple-100" :
                        "bg-gold-100 text-gold-800 hover:bg-gold-100"
                      }>
                        {activeContact.sinestesic_style}
                      </Badge>
                      {activeContact.prefers_audio && (
                        <div className="text-[10px] text-nude-500 mt-1">🎙️ Prefere comunicação por áudio</div>
                      )}
                    </div>
                  )}
                  {leadForContact ? (
                    <>
                      <Field label="Status CRM" value={stageName(leadForContact.stage)} badge="amber" />
                      <Field label="Área do Direito" value={leadForContact.case_type || "—"} />
                      <div>
                        <div className="text-xs text-nude-500 mb-1">Urgência</div>
                        <Badge className={`${URG_COLORS[leadForContact.urgency || "media"]} hover:${URG_COLORS[leadForContact.urgency || "media"]} gap-1`}>
                          <Flame className="w-3 h-3" /> {leadForContact.urgency || "media"}
                        </Badge>
                      </div>
                      <Field label="Score IA" value={`${leadForContact.score || 50}/100`} />
                      <Field label="Origem" value={leadForContact.source || "WhatsApp"} />
                      {leadForContact.tags?.length > 0 && (
                        <div>
                          <div className="text-xs text-nude-500 mb-1.5">Tags</div>
                          <div className="flex flex-wrap gap-1">
                            {leadForContact.tags.map((t, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded inline-flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5" />{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {leadForContact.description && (
                        <div>
                          <div className="text-xs text-nude-500 mb-1">Resumo IA</div>
                          <div className="text-xs text-nude-700 bg-nude-50 border border-nude-200 rounded-md p-2">
                            {leadForContact.description}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-nude-400 text-center py-4">
                      Contato ainda sem lead qualificado.<br/>A IA irá classificar na próxima mensagem recebida.
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" data-testid="open-process-btn">
                    <FileText className="w-3.5 h-3.5" /> Abrir processo
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" data-testid="send-email-btn">
                    <Mail className="w-3.5 h-3.5" /> Enviar e-mail
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 grid place-items-center text-nude-400 text-sm">—</div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, badge }) {
  const colors = {
    amber: "bg-gold-100 text-gold-800",
    info: "bg-blue-100 text-blue-800",
    emerald: "bg-gold-100 text-gold-800",
  };
  return (
    <div>
      <div className="text-xs text-nude-500 mb-1">{label}</div>
      {badge ? (
        <Badge className={`${colors[badge]} hover:${colors[badge]}`}>{value}</Badge>
      ) : (
        <div className="text-sm font-medium text-nude-900">{value}</div>
      )}
    </div>
  );
}

function stageName(stage) {
  const map = {
    novos_leads: "Novos Leads", em_contato: "Em Contato", interessado: "Interessado",
    qualificado: "Qualificado", em_negociacao: "Em Negociação",
    convertido: "Convertido", nao_interessado: "Não Interessado",
  };
  return map[stage] || stage || "—";
}
