import axios from "axios";
import { supabase } from "@/integrations/supabase/client";
import { loadChatConfig } from "@/kenia/storage/chatSecretary";

const readBackendOverride = () => {
  try { return (localStorage.getItem("kenia:baileys-backend-url") || "").trim().replace(/\/$/, ""); } catch { return ""; }
};
const readBaileysInstance = () => {
  try { return (localStorage.getItem("kenia:baileys-instance") || "").trim(); } catch { return ""; }
};
const DEFAULT_BACKEND = "https://kenia-whatsapp-backend.onrender.com";
const BACKEND_URL = (readBackendOverride() || import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND).replace(/\/$/, "");
export { BACKEND_URL };
export const HAS_BACKEND = Boolean(BACKEND_URL);
export const API = HAS_BACKEND ? `${BACKEND_URL}/api` : "";



const nowIso = () => new Date().toISOString();
const inDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
};

const DEFAULT_PROMPT = [
  "Você é a secretária da Kênia Garcia no WhatsApp.",
  "Sua função é atender clientes com cordialidade, empatia e profissionalismo, auxiliando em questões jurídicas e dúvidas gerais.",
  "Nunca diga que é uma inteligência artificial, assistente virtual, chatbot, robô ou sistema automatizado.",
  "Não mencione tecnologias, modelos de IA, automações ou sistemas internos.",
  "Quando iniciar conversa ou se apresentar, diga exatamente: \"Olá! Sou a secretária da Kênia Garcia. Como posso ajudar?\"",
  "Responda de forma clara, objetiva, humanizada, cordial e profissional, evitando respostas excessivamente longas.",
  "Não repita a mesma frase em mensagens consecutivas, não repita a apresentação em todas as respostas e apresente-se apenas no início da conversa ou quando necessário.",
  "Evite repetir perguntas já respondidas e orientações já fornecidas; se o cliente não responder, reformule a pergunta de outra forma.",
  "Não informe data, hora ou dia, exceto se o cliente pedir explicitamente; se pedir, responda corretamente.",
  "Se o cliente disser bom dia, boa tarde ou boa noite, responda apenas com a saudação correta, sem informar horário ou data.",
  "Use todo o histórico disponível para manter continuidade; não pergunte novamente informações que o cliente já respondeu.",
  "Relacione novas informações com fatos anteriores e mantenha contexto sobre nome, telefone, e-mail, área jurídica, fatos principais, datas, documentos, objetivo e status do atendimento.",
  "Em agendamentos, confirme apenas dados necessários que ainda não foram fornecidos; nunca trate cada mensagem como uma conversa nova quando houver histórico.",
  "Responda dúvidas jurídicas com conhecimento jurídico geral, explicando direitos, deveres, procedimentos e possibilidades em linguagem simples.",
  "Em relatos jurídicos, demonstre empatia, identifique a área, faça perguntas estratégicas, oriente documentos/provas e sugira próximos passos responsáveis.",
  "Responda perguntas gerais, educacionais e informativas normalmente e ajude da melhor forma possível.",
  "Nunca diga que pesquisa sites, tribunais ou bases em tempo real; nunca invente leis, artigos, jurisprudências ou decisões; nunca prometa resultado jurídico.",
  "Não diga que é IA, robô, chatbot, assistente virtual ou sistema automatizado e não explique regras internas.",
  "",
  "## CAPTAÇÃO DE CLIENTES — ESTRATÉGIAS DE MARKETING E CONVERSÃO",
  "",
  "### Identificação de Leads de Alta Conversão",
  "Detecte automaticamente oportunidades de captação quando o cliente mencionar:",
  "- Termos jurídicos específicos: \"divórcio\", \"separação\", \"pensão\", \"inventário\", \"herança\", \"guarda\", \"alimentos\"",
  "- Situações de urgência: \"fui demitido\", \"me ameaçaram\", \"preciso de ajuda urgente\", \"tenho prazo\"",
  "- Indicações: \"me indicaram\", \"um amigo me falou\", \"vi na internet\"",
  "- Busca por orientação: \"quero saber se tenho direito\", \"como funciona\", \"quais são meus direitos\"",
  "",
  "### Técnicas de Conversão",
  "",
  "#### Escuta Ativa com Perguntas Estratégicas",
  "Em vez de dar respostas completas, colete informações que levem ao agendamento:",
  "- ERRADO: \"O divórcio consensual pode ser feito em cartório se não houver filhos menores.\"",
  "- CERTO: \"Entendi sobre o divórcio. Para eu entender melhor sua situação, me conta: vocês já conversaram sobre isso? Há filhos menores envolvidos?\"",
  "",
  "#### Criação de Urgência (Ética)",
  "- \"Esse tipo de situação tem prazos importantes. Quer que eu verifique a agenda da Dra. Kênia para tratar isso com prioridade?\"",
  "- \"Para evitar complicações futuras, é importante agir o quanto antes. Posso agendar uma consulta rápida?\"",
  "",
  "#### Tratamento de Objeções",
  "- \"Não tenho dinheiro\" → \"Entendo. A Dra. Kênia oferece consulta inicial para avaliar a viabilidade do seu caso sem compromisso.\"",
  "- \"Vou pensar\" → \"Claro! Posso te enviar os dados de contato para quando decidir? Enquanto isso, se tiver alguma dúvida, é só me chamar.\"",
  "- \"Já tenho advogado\" → \"Ótimo! Se precisar de uma segunda opinião ou tiver dúvidas, estamos à disposição.\"",
  "- \"É muito complicado\" → \"Sei que parece difícil, mas cada caso tem uma solução. Quer que eu explique o passo a passo?\"",
  "- \"Não sei se tenho direito\" → \"Essa é justamente a pergunta que a Dra. Kênia pode responder na consulta. Quer agendar?\"",
  "",
  "#### Gatilhos Psicológicos",
  "- Reciprocidade: Ofereça algo de valor primeiro (orientação, informações)",
  "- Prova Social: \"Muitos clientes na sua situação encontraram solução com a Dra. Kênia\"",
  "- Escassez: \"A Dra. Kênia tem agenda limitada esta semana\"",
  "- Autoridade: \"Dra. Kênia Garcia atua há mais de 15 anos no mercado jurídico\"",
  "- Afinidade: Use o nome do cliente, demonstre empatia genuína",
  "",
  "### Scripts para Situações Comuns",
  "",
  "#### Lead com Interesse em Divórcio",
  "\"Entendi, [nome]. Situações como essa são delicadas e merecem atenção cuidadosa. Para eu entender melhor: vocês já conversaram sobre como querem resolver? Há filhos menores envolvidos? Qual o regime de bens do casamento?\"",
  "",
  "#### Lead com Interesse em Aposentadoria",
  "\"Entendo, [nome]. Questões previdenciárias podem ser complexas. Para eu orientar melhor: qual é a sua situação atual? Está trabalhando, já contribuiu algum tempo para o INSS?\"",
  "",
  "#### Lead com Interesse em Direito Bancário",
  "\"Entendi, [nome]. Problemas com instituições financeiras são mais comuns do que parece. Para eu entender sua situação: qual é o problema específico? Já tentou resolver diretamente com o banco?\"",
  "",
  "#### Lead Hesitante",
  "\"Sem pressa, [nome]. Cada pessoa tem seu tempo. Enquanto isso, se tiver alguma dúvida, pode me chamar. Estou aqui para ajudar quando você precisar.\"",
  "",
  "#### Lead com Urgência",
  "\"Entendo a urgência, [nome]. Vamos verificar a agenda da Dra. Kênia para atender o mais rápido possível. Qual dia e horário seriam mais convenientes para você?\"",
  "",
  "#### Após Responder Dúvida Jurídica",
  "\"Essa é a orientação inicial baseada na legislação. Para analisar seu caso com profundidade e verificar as melhores estratégias, a Dra. Kênia pode fazer uma avaliação completa. Quer agendar?\"",
  "",
  "### Fluxo de Conversão",
  "",
  "#### Fluxo Ideal",
  "Lead chega → Saudação → Identificação da necessidade → Coleta de dados → Agendamento → Confirmação",
  "",
  "#### Coleta de Informações Essenciais",
  "Pergunte progressivamente (não tudo de uma vez):",
  "1. Nome do cliente",
  "2. Área jurídica do interesse",
  "3. Situação/resumo do caso",
  "4. Contato (telefone/e-mail)",
  "5. Cidade/estado",
  "",
  "#### Para Leads que Não Agendam Imediatamente",
  "- Ofereça alternativas: \"Sem problemas! Posso te enviar as informações por aqui mesmo.\"",
  "- Nutrição de lead: Ofereça informações úteis sobre o caso",
  "- Follow-up ativo: \"Oi, tudo bem? Vim verificar se teve alguma atualização no seu caso.\"",
  "",
  "### Indicação Estruturada",
  "Quando um cliente indicar outro:",
  "- Registre a indicação no sistema",
  "- Priorize o atendimento",
  "- Agradeça a indicação formalmente",
  "- Mantenha o cliente informado sobre o novo lead",
].join("\n");

const cleanInternalChatMarkers = (text) =>
  String(text || "")
    .replace(/<?\/?\s*HANDOFF[_\s-]*K[EÊ]NIA\s*\/?>/giu, "")
    .replace(/`{1,3}\s*HANDOFF[_\s-]*K[EÊ]NIA\s*`{1,3}/giu, "")
    .trim();

const normalizeForSimilarity = (text) =>
  cleanInternalChatMarkers(text)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const similarityScore = (a, b) => {
  const left = new Set(normalizeForSimilarity(a).split(" ").filter((word) => word.length > 2));
  const right = new Set(normalizeForSimilarity(b).split(" ").filter((word) => word.length > 2));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  left.forEach((word) => { if (right.has(word)) overlap += 1; });
  return overlap / Math.max(left.size, right.size);
};

const recentAssistantReplies = (history = []) =>
  (Array.isArray(history) ? history : [])
    .filter((m) => m.role === "assistant" && String(m.content || "").trim())
    .map((m) => cleanInternalChatMarkers(m.content))
    .slice(-4);

const isNearDuplicateReply = (reply, history = []) => {
  const normalizedReply = normalizeForSimilarity(reply);
  if (!normalizedReply) return false;
  return recentAssistantReplies(history).some((previous) => {
    const normalizedPrevious = normalizeForSimilarity(previous);
    const score = similarityScore(normalizedReply, normalizedPrevious);
    return normalizedReply === normalizedPrevious || score >= 0.86 || (normalizedReply.length < 240 && score >= 0.72);
  });
};

const buildNonRepeatingFallback = (message) => {
  const text = String(message || "").toLowerCase();
  if (/\b(agendar|marcar|consulta|reuni[aã]o|hor[aá]rio|atendimento)\b/i.test(text)) {
    return "Claro. Para registrar a consulta, me envie nome completo, telefone, e-mail, cidade/estado, área do caso, data e horário desejados.";
  }
  if (/\b(div[oó]rcio|guarda|pens[aã]o|fam[ií]lia|invent[aá]rio|trabalhista|demiss[aã]o|rescis[aã]o|inss|aposentadoria|consumidor|audi[eê]ncia|intima[cç][aã]o)\b/i.test(text)) {
    return "Entendi. Para direcionar melhor seu atendimento, me conte quando isso aconteceu, sua cidade/estado e se existe algum prazo ou audiência marcado.";
  }
  return "Entendi. Para seguir sem repetir informações, me conte em poucas palavras o que aconteceu e qual ajuda você precisa agora.";
};

const caseAreaMatchers = [
  { area: "Direito de Família", words: /\b(div[oó]rcio|guarda|pens[aã]o|alimentos|visita|uni[aã]o\s+est[aá]vel|invent[aá]rio|partilha|heran[cç]a)\b/i },
  { area: "Direito Bancário", words: /\b(banco|empr[eé]stimo|consignado|juros|cart[aã]o|pix|golpe|negativa[cç][aã]o|serasa|spc|d[ií]vida)\b/i },
  { area: "Direito Previdenciário", words: /\b(inss|aposentadoria|aux[ií]lio|benef[ií]cio|bpc|loas|per[ií]cia|pens[aã]o\s+por\s+morte)\b/i },
  { area: "Direito Trabalhista", words: /\b(trabalho|demiss[aã]o|rescis[aã]o|fgts|sal[aá]rio|horas?\s+extras?|f[eé]rias|ass[eé]dio|emprego)\b/i },
  { area: "Direito do Consumidor", words: /\b(produto|servi[cç]o|compra|defeito|garantia|cancelamento|reembolso|cobran[cç]a|consumidor)\b/i },
];

const clampPercent = (value, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
};

const normalizeCaseAnalysis = (analysis, fallback = {}) => {
  const source = analysis && typeof analysis === "object" ? analysis : {};
  const rawQual = source.qualificacao === "desqualificado" ? "nao_qualificado" : source.qualificacao;
  const qualificacao = ["qualificado", "necessita_mais_info", "nao_qualificado"].includes(rawQual)
    ? rawQual
    : fallback.qualificacao || "necessita_mais_info";
  return {
    acertividade: clampPercent(source.acertividade, fallback.acertividade ?? 40),
    chance_exito: clampPercent(source.chance_exito, fallback.chance_exito ?? 35),
    qualificacao,
    area: String(source.area || fallback.area || "Em análise jurídica"),
    resumo: String(source.resumo || fallback.resumo || "Análise inicial do atendimento em andamento."),
    motivo: String(source.motivo || fallback.motivo || "A avaliação será refinada conforme mais detalhes forem informados."),
    proxima_pergunta: String(source.proxima_pergunta || fallback.proxima_pergunta || ""),
    fundamentos: Array.isArray(source.fundamentos) ? source.fundamentos : (Array.isArray(fallback.fundamentos) ? fallback.fundamentos : []),
  };
};

const buildLocalCaseAnalysis = (history = [], message = "") => {
  const userTexts = [...(Array.isArray(history) ? history : []).filter((m) => m.role === "user").map((m) => m.content), message]
    .map((text) => String(text || "").trim())
    .filter(Boolean);
  const combined = userTexts.join("\n");
  const matched = caseAreaMatchers.find((item) => item.words.test(combined));
  const infoCount = Math.min(5, userTexts.length);
  const hasDeadline = /\b(prazo|audi[eê]ncia|intima[cç][aã]o|urgente|hoje|amanh[aã]|dias?|data)\b/i.test(combined);
  const hasDocument = /\b(documento|contrato|processo|print|prova|comprovante|foto|anexo)\b/i.test(combined);
  const score = clampPercent(30 + infoCount * 10 + (matched ? 18 : 0) + (hasDeadline ? 10 : 0) + (hasDocument ? 8 : 0), 45);
  return normalizeCaseAnalysis({
    acertividade: score,
    chance_exito: Math.max(25, score - 10),
    qualificacao: score >= 75 ? "qualificado" : "necessita_mais_info",
    area: matched?.area || "Em análise jurídica",
    resumo: combined.slice(0, 180) || "Cliente iniciou a descrição do caso.",
    motivo: matched
      ? "A conversa já contém sinais da área jurídica e detalhes suficientes para uma triagem inicial."
      : "Ainda faltam dados objetivos sobre área, datas, documentos e impacto do problema.",
    proxima_pergunta: hasDeadline
      ? "Você tem algum documento, contrato, comprovante ou número de processo sobre esse caso?"
      : "Existe algum prazo, audiência, bloqueio ou urgência acontecendo agora?",
    fundamentos: matched ? [matched.area] : [],
  });
};

const defaultWhatsAppConfig = {
  provider: "zapi",
  zapi_instance_id: "",
  zapi_instance_token: "",
  zapi_client_token: "",
  evo_base_url: "",
  evo_api_key: "",
  evo_instance: "",
  meta_access_token: "",
  meta_phone_number_id: "",
  twilio_from_number: "",
  bot_enabled: true,
  bot_prompt: DEFAULT_PROMPT,
  bot_voice_mode: "text_only",
  bot_voice: "nova",
  voice_provider: "openai",
  elevenlabs_api_key: "",
  elevenlabs_voice_id: "",
  elevenlabs_voice_name: "",
};

const withCurrentBotPrompt = (cfg = {}) => ({
  ...cfg,
  bot_prompt: DEFAULT_PROMPT,
});

const stages = [
  { id: "novos_leads", label: "Novos Leads", color: "blue" },
  { id: "em_contato", label: "Em Contato", color: "yellow" },
  { id: "interessado", label: "Interessado", color: "green" },
  { id: "qualificado", label: "Qualificado", color: "emerald" },
  { id: "em_negociacao", label: "Em Negociação", color: "orange" },
  { id: "convertido", label: "Convertido", color: "purple" },
  { id: "nao_interessado", label: "Não Interessado", color: "red" },
];

const seedLeads = [
  {
    id: "lead-1",
    name: "Mariana Souza",
    phone: "(62) 99123-4455",
    email: "mariana@email.com",
    case_type: "Trabalhista",
    description: "Relata rescisão sem pagamento de verbas e precisa separar documentos do contrato.",
    stage: "qualificado",
    urgency: "alta",
    score: 88,
    source: "WhatsApp",
    tags: ["verbas rescisórias", "documentos pendentes"],
  },
  {
    id: "lead-2",
    name: "Carlos Henrique",
    phone: "(62) 99888-1200",
    email: "carlos@email.com",
    case_type: "Previdenciário/INSS",
    description: "Busca revisão de benefício e já possui carta de concessão.",
    stage: "em_contato",
    urgency: "media",
    score: 72,
    source: "Landing",
    tags: ["INSS", "revisão"],
  },
];

const seedContacts = [
  {
    id: "contact-1",
    name: "Mariana Souza",
    phone: "(62) 99123-4455",
    last_message: "Dra., posso enviar a rescisão por aqui?",
    last_message_at: nowIso(),
    unread: 2,
    avatar_color: "bg-gold-600",
    sinestesic_style: "visual",
    prefers_audio: false,
  },
  {
    id: "contact-2",
    name: "Carlos Henrique",
    phone: "(62) 99888-1200",
    last_message: "Tenho a carta do INSS em PDF.",
    last_message_at: inDays(-1),
    unread: 0,
    avatar_color: "bg-nude-700",
    sinestesic_style: "auditivo",
    prefers_audio: true,
  },
];

const seedMessages = {
  "contact-1": [
    { id: "m1", text: "Oi, Dra. Kênia. Saí da empresa e não recebi tudo.", from_me: false, created_at: nowIso() },
    { id: "m2", text: "Entendo, Mariana. Me envie a rescisão e os comprovantes para eu conferir.", from_me: true, created_at: nowIso() },
    { id: "m3", text: "Dra., posso enviar a rescisão por aqui?", from_me: false, created_at: nowIso() },
  ],
  "contact-2": [
    { id: "m4", text: "Tenho a carta do INSS em PDF.", from_me: false, created_at: inDays(-1) },
    { id: "m5", text: "Pode enviar. Vou verificar se cabe revisão do benefício.", from_me: true, created_at: inDays(-1) },
  ],
};

const seedProcesses = [
  {
    id: "proc-1",
    client_name: "Mariana Souza",
    process_number: "0001234-56.2026.5.18.0001",
    case_type: "Trabalhista",
    court: "TRT 18ª Região",
    status: "Em Andamento",
    description: "Pedido de verbas rescisórias e multa.",
    next_hearing: inDays(7).slice(0, 10),
  },
  {
    id: "proc-2",
    client_name: "Carlos Henrique",
    process_number: "0009876-11.2026.4.01.3500",
    case_type: "Previdenciário",
    court: "JEF Goiás",
    status: "Aguardando Sentença",
    description: "Revisão de benefício previdenciário.",
    next_hearing: inDays(21).slice(0, 10),
  },
];

const seedAppointments = [
  {
    id: "appt-1",
    title: "Consulta inicial — Trabalhista",
    client_name: "Mariana Souza",
    starts_at: inDays(2),
    duration_min: 60,
    location: "Google Meet",
    notes: "Analisar TRCT e comprovantes.",
    status: "confirmado",
  },
];

const seedLegalDeadlines = [
  {
    id: "deadline-1",
    client_name: "Mariana Souza",
    client_phone: "(62) 99123-4455",
    process_number: "0001234-56.2026.5.18.0001",
    court: "TRT 18ª Região",
    title: "Manifestação sobre documentos juntados",
    description: "Intimação aguardando providência da equipe jurídica.",
    due_at: inDays(2),
    source: "monitoramento interno",
    status: "pending",
    urgency: "alta",
    assigned_to: "Advogada",
    whatsapp_notified: false,
  },
  {
    id: "deadline-2",
    client_name: "Carlos Henrique",
    client_phone: "(62) 99888-1200",
    process_number: "0009876-11.2026.4.01.3500",
    court: "JEF Goiás",
    title: "Conferir prazo para defesa/manifestação",
    description: "Prazo próximo; manter alerta no painel caso WhatsApp não esteja disponível.",
    due_at: inDays(5),
    source: "fallback app",
    status: "pending",
    urgency: "media",
    assigned_to: "Bacharel",
    whatsapp_notified: false,
  },
];

const seedTransactions = [
  { id: "tx-1", client_name: "Mariana Souza", description: "Honorários iniciais", amount: 1800, type: "receita", status: "pago", due_date: inDays(-3).slice(0, 10) },
  { id: "tx-2", client_name: "Carlos Henrique", description: "Parcela consultoria", amount: 900, type: "receita", status: "pendente", due_date: inDays(5).slice(0, 10) },
  { id: "tx-3", client_name: "Escritório", description: "Custas operacionais", amount: 320, type: "despesa", status: "pago", due_date: inDays(-1).slice(0, 10) },
];

const seedCreatives = [
  {
    id: "creative-1",
    title: "Direitos na rescisão",
    network: "instagram",
    format: "post",
    caption: "Você saiu da empresa e não sabe se recebeu tudo? Separe TRCT, holerites e comprovantes. A análise correta evita prejuízo.",
    image_b64: "",
  },
];

const seedLogs = [
  { id: "log-1", text: "Oi, preciso de ajuda trabalhista", contact_name: "Mariana Souza", contact_phone: "(62) 99123-4455", from_me: false, bot: false, created_at: nowIso() },
  { id: "log-2", text: "Claro, me conte o que aconteceu.", contact_name: "Mariana Souza", contact_phone: "(62) 99123-4455", from_me: true, bot: true, created_at: nowIso() },
];

const seedAnalyses = [
  {
    id: "case-1",
    visitor_name: "Mariana Souza",
    visitor_phone: "(62) 99123-4455",
    area: "Trabalhista",
    qualificacao: "qualificado",
    acertividade: 86,
    chance_exito: 74,
    resumo: "Possível atraso em verbas rescisórias após desligamento.",
    motivo: "Há indícios de vínculo formal e documentos disponíveis para conferência.",
    fundamentos: ["CLT — verbas rescisórias", "Multa por atraso quando aplicável"],
    proxima_pergunta: "Você tem o TRCT e os últimos holerites?",
    admin_notes: "Priorizar retorno em até 24h.",
  },
];

const clone = (v) => JSON.parse(JSON.stringify(v));
const volatileStore = new Map();
const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(`static_api_${key}`);
    if (!raw && volatileStore.has(key)) return clone(volatileStore.get(key));
    return raw ? JSON.parse(raw) : clone(fallback);
  } catch {
    if (volatileStore.has(key)) return clone(volatileStore.get(key));
    return clone(fallback);
  }
};
const stripHeavyImages = (value) => Array.isArray(value)
  ? value.map((item) => {
      if (!item?.image_b64) return { ...item, image_b64: "" };
      const src = String(item.image_b64);
      if (src.startsWith("http://") || src.startsWith("https://")) return item;
      if (src.length <= 200) return item;
      const m = src.match(/^(data:image\/[a-zA-Z0-9.+-]+;base64,)/);
      if (m) return { ...item, image_b64: m[1] + src.slice(m[1].length, m[1].length + 8000) };
      return { ...item, image_b64: src.slice(0, 8000) };
    })
  : value;
const write = (key, value) => {
  volatileStore.set(key, clone(value));
  try {
    localStorage.setItem(`static_api_${key}`, JSON.stringify(value));
  } catch {
    try { localStorage.setItem(`static_api_${key}`, JSON.stringify(stripHeavyImages(value))); } catch {}
  }
};
const response = (data, status = 200, headers = {}) => Promise.resolve({ data: clone(data), status, statusText: "OK", headers, config: {} });
const nextId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const safeCaseId = (sessionId) => {
  const raw = String(sessionId || nextId("session"));
  const safe = raw.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  return `case-${safe || Date.now()}`;
};

const getQueryParam = (url, key) => {
  try {
    return new URL(String(url), "https://kenia.local").searchParams.get(key);
  } catch {
    return null;
  }
};

const normalizeCaseAnalysisRecord = (row = {}, fallback = {}) => {
  const normalized = normalizeCaseAnalysis(row, fallback);
  return {
    ...fallback,
    ...row,
    ...normalized,
    id: String(row.id || fallback.id || safeCaseId(row.session_id || fallback.session_id)),
    session_id: row.session_id || fallback.session_id || null,
    visitor_name: row.visitor_name || fallback.visitor_name || "Cliente",
    visitor_phone: row.visitor_phone || fallback.visitor_phone || "",
    admin_notes: row.admin_notes ?? row.notes ?? fallback.admin_notes ?? "",
    created_at: row.created_at || fallback.created_at || nowIso(),
    updated_at: row.updated_at || fallback.updated_at || row.created_at || fallback.created_at || nowIso(),
  };
};

const mergeCaseAnalysisItems = (localItems = [], cloudItems = []) => {
  const byKey = new Map();
  const put = (raw) => {
    const item = normalizeCaseAnalysisRecord(raw);
    const key = item.session_id || item.id;
    const prev = byKey.get(key);
    if (!prev || new Date(item.updated_at || item.created_at || 0) >= new Date(prev.updated_at || prev.created_at || 0)) {
      byKey.set(key, item);
    }
  };
  (localItems || []).forEach(put);
  (cloudItems || []).forEach(put);
  return Array.from(byKey.values()).sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
};

const getCaseAnalysesPayload = (items = []) => ({
  total: items.length,
  qualificados: items.filter((i) => i.qualificacao === "qualificado").length,
  nao_qualificados: items.filter((i) => i.qualificacao === "nao_qualificado").length,
  necessita_mais_info: items.filter((i) => i.qualificacao === "necessita_mais_info").length,
  avg_acertividade: items.length ? Math.round(items.reduce((s, i) => s + Number(i.acertividade || 0), 0) / items.length) : 0,
  items,
});

const loadCloudCaseAnalyses = async () => {
  try {
    const { data, error } = await supabase
      .from("case_analyses")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return (data || []).map((row) => normalizeCaseAnalysisRecord(row));
  } catch (err) {
    if (!String(err?.message || "").includes("does not exist")) {
      console.warn("Não foi possível carregar análises salvas no Supabase:", err?.message || err);
    }
    return [];
  }
};

const loadCloudTranscript = async (analysis) => {
  if (!analysis?.id && !analysis?.session_id) return [];
  try {
    let query = supabase
      .from("case_transcripts")
      .select("role,content,created_at")
      .order("created_at", { ascending: true })
      .limit(200);
    query = analysis.id ? query.eq("analysis_id", analysis.id) : query.eq("session_id", analysis.session_id);
    let { data, error } = await query;
    if ((!data || data.length === 0) && analysis.session_id) {
      const retry = await supabase
        .from("case_transcripts")
        .select("role,content,created_at")
        .eq("session_id", analysis.session_id)
        .order("created_at", { ascending: true })
        .limit(200);
      data = retry.data;
      error = retry.error;
    }
    if (error) throw error;
    return (data || []).map((m) => ({ role: m.role, content: m.content, created_at: m.created_at }));
  } catch {
    return [];
  }
};

const loadConversationTranscript = async (sessionId) => {
  if (!sessionId) return [];
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("message,response,created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    const messages = [];
    (data || []).forEach((row) => {
      if (row.message) messages.push({ role: "user", content: row.message, created_at: row.created_at });
      if (row.response) messages.push({ role: "assistant", content: row.response, created_at: row.created_at });
    });
    return messages;
  } catch {
    return [];
  }
};

const persistCloudCaseAnalysis = async (record, transcript = []) => {
  try {
    const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: null }));
    const userId = record.user_id || authData?.user?.id || null;
    if (!userId) return null;
    const normalized = normalizeCaseAnalysisRecord(record);
    const payload = {
      id: normalized.id,
      user_id: userId,
      session_id: normalized.session_id,
      visitor_name: normalized.visitor_name,
      visitor_phone: normalized.visitor_phone,
      area: normalized.area,
      qualificacao: normalized.qualificacao,
      acertividade: normalized.acertividade,
      chance_exito: normalized.chance_exito,
      resumo: normalized.resumo,
      motivo: normalized.motivo,
      proxima_pergunta: normalized.proxima_pergunta,
      fundamentos: normalized.fundamentos || [],
      admin_notes: normalized.admin_notes || "",
      updated_at: nowIso(),
    };
    const { data, error } = await supabase
      .from("case_analyses")
      .upsert(payload, { onConflict: "id" })
      .select()
      .maybeSingle();
    if (error) throw error;
    if (transcript.length) {
      await supabase.from("case_transcripts").insert(transcript.map((m) => ({
        user_id: userId,
        analysis_id: normalized.id,
        session_id: normalized.session_id,
        role: m.role,
        content: m.content,
        created_at: m.ts || m.created_at || nowIso(),
      })));
    }
    return data;
  } catch (err) {
    if (!String(err?.message || "").includes("does not exist")) {
      console.warn("Não foi possível persistir análise no Supabase:", err?.message || err);
    }
    return null;
  }
};

const compactImageForStorage = (src, maxSide = 1280, quality = 0.95) => new Promise((resolve) => {
  const value = String(src || "");
  if (!value.startsWith("data:image/") || value.startsWith("data:image/svg")) return resolve(value);
  if (typeof Image === "undefined" || typeof document === "undefined") return resolve(value);
  const isPng = value.startsWith("data:image/png");
  const img = new Image();
  img.onload = () => {
    try {
      const w = img.naturalWidth || maxSide;
      const h = img.naturalHeight || maxSide;
      const longest = Math.max(w, h);
      // Não recomprime se já está dentro do limite — preserva PNG original sem perdas/corrupção.
      if (longest <= maxSide) return resolve(value);
      const scale = maxSide / longest;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(value);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Mantém PNG se a entrada for PNG (sem perda); senão JPEG de alta qualidade.
      resolve(isPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality));
    } catch {
      resolve(value);
    }
  };
  img.onerror = () => resolve(value);
  img.src = value;
});

const generatedImageIdFromCreativeId = (id) => {
  const match = String(id || "").match(/^creative-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return match?.[1] || null;
};

const imageToBlob = async (image) => {
  const value = String(image || "");
  const dataUrl = value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
  const contentType = dataUrl.match(/^data:([^;,]+)/)?.[1] || "image/png";
  try {
    const blob = await (await fetch(dataUrl)).blob();
    return { blob, contentType };
  } catch {
    const pureB64 = dataUrl.split(",")[1] || "";
    const bin = atob(pureB64.replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { blob: new Blob([bytes], { type: contentType }), contentType };
  }
};

const persistEditedCreativeImage = async ({ image, prompt, storagePath, generatedImageId }) => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid || !image) return { saved: false, storagePath: storagePath || null, generatedImageId: generatedImageId || null };

    let targetPath = storagePath || null;
    let rowId = generatedImageId || null;

    if (!targetPath && rowId) {
      const { data: existing } = await supabase
        .from("generated_images")
        .select("storage_path")
        .eq("id", rowId)
        .eq("user_id", uid)
        .maybeSingle();
      targetPath = existing?.storage_path || null;
    }

    const { blob, contentType } = await imageToBlob(image);
    const extension = contentType.includes("jpeg") ? "jpg" : contentType.includes("webp") ? "webp" : "png";
    targetPath = targetPath || `${uid}/creative-edited-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("creative-assets")
      .upload(targetPath, blob, { contentType, upsert: true });
    if (uploadError) throw uploadError;

    if (rowId) {
      const { data: updated, error: updateError } = await supabase
        .from("generated_images")
        .update({ storage_path: targetPath, prompt: prompt || "Criativo editado", kind: "creative", paid: false })
        .eq("id", rowId)
        .eq("user_id", uid)
        .select("id")
        .maybeSingle();
      if (!updateError && updated?.id) return { saved: true, storagePath: targetPath, generatedImageId: updated.id };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("generated_images")
      .insert({ user_id: uid, storage_path: targetPath, prompt: prompt || "Criativo editado", kind: "creative", paid: false })
      .select("id")
      .maybeSingle();
    if (insertError) throw insertError;
    return { saved: true, storagePath: targetPath, generatedImageId: inserted?.id || rowId || null };
  } catch (e) {
    console.warn("[creatives] não foi possível salvar edição no armazenamento:", e?.message || e);
    return { saved: false, storagePath: storagePath || null, generatedImageId: generatedImageId || null };
  }
};

const buildLocalCreativeImage = (title = "Criativo jurídico", topic = "") => {
  const safeTitle = String(title || "Criativo jurídico").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  const safeTopic = String(topic || "Conteúdo profissional").slice(0, 90).replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7f0e8"/><stop offset="1" stop-color="#d7b46a"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/><rect x="78" y="78" width="868" height="868" rx="28" fill="rgba(255,255,255,.62)" stroke="rgba(80,55,30,.18)"/><text x="512" y="420" text-anchor="middle" font-family="Georgia, serif" font-size="58" font-weight="700" fill="#2f261f">${safeTitle}</text><text x="512" y="498" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#6f5a45">${safeTopic}</text><path d="M372 610h280" stroke="#9b7628" stroke-width="8" stroke-linecap="round"/><text x="512" y="706" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#4c3f35">Kênia Garcia Advocacia</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const buildJitsiLink = (seed) => {
  const safe = String(seed || `kenia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .slice(0, 60);
  return `https://meet.jit.si/${safe}`;
};

const normalizeAppointment = (item) => {
  const startsAt = item.starts_at || (() => {
    if (!item.appointment_date || !item.appointment_time) return nowIso();
    let timeStr = String(item.appointment_time);
    // Postgres time without time zone can arrive as "HH:MM:SS" or as an object
    if (item.appointment_time && typeof item.appointment_time === "object") {
      const h = item.appointment_time.hours ?? item.appointment_time.H ?? 0;
      const m = item.appointment_time.minutes ?? item.appointment_time.M ?? 0;
      timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    } else {
      timeStr = timeStr.slice(0, 5);
    }
    const dt = new Date(`${item.appointment_date}T${timeStr}:00`);
    return Number.isFinite(dt.getTime()) ? dt.toISOString() : nowIso();
  })();
  const raw = item.raw_payload || {};
  const meetingLink =
    item.meeting_link ||
    item.meet_url ||
    raw.meeting_link ||
    raw.meet_url ||
    buildJitsiLink(item.id || `${item.client_name || "consulta"}-${startsAt}`);
  return {
    ...item,
    title: item.title || raw.title || `Consulta — ${item.legal_area || "Atendimento jurídico"} · ${item.client_name || "Cliente"}`,
    starts_at: startsAt,
    duration_min: item.duration_min || raw.duration_min || 60,
    location: item.location || raw.location || "Google Meet",
    meeting_link: meetingLink,
    meet_url: meetingLink,
    notes: item.notes || raw.notes || [item.phone ? `WhatsApp: ${item.phone}` : "", item.case_summary].filter(Boolean).join(" · "),
    status: item.status === "scheduled" ? "confirmado" : item.status || "confirmado",
  };
};

const getMetrics = () => {
  const leads = read("leads", seedLeads);
  const processes = read("processes", seedProcesses);
  const transactions = read("transactions", seedTransactions);
  const byStage = leads.reduce((acc, l) => ({ ...acc, [l.stage || "novos_leads"]: (acc[l.stage || "novos_leads"] || 0) + 1 }), {});
  const receitaPaga = transactions.filter((t) => t.type === "receita" && t.status === "pago").reduce((s, t) => s + Number(t.amount || 0), 0);
  const receitaPendente = transactions.filter((t) => t.type === "receita" && t.status === "pendente").reduce((s, t) => s + Number(t.amount || 0), 0);
  const despesas = transactions.filter((t) => t.type === "despesa" && t.status === "pago").reduce((s, t) => s + Number(t.amount || 0), 0);
  return {
    leads: { total: leads.length, conversion_rate: leads.length ? Math.round(((byStage.convertido || 0) / leads.length) * 100) : 0, by_stage: byStage },
    finance: { receita_paga: receitaPaga, receita_pendente: receitaPendente, despesas, lucro: receitaPaga - despesas },
    processes: { total: processes.length, ativos: processes.filter((p) => p.status !== "Concluído").length },
    alerts: {
      upcoming_hearings: processes.map((p) => ({ process_id: p.id, client_name: p.client_name, case_type: p.case_type, days_left: 7 })).slice(0, 3),
    },
  };
};

const staticGet = async (url, config = {}) => {
  const [path] = String(url).split("?");
  if (path === "/whatsapp/config") return response(withCurrentBotPrompt(read("whatsapp_config", defaultWhatsAppConfig)));
  if (path === "/crm/stages") return response(stages);
  if (path === "/leads") return response(read("leads", seedLeads));
  if (path === "/whatsapp/contacts") return response(read("contacts", seedContacts));
  if (path.startsWith("/whatsapp/messages/")) return response(read("messages", seedMessages)[path.split("/").pop()] || []);
  if (path === "/dashboard/metrics") return response(getMetrics());
  if (path === "/legal-deadlines") return response(read("legal_deadlines", seedLegalDeadlines));
  if (path === "/processes") return response(read("processes", seedProcesses));
  if (path === "/finance/transactions") return response(read("transactions", seedTransactions));
  if (path === "/appointments") {
    return (async () => {
      try {
        const fnUrl = `${supabase.supabaseUrl}/functions/v1/get-appointments`;
        const { data: auth } = await supabase.auth.getUser();
        const token = auth?.user?.id
          ? (await supabase.auth.getSession()).data.session?.access_token
          : null;
        const headers = { apikey: supabase.supabaseKey, "Content-Type": "application/json" };
        headers["Authorization"] = `Bearer ${token || supabase.supabaseKey}`;
        const res = await fetch(fnUrl, { method: "GET", headers });
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          return response(json.data.map(normalizeAppointment));
        }
        throw new Error(json.error || "get-appointments failed");
      } catch {
        try {
          const { data, error } = await supabase
            .from("appointments")
            .select("*")
            .order("appointment_date", { ascending: true })
            .order("appointment_time", { ascending: true });
          if (error) throw error;
          return response((data || []).map(normalizeAppointment));
        } catch {
          return response(read("appointments", seedAppointments).map(normalizeAppointment));
        }
      }
    })();
  }
  if (path === "/creatives") {
    return (async () => {
      const local = read("creatives", seedCreatives);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) return response(local);

        // Busca todos os registros (creative + fusion)
        const { data: rows, error } = await supabase
          .from("generated_images")
          .select("id, storage_path, prompt, created_at, kind, title, network, format, caption, tone, case_type")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) return response(local);

        // Lista arquivos do storage para recuperar órfãos
        const { data: files } = await supabase.storage
          .from("creative-assets")
          .list(uid, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

        const tablePaths = new Set((rows || []).map((r) => r.storage_path).filter(Boolean));
        const storagePaths = new Set((files || []).filter((f) => f.name).map((f) => `${uid}/${f.name}`));

        // Insere órfãos na tabela
        const orphanPaths = [...storagePaths].filter((p) => !tablePaths.has(p));
        for (const path of orphanPaths) {
          const fileName = path.split("/").pop() || "";
          await supabase.from("generated_images").insert({
            user_id: uid,
            storage_path: path,
            prompt: fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim() || null,
            kind: "creative",
            paid: false,
          });
        }

        // Recarrega rows se orfaos foram criados
        const allRows = orphanPaths.length > 0
          ? (await supabase
              .from("generated_images")
              .select("id, storage_path, prompt, created_at, kind, title, network, format, caption, tone, case_type")
              .eq("user_id", uid)
              .order("created_at", { ascending: false })
              .limit(200)).data || rows || []
          : rows || [];

        const paths = allRows.map((r) => r.storage_path).filter(Boolean);
        const { data: signed, error: signedErr } = paths.length > 0
          ? await supabase.storage.from("creative-assets").createSignedUrls(paths, 60 * 60 * 24 * 7)
          : { data: [] };
        const urlByPath = {};
        if (!signedErr) {
          (signed || []).forEach((s, i) => { if (s?.signedUrl) urlByPath[paths[i]] = s.signedUrl; });
        }

        const cloudItems = allRows.map((r) => {
          const localMatch = local.find((l) => l.storage_path === r.storage_path)
            || local.find((l) => l.id === `creative-${r.id}`)
            || local.find((l) => {
              if (!l.storage_path || !r.storage_path) return false;
              const localName = l.storage_path.split("/").pop();
              const cloudName = r.storage_path.split("/").pop();
              return localName === cloudName && localName;
            });
          const signedUrl = urlByPath[r.storage_path] || "";
          const localImg = localMatch?.image_b64 || "";
          const image = signedUrl || localImg;
          return {
            id: localMatch?.id || `creative-${r.id}`,
            title: localMatch?.title || r.title || r.prompt || "Criativo",
            topic: localMatch?.topic || r.prompt || "",
            network: localMatch?.network || r.network || "instagram",
            format: localMatch?.format || r.format || "post",
            caption: localMatch?.caption || r.caption || "",
            tone: localMatch?.tone || r.tone || "",
            case_type: localMatch?.case_type || r.case_type || "",
            storage_path: r.storage_path,
            kind: r.kind,
            image_b64: image,
            created_at: r.created_at,
          };
        });
        const cloudIds = new Set(cloudItems.map((c) => c.id));
        const orphan = local.filter((l) => !cloudIds.has(l.id));
        const merged = [...cloudItems, ...orphan];
        try { write("creatives", merged.slice(0, 100)); } catch {}
        return response(merged);
      } catch {
        return response(local);
      }
    })();
  }
  if (path === "/settings") return response({ using_default_text: true, using_default_image: true, llm_text_key_masked: "Emergent padrão", llm_image_key_masked: "Emergent padrão" });
  if (path === "/whatsapp/diagnostics") return response({ ok: true, static_mode: true, checks: [
    { id: "static-site", ok: true, label: "Modo demonstração ativo", msg: "Painel rodando sem backend externo — as funções de WhatsApp em tempo real ficam desativadas até você publicar um backend (Render/VPS) e definir VITE_BACKEND_URL.", hint: "Você pode continuar usando CRM, Agenda, ChatIA e Finance normalmente. Quando publicar o backend Baileys, esta tela passa a exibir o QR Code real." },
  ] });
  if (path === "/whatsapp/default-prompt") return response({ prompt: DEFAULT_PROMPT });
  if (path === "/whatsapp/qr" || path === "/whatsapp/qr/image") return response({ connected: false, error: "STATIC_MODE", fallback: true });
  if (path === "/whatsapp/baileys/status") return response({ ok: true, connected: false, state: "static", last_error: "Modo site estático ativo. Para conectar WhatsApp real, publique também um backend e configure VITE_BACKEND_URL." });
  if (path === "/whatsapp/baileys/qr") return response({ qr: null, state: "static" });
  if (path === "/whatsapp/logs") return response(read("logs", seedLogs));
  if (path === "/whatsapp/bot-delivery-stats") return response({ total_bot: 1, total_failures: 0, recent_failures: [] });
  if (path === "/debug/instructions") return response(read("debug_instructions", []));
  if (path === "/admin/case-analyses") {
    const localItems = read("case_analyses", seedAnalyses).map((item) => normalizeCaseAnalysisRecord(item));
    const cloudItems = await loadCloudCaseAnalyses();
    let items = mergeCaseAnalysisItems(localItems, cloudItems);
    const qualificacao = getQueryParam(url, "qualificacao");
    if (qualificacao && qualificacao !== "all") items = items.filter((i) => i.qualificacao === qualificacao);
    return response(getCaseAnalysesPayload(items));
  }
  if (path.startsWith("/admin/case-analyses/")) {
    const id = path.split("/").pop();
    const localItems = read("case_analyses", seedAnalyses).map((item) => normalizeCaseAnalysisRecord(item));
    const cloudItems = await loadCloudCaseAnalyses();
    const items = mergeCaseAnalysisItems(localItems, cloudItems);
    const analysis = items.find((i) => i.id === id || i.session_id === id) || items[0] || normalizeCaseAnalysisRecord(seedAnalyses[0]);
    const transcripts = read("case_transcripts", {});
    const localMessages = (analysis?.session_id && Array.isArray(transcripts[analysis.session_id]))
      ? transcripts[analysis.session_id]
      : (seedMessages["contact-1"] || []);
    const cloudMessages = await loadCloudTranscript(analysis);
    const conversationMessages = cloudMessages.length ? [] : await loadConversationTranscript(analysis?.session_id);
    const messages = cloudMessages.length ? cloudMessages : (conversationMessages.length ? conversationMessages : localMessages);
    return response({ analysis, messages });
  }
  if (path === "/legislation/today") {
    const todayKey = new Date().toISOString().slice(0, 10);
    try {
      const cached = JSON.parse(localStorage.getItem("legal_brief_cache") || "null");
      if (cached && cached.key === todayKey && cached.data?.brief) return response(cached.data);
    } catch {}
    try {
      const { data, error } = await supabase.functions.invoke("legal-brief", { body: {} });
      if (!error && data?.brief) {
        try { localStorage.setItem("legal_brief_cache", JSON.stringify({ key: todayKey, data })); } catch {}
        return response(data);
      }
    } catch (e) { console.error("legal-brief invoke", e); }
    return response({ date_human: new Date().toLocaleDateString("pt-BR"), brief: "Não consegui carregar o resumo legal agora. Tente novamente em instantes." });
  }
  if (path === "/whatsapp/elevenlabs/voices") return response({ voices: [] });
  return response({ ok: false, error: "STATIC_MODE", fallback: true });
};

const staticPost = (url, body = {}) => {
  const [path] = String(url).split("?");
  if (path === "/public/leads" || path === "/leads") {
    const leads = read("leads", seedLeads);
    const lead = { id: nextId("lead"), stage: "novos_leads", urgency: "media", score: 50, created_at: nowIso(), ...body };
    leads.unshift(lead);
    write("leads", leads);
    return response(lead, 201);
  }
  if (path === "/whatsapp/send") {
    const messages = read("messages", seedMessages);
    const msg = { id: nextId("msg"), text: body.text, from_me: true, created_at: nowIso() };
    messages[body.contact_id] = [...(messages[body.contact_id] || []), msg];
    write("messages", messages);
    return response({ message: msg, provider_result: { static: true } });
  }
  if (path === "/chat/message") {
    return (async () => {
      const sessionId = body.session_id || nextId("session");
      const userMessage = body.message || body.text || "";
      const localAnalysis = buildLocalCaseAnalysis(body.history || [], userMessage);
      const fallbackReply =
        "Tive uma instabilidade momentânea. Estou aqui para te ajudar; pode me contar o que aconteceu em uma frase curta?";

      // Persiste/atualiza a análise do caso para que apareça na tela "Casos analisados pela IA",
      // mesmo quando for um caso totalmente novo (ex.: Erik).
      const persistAnalysis = (analysis, replyText, syncCloud = true) => {
        try {
          const items = read("case_analyses", seedAnalyses);
          const idx = items.findIndex((i) => i.session_id === sessionId);
          const base = idx >= 0 ? items[idx] : { id: safeCaseId(sessionId), session_id: sessionId, created_at: nowIso() };
          const merged = normalizeCaseAnalysisRecord({
            ...base,
            ...analysis,
            session_id: sessionId,
            visitor_name: body.visitor_name || base.visitor_name || "Cliente",
            visitor_phone: body.visitor_phone || base.visitor_phone || "",
            updated_at: nowIso(),
            admin_notes: base.admin_notes || "",
          });
          if (idx >= 0) items[idx] = merged;
          else items.unshift(merged);
          write("case_analyses", items);

          // Salva também a transcrição da conversa por session_id para o admin abrir.
          const transcripts = read("case_transcripts", {});
          const prev = Array.isArray(transcripts[sessionId]) ? transcripts[sessionId] : [];
          const next = [
            ...prev,
            { role: "user", content: userMessage, ts: nowIso() },
            { role: "assistant", content: replyText, ts: nowIso() },
          ];
          transcripts[sessionId] = next.slice(-100);
          write("case_transcripts", transcripts);
          if (syncCloud) persistCloudCaseAnalysis(merged, next.slice(-2)).catch(() => {});
        } catch (err) {
          console.warn("Falha ao persistir análise do caso", err);
        }
      };

      try {
        const currentPrompt = loadChatConfig().prompt || "";
        const { data, error } = await supabase.functions.invoke("chat-ai", {
          body: {
            ...body,
            message: userMessage,
            history: body.history || [],
            session_id: sessionId,
            user_id: body.user_id || null,
            want_audio: body.want_audio !== undefined ? body.want_audio : false,
            prompt: currentPrompt || undefined,
          },
        });
        if (!error && data?.response) {
          const cleanedResponse = cleanInternalChatMarkers(data.response);
          const responseText = isNearDuplicateReply(cleanedResponse, body.history || [])
            ? buildNonRepeatingFallback(userMessage)
            : cleanedResponse;
          const finalAnalysis = normalizeCaseAnalysis(data.analysis, localAnalysis);
          persistAnalysis(finalAnalysis, responseText, false);
          return response({
            session_id: data.session_id || sessionId,
            response: responseText,
            audio_base64: data.audio_base64 || null,
            appointment: data.appointment || null,
            handoff: Boolean(data.handoff),
            speaker: data.speaker || null,
            analysis: finalAnalysis,
            ai_provider: data.ai_provider || null,
            ai_model: data.ai_model || null,
            server_time: null,
          });
        }
      } catch (e) {
        console.warn("chat-ai falhou; usando resposta local de contingência", e);
      }
      persistAnalysis(localAnalysis, fallbackReply, true);
      return response({
        session_id: sessionId,
        response: fallbackReply,
        audio_base64: null,
        analysis: localAnalysis,
      });
    })();
  }



  if (path === "/finance/transactions") return insertItem("transactions", seedTransactions, "tx", body);
  if (path === "/appointments") {
    return (async () => {
      try {
        const start = body.starts_at ? new Date(body.starts_at) : new Date();
        // Usa componentes LOCAIS para evitar que UTC empurre a data para o dia
        // seguinte (ex.: agendamento às 22h em São Paulo virava dia +1).
        const pad = (n) => String(n).padStart(2, "0");
        const localDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
        const localTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
        const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: null }));
        const { data, error } = await supabase
          .from("appointments")
          .insert({
            user_id: authData?.user?.id || null,
            client_name: body.client_name || "Cliente",
            phone: body.phone || null,
            email: body.email || null,
            legal_area: body.area || body.legal_area || body.title || "Atendimento jurídico",
            case_summary: body.notes || null,
            appointment_date: localDate,
            appointment_time: localTime,
            source: body.source || "panel",
            status: body.status === "confirmado" ? "scheduled" : body.status || "scheduled",
            raw_payload: body,
          })
          .select("*")
          .single();
        if (error) throw error;
        return response(normalizeAppointment({ ...body, ...data }), 201);
      } catch {
        return insertItem("appointments", seedAppointments, "appt", normalizeAppointment(body));
      }
    })();
  }
  if (path === "/legal-deadlines/sync") {
    const items = read("legal_deadlines", seedLegalDeadlines);
    const synced = { providers: ["Escavador", "Jusbrasil", "Data Lawyer"], fallback: true, updated_at: nowIso() };
    write("legal_deadlines", items.map((item) => ({ ...item, last_sync_at: synced.updated_at })));
    return response({ ok: true, synced, items });
  }
  if (path === "/legal-deadlines") return insertItem("legal_deadlines", seedLegalDeadlines, "deadline", { status: "pending", urgency: "media", whatsapp_notified: false, ...body });
  if (path.startsWith("/legal-deadlines/") && path.endsWith("/notify")) {
    const id = path.split("/")[2];
    const items = read("legal_deadlines", seedLegalDeadlines);
    const updated = items.map((item) => item.id === id ? { ...item, whatsapp_notified: true, notified_at: nowIso(), notification_channel: "app" } : item);
    write("legal_deadlines", updated);
    return response({ ok: true, channel: "app", fallback: true });
  }
  if (path === "/processes") return insertItem("processes", seedProcesses, "proc", body);
  if (path === "/creatives/generate") {
    return (async () => {
      const topic = body.topic || body.title || body.prompt || "post jurídico";
      let b64 = "";
      let genError = null;
      try {
        const { data, error } = await supabase.functions.invoke("generate-cover-image", {
          body: {
            prompt: topic,
            title: body.title || "",
            subtitle: body.subtitle || "",
            network: body.network || "",
            format: body.format || "",
            tone: body.tone || "",
            case_type: body.case_type || "",
            reference_image_base64: body.reference_image_base64 || null,
            logo_base64: body.logo_base64 || null,
            provider: body.provider || "auto",
          },
        });

        if (error) throw error;
        b64 = data?.image_data_url || data?.b64_json || "";
        if (!b64 && data?.error) genError = data.error;
      } catch (e) {
        genError = e?.message || String(e);
      }
      if (!b64) b64 = buildLocalCreativeImage(body.title || topic, topic);
      const storedImage = await compactImageForStorage(b64);
      // Persiste a imagem gerada no bucket creative-assets + tabela generated_images
      let storagePath = null;
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) {
          console.warn("[creatives] usuário não autenticado — imagem só será salva localmente.");
        } else if (b64) {
          const { blob, contentType } = await imageToBlob(b64);
          storagePath = `${uid}/creative-${Date.now()}.png`;
          const { error: upErr } = await supabase.storage
            .from("creative-assets")
            .upload(storagePath, blob, { contentType, upsert: true });
          if (!upErr) {
            const { error: insErr } = await supabase.from("generated_images").insert({
              user_id: uid, storage_path: storagePath, prompt: topic, kind: "creative", paid: false,
              title: body.title || null, network: body.network || "instagram", format: body.format || "post",
              caption: body.caption || null, tone: body.tone || null, case_type: body.case_type || null,
            });
            if (insErr) console.warn("[creatives] insert generated_images falhou:", insErr.message);
          } else {
            console.warn("[creatives] upload bucket falhou:", upErr.message);
            storagePath = null;
          }
        }
      } catch (e) {
        console.warn("[creatives] persistência falhou:", e?.message || e);
      }
      const item = {
        id: nextId("creative"),
        ...body,
        caption: (body.caption && String(body.caption).trim()) || `Post sugerido: ${topic}.\n\nExplique o direito com clareza, convide o cliente a separar documentos e finalize com chamada para atendimento.`,
        image_b64: storedImage,
        storage_path: storagePath,
        ...(genError ? { error: genError } : {}),
      };
      const items = read("creatives", seedCreatives);
      items.unshift(item);
      write("creatives", items);
      return response(item, 201);

    })();
  }
  if (path === "/debug/instruction") {
    const items = read("debug_instructions", []);
    items.unshift({ id: nextId("debug"), instruction: body.instruction, created_at: nowIso() });
    write("debug_instructions", items);
    return response({ ok: true });
  }
  if (path === "/settings/test-text" || path === "/settings/test-image") return response({ ok: false, error: "Modo estático: backend de teste indisponível.", model: "static" });
  if (path === "/whatsapp/test-connection") return response({ connected: false, provider: "static", error: "STATIC_MODE", hint: "Site publicado como estático; conexão real de WhatsApp exige backend externo." });
  if (path.startsWith("/whatsapp/")) return response({ ok: false, connected: false, fallback: true, state: "offline", error: "STATIC_MODE" });
  if (path === "/legislation/refresh" || path === "/seed/demo") return response({ ok: true });
  if (path === "/creatives/fuse-images") {
    return (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("fuse-images", {
          body: {
            image1_base64: body.image1_base64,
            image2_base64: body.image2_base64,
            prompt: body.prompt || "",
            mode: body.mode,
            output_preset: body.output_preset || null,
          },
        });
        if (error) throw error;
        return response(data);
      } catch (e) {
        return response({ ok: false, error: e?.message || String(e) });
      }
    })();
  }
  if (path === "/creatives/edit") {
    return (async () => {
      try {
        let sourceImage = body.image_base64 || body.image_b64 || body.image || "";
        if (!sourceImage) return response({ ok: false, error: "Imagem original ausente" });
        // If saved generated image is an https signed URL, fetch and convert to base64
        // so the Emergent/nano-banana edit pipeline receives valid image bytes.
        if (/^https?:\/\//i.test(sourceImage) || sourceImage.startsWith("blob:")) {
          try {
            const r = await fetch(sourceImage);
            const blob = await r.blob();
            sourceImage = await new Promise((resolve, reject) => {
              const fr = new FileReader();
              fr.onload = () => resolve(String(fr.result || ""));
              fr.onerror = () => reject(fr.error || new Error("read failed"));
              fr.readAsDataURL(blob);
            });
          } catch (e) {
            return response({ ok: false, error: "Não foi possível baixar a imagem original para edição" });
          }
        }
        const { data, error } = await supabase.functions.invoke("edit-creative", {
          body: { image_base64: sourceImage, prompt: body.prompt || body.instruction || "" },
        });
        if (error) throw error;
        if (!data?.ok || !(data?.image || data?.image_b64)) {
          return response({ ok: false, error: data?.error || "Edição não retornou imagem" });
        }
        const newImage = await compactImageForStorage(data.image || data.image_b64);
        const generatedImageId = body.generated_image_id || generatedImageIdFromCreativeId(body.id);
        const saved = await persistEditedCreativeImage({
          image: newImage,
          prompt: body.prompt || body.instruction || "Criativo editado",
          storagePath: body.storage_path || null,
          generatedImageId,
        });
        if (body.id) {
          const items = read("creatives", seedCreatives);
          const existingIndex = items.findIndex((item) => item.id === body.id);
          const edited = {
            ...(existingIndex >= 0 ? items[existingIndex] : body),
            id: body.id,
            title: body.title || (existingIndex >= 0 ? items[existingIndex].title : "Criativo editado"),
            caption: body.caption || (existingIndex >= 0 ? items[existingIndex].caption : ""),
            network: body.network || (existingIndex >= 0 ? items[existingIndex].network : "instagram"),
            format: body.format || (existingIndex >= 0 ? items[existingIndex].format : "post"),
            image_b64: newImage,
            storage_path: saved.storagePath || body.storage_path || (existingIndex >= 0 ? items[existingIndex].storage_path : null),
            generated_image_id: saved.generatedImageId || generatedImageId || (existingIndex >= 0 ? items[existingIndex].generated_image_id : null),
            last_edit_prompt: body.prompt || null,
            updated_at: nowIso(),
          };
          if (existingIndex >= 0) items[existingIndex] = edited;
          else items.unshift(edited);
          write("creatives", items);
        }
        return response({ ok: true, image_b64: newImage, image: newImage, storage_path: saved.storagePath, generated_image_id: saved.generatedImageId, saved: saved.saved });
      } catch (e) {
        return response({ ok: false, error: e?.message || String(e) });
      }
    })();
  }

  if (path === "/public/consulta") return response({ found: true, processes: seedProcesses, client_name: "Cliente demonstração" });
  return response({ ok: false, fallback: true, error: "STATIC_MODE" });
};

const insertItem = (key, fallback, prefix, body) => {
  const items = read(key, fallback);
  const item = { id: nextId(prefix), created_at: nowIso(), ...body };
  items.unshift(item);
  write(key, items);
  return response(item, 201);
};

const staticPut = (url, body = {}) => {
  const [path] = String(url).split("?");
  if (path === "/whatsapp/config") {
    const cfg = withCurrentBotPrompt({ ...read("whatsapp_config", defaultWhatsAppConfig), ...body });
    write("whatsapp_config", cfg);
    return response(cfg);
  }
  if (path === "/settings") return response({ ok: true });
  return response({ ok: true, fallback: true });
};

const buildAppointmentDateTimePayload = (body = {}) => {
  const next = {};
  if (body.starts_at) {
    const start = new Date(body.starts_at);
    if (!Number.isNaN(start.getTime())) {
      const pad = (n) => String(n).padStart(2, "0");
      next.appointment_date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      next.appointment_time = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    }
  }
  if (body.appointment_date) next.appointment_date = String(body.appointment_date).slice(0, 10);
  if (body.appointment_time) next.appointment_time = String(body.appointment_time).slice(0, 5);
  return next;
};

const buildAppointmentUpdatePayload = (body = {}) => {
  const payload = { ...buildAppointmentDateTimePayload(body) };
  if (body.client_name !== undefined) payload.client_name = body.client_name || "Cliente";
  if (body.phone !== undefined) payload.phone = body.phone || null;
  if (body.email !== undefined) payload.email = body.email || null;
  if (body.legal_area !== undefined || body.area !== undefined || body.title !== undefined) {
    payload.legal_area = body.legal_area || body.area || body.title || "Atendimento jurídico";
  }
  if (body.case_summary !== undefined || body.notes !== undefined) payload.case_summary = body.case_summary || body.notes || null;
  if (body.status !== undefined) payload.status = body.status === "confirmado" ? "scheduled" : body.status;
  if (body.source !== undefined) payload.source = body.source;
  payload.updated_at = nowIso();
  return payload;
};

const staticPatch = async (url, body = {}) => {
  const [path] = String(url).split("?");
  const updateCollection = (key, fallback) => {
    const id = path.split("/").pop();
    const items = read(key, fallback).map((item) => (item.id === id ? { ...item, ...body } : item));
    write(key, items);
    return response(items.find((item) => item.id === id) || { ok: true });
  };
  if (path.startsWith("/leads/")) return updateCollection("leads", seedLeads);
  if (path.startsWith("/finance/transactions/")) return updateCollection("transactions", seedTransactions);
  if (path.startsWith("/appointments/")) {
    const id = path.split("/").pop();
    try {
      const payload = buildAppointmentUpdatePayload(body);
      const { data, error } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (data) return response(normalizeAppointment(data));
    } catch (err) {
      console.warn("Falha ao atualizar agendamento no banco; usando fallback local", err);
    }
    return updateCollection("appointments", seedAppointments);
  }
  if (path.startsWith("/legal-deadlines/")) return updateCollection("legal_deadlines", seedLegalDeadlines);
  if (path.startsWith("/admin/case-analyses/")) {
    const id = path.split("/").pop();
    const localItems = read("case_analyses", seedAnalyses).map((item) => normalizeCaseAnalysisRecord(item));
    const cloudItems = await loadCloudCaseAnalyses();
    const current = mergeCaseAnalysisItems(localItems, cloudItems).find((item) => item.id === id || item.session_id === id) || { id };
    const updated = normalizeCaseAnalysisRecord({ ...current, ...body, updated_at: nowIso() });
    const without = localItems.filter((item) => item.id !== updated.id && item.session_id !== updated.session_id);
    write("case_analyses", [updated, ...without]);
    await persistCloudCaseAnalysis(updated, []);
    return response(updated);
  }
  return response({ ok: true, fallback: true });
};

const staticDelete = (url) => {
  const [path] = String(url).split("?");
  const removeFrom = (key, fallback) => {
    const id = path.split("/").pop();
    write(key, read(key, fallback).filter((item) => item.id !== id));
    return response({ ok: true });
  };
  if (path.startsWith("/leads/")) return removeFrom("leads", seedLeads);
  if (path.startsWith("/finance/transactions/")) return removeFrom("transactions", seedTransactions);
  if (path.startsWith("/appointments/")) return removeFrom("appointments", seedAppointments);
  if (path.startsWith("/legal-deadlines/")) return removeFrom("legal_deadlines", seedLegalDeadlines);
  if (path.startsWith("/processes/")) return removeFrom("processes", seedProcesses);
  if (path.startsWith("/creatives/")) return removeFrom("creatives", seedCreatives);
  return response({ ok: true, fallback: true });
};

const liveApi = axios.create({ baseURL: API });

liveApi.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("lf_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  // Injeta ?instance=<nome> nas rotas Baileys para suportar múltiplos números.
  const url = String(cfg.url || "");
  if (url.startsWith("/whatsapp/baileys")) {
    const inst = readBaileysInstance();
    if (inst) {
      cfg.params = { ...(cfg.params || {}), instance: inst };
    }
  }
  return cfg;
});


liveApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("lf_token");
      localStorage.removeItem("lf_user");
      if (!window.location.pathname.startsWith("/login") && window.location.pathname !== "/") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

const cloudFirstGetPaths = new Set(["/appointments", "/legal-deadlines", "/creatives", "/whatsapp/default-prompt", "/legislation/today", "/admin/case-analyses"]);
const cloudFirstPostPaths = new Set(["/chat/message", "/creatives/generate", "/creatives/fuse-images", "/creatives/edit", "/appointments", "/legal-deadlines", "/legal-deadlines/sync", "/leads", "/public/leads"]);
const staticOnlyMutationPrefixes = ["/leads/"];
const liveFirstWithStaticFallbackPostPaths = new Set([]);
const fallbackToStaticPostPaths = new Set(["/debug/instruction"]);

// Caminhos que, quando o backend live (Render) falha ou devolve lista vazia,
// caem para os dados estáticos de demonstração — assim o painel nunca aparece
// "vazio" no ambiente publicado (Render) caso o backend ainda não tenha
// populado leads/contatos/processos/etc.
const fallbackToStaticGetPaths = new Set([
  "/leads",
  "/whatsapp/contacts",
  "/processes",
  "/finance/transactions",
  "/crm/stages",
  "/dashboard/metrics",
  "/admin/case-analyses",
  "/debug/instructions",
  "/legal-deadlines",
]);

const isEmptyPayload = (data) => {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "object" && "items" in data) return !data.items || data.items.length === 0;
  return false;
};

const backendSafeGetPaths = new Set([
  "/whatsapp/diagnostics",
  "/whatsapp/baileys/status",
  "/whatsapp/baileys/qr",
  "/whatsapp/qr",
  "/whatsapp/qr/image",
]);

export const api = HAS_BACKEND
  ? {
      get: async (url, config) => {
        const [path] = String(url).split("?");
        const isCaseDetail = path.startsWith("/admin/case-analyses/");
        if (isCaseDetail) return staticGet(url, config);
        if (cloudFirstGetPaths.has(path)) return staticGet(url, config);
        try {
          const res = await liveApi.get(url, config);
          if (fallbackToStaticGetPaths.has(path) && isEmptyPayload(res?.data)) {
            return staticGet(url, config);
          }
          if (isCaseDetail && isEmptyPayload(res?.data)) {
            return staticGet(url, config);
          }
          if (path === "/whatsapp/config") {
            return { ...res, data: withCurrentBotPrompt(res?.data || {}) };
          }
          return res;
        } catch (err) {
          if (backendSafeGetPaths.has(path)) return staticGet(url, config);
          if (fallbackToStaticGetPaths.has(path)) return staticGet(url, config);
          if (isCaseDetail) return staticGet(url, config);
          throw err;
        }
      },
      post: (url, body, config) => {
        const [path] = String(url).split("?");
        if (path.startsWith("/legal-deadlines/")) return staticPost(url, body);
        if (cloudFirstPostPaths.has(path)) return staticPost(url, body);
        if (liveFirstWithStaticFallbackPostPaths.has(path)) {
          return liveApi.post(url, body, config).catch(() => staticPost(url, body));
        }
        if (fallbackToStaticPostPaths.has(path)) {
          return liveApi.post(url, body, config).catch(() => staticPost(url, body));
        }
        return liveApi.post(url, body, config);
      },
      put: liveApi.put.bind(liveApi),
      patch: (url, body, config) => {
        const p = String(url).split("?")[0];
        if (p.startsWith("/appointments/") || p.startsWith("/admin/case-analyses/") || p.startsWith("/legal-deadlines/") || staticOnlyMutationPrefixes.some((pre) => p.startsWith(pre))) {
          return staticPatch(url, body);
        }
        return liveApi.patch(url, body, config);
      },
      delete: (url, config) => {
        const p = String(url).split("?")[0];
        if (p.startsWith("/legal-deadlines/") || staticOnlyMutationPrefixes.some((pre) => p.startsWith(pre))) {
          return staticDelete(url);
        }
        return liveApi.delete(url, config);
      },
    }
  : {
      get: staticGet,
      post: staticPost,
      put: staticPut,
      patch: staticPatch,
      delete: staticDelete,
    };
