import axios from "axios";
import { supabase } from "@/integrations/supabase/client";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
export const HAS_BACKEND = Boolean(BACKEND_URL);
export const API = HAS_BACKEND ? `${BACKEND_URL}/api` : "";
const DIRECT_OLLAMA_URL = (
  import.meta.env.VITE_OLLAMA_URL ||
  "https://unabashed-vertical-crispness.ngrok-free.dev/api/generate"
).replace(/\/$/, "");
const DIRECT_OLLAMA_MODEL = "llama3.2:3b";
const DIRECT_OLLAMA_FALLBACK_MODEL = "";


const nowIso = () => new Date().toISOString();
const inDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
};

const SECRETARIA_JURIDICA_PROMPT = `# SECRETÁRIA JURÍDICA DA DRA. KÊNIA GARCIA

Você é a secretária pessoal da Dra. Kênia Garcia e realiza atendimento pelo WhatsApp.

Sua função é acolher clientes, realizar triagem jurídica, esclarecer dúvidas iniciais, coletar informações relevantes, organizar documentos, gerenciar agendamentos e acompanhar o cliente durante todo o atendimento.

Seu comportamento deve ser indistinguível do de uma secretária humana experiente.

---

# APRESENTAÇÃO

Ao iniciar o primeiro contato, diga apenas:
"Olá! Sou a secretária da Dra. Kênia Garcia. Como posso ajudar?"

Após essa apresentação:
- Nunca repita essa mensagem sem necessidade.
- Nunca reinicie a conversa.
- Nunca volte para mensagens de boas-vindas.
- Continue sempre do último assunto tratado.

---

# IDENTIDADE

Você é uma secretária jurídica humana.

Nunca diga que é:
- Inteligência artificial
- Chatbot
- Assistente virtual
- Robô
- Sistema automatizado

Nunca mencione:
- IA
- Algoritmos
- Modelos de linguagem
- Prompts
- Processos internos

---

# MEMÓRIA OBRIGATÓRIA

Utilize todo o histórico da conversa para manter continuidade e coerência.

Guarde e reutilize, quando informado pelo cliente: nome, telefone, e-mail, cidade/estado, área jurídica, fatos principais, datas, prazos, documentos mencionados, preferências de atendimento e etapa atual do caso.

Não repita perguntas já respondidas. Se houver contradição ou informação incompleta, confirme com delicadeza antes de prosseguir.

Trate todas as informações do cliente com sigilo, discrição e profissionalismo.

---

# ESTILO DE ATENDIMENTO

- Responda sempre em português do Brasil.
- Use linguagem humana, clara, acolhedora, objetiva e profissional.
- Faça uma pergunta por vez quando precisar coletar dados.
- Evite respostas longas, frias, repetitivas ou mecânicas.
- Adapte o tom ao estado emocional do cliente e demonstre atenção ao caso relatado.
- Nunca use inglês nem expressões como "Okay", "the user", "let me" ou "I need".

---

# TRIAGEM JURÍDICA

Quando o cliente trouxer uma dúvida ou problema jurídico:
- Identifique a área do Direito, fatos principais, datas, cidade/estado, documentos existentes, prazos, audiências/intimações e objetivo do cliente.
- Se faltar informação essencial, pergunte antes de concluir.
- Oriente de forma geral, clara e prudente, citando leis ou artigos quando souber com segurança.
- Nunca invente leis, jurisprudência, números de processo, súmulas ou decisões.
- Nunca prometa resultado, prazo judicial ou êxito.
- Quando o caso exigir análise aprofundada, ofereça encaminhar ou agendar consulta com a Dra. Kênia Garcia.

Use como referência de abordagem ferramentas jurídicas brasileiras como JusAI, Lexias, JusExpertia, LEIA Solutions e LexValia: pesquisa legal cuidadosa, linguagem acessível, organização de fatos, análise preliminar e indicação de próximos passos sem substituir a análise da advogada.

---

# AGENDAMENTOS

Quando o cliente quiser marcar consulta, audiência, reunião, prazo ou retorno, colete apenas o que ainda faltar:
1. Nome completo
2. Telefone
3. E-mail
4. Cidade/estado
5. Área jurídica
6. Breve resumo do caso
7. Data desejada (dd/mm/aaaa)
8. Horário desejado (HH:MM)
9. Modalidade (online/presencial)

Ao ter todos os dados, confirme em linguagem natural e inclua na mesma mensagem, ao final, o bloco JSON exato entre as marcações abaixo, sem markdown e sem crases:

<AGENDAMENTO>
{"nome":"","telefone":"","email":"","cidade":"","area_juridica":"","resumo_caso":"","data_agendamento":"YYYY-MM-DD","horario_agendamento":"HH:MM"}
</AGENDAMENTO>

---

# SAUDAÇÕES, DATA E HORA

Ao receber uma saudação simples, responda de forma natural e cordial.

Exemplos:
- Cliente: "Bom dia" → "Bom dia! Como posso ajudar?"
- Cliente: "Boa tarde" → "Boa tarde! Como posso ajudar?"
- Cliente: "Boa noite" → "Boa noite! Como posso ajudar?"
- Cliente: "Oi" → "Olá! Como posso ajudar?"
- Cliente: "Olá" → "Olá! Como posso ajudar?"

Não informe automaticamente data, hora ou dia da semana. Só informe quando o cliente pedir explicitamente.

## CONSULTAS DE DATA
Se o cliente perguntar "Que dia é hoje?", "Qual a data de hoje?", "Qual é a data?", "Estamos em que dia?", responda usando a data atual correta do sistema.
Exemplo: "Hoje é 08 de junho de 2026."

## CONSULTAS DE DIA DA SEMANA
Se o cliente perguntar "Que dia da semana é hoje?", "Hoje é que dia?", "Qual é o dia da semana?", responda usando o dia da semana correto.
Exemplo: "Hoje é segunda-feira."

## CONSULTAS DE HORA
Se o cliente perguntar "Que horas são?", "Qual a hora?", "Pode me informar o horário atual?", responda usando o horário atual correto do sistema.
Exemplo: "Agora são 15h42."

## CONSULTAS COMBINADAS
Se o cliente solicitar simultaneamente data, dia e hora ("Qual a data e hora de agora?"), responda:
"Hoje é 08 de junho de 2026, segunda-feira, e agora são 15h42."

## REGRAS IMPORTANTES
- Utilize sempre o horário oficial de Brasília (America/Sao_Paulo).
- Nunca invente datas ou horários.
- Nunca informe horários aproximados.
- Nunca diga que não possui acesso à data ou hora.
- Nunca transforme uma pergunta sobre data ou hora em explicação técnica.
- Responda de forma natural, como uma secretária humana.
- Se a mensagem contiver apenas uma saudação, responda apenas à saudação e ofereça ajuda, sem acrescentar data ou horário.

---

# CONTROLE DE REPETIÇÃO E CONTINUIDADE DE CONVERSA

É proibido:
- Repetir saudações.
- Repetir explicações já fornecidas.
- Repetir perguntas já respondidas.
- Repetir solicitações de documentos.
- Repetir solicitações de dados já cadastrados.
- Reiniciar o atendimento sem necessidade.

Caso a informação já exista, responda: "Já tenho essa informação registrada."
Caso o documento já tenha sido enviado, responda: "Recebi esse documento anteriormente."

---

# CONCORDÂNCIA E RESPOSTAS DE CONTINUIDADE

A resposta deve ter concordância direta com a última mensagem recebida do cliente.

Antes de responder:
1. Identifique a intenção da última mensagem.
2. Analise o histórico para evitar repetir informações, perguntas ou pedidos já feitos.
3. Dê continuidade ao último assunto tratado, avançando a conversa.
4. Use o nome, dados e contexto já fornecidos pelo cliente.
5. Garanta coerência com tudo que já foi conversado.

---

# TAMANHO E OBJETIVIDADE DAS RESPOSTAS

- Responda SEMPRE de forma curta, direta e objetiva, no estilo de mensagem de WhatsApp.
- Prefira 2 a 4 frases curtas (≈ 60 palavras / 350 caracteres). Se o assunto realmente exigir mais, pode ultrapassar esse limite, mas sempre resumindo ao máximo e sem repetições nem enrolação.
- Faça apenas UMA pergunta por vez. Não empilhe múltiplas perguntas na mesma mensagem.
- Não repita o que o cliente disse, não faça introduções longas, não explique o óbvio, não use disclaimers extensos.
- Evite listas longas; se precisar listar, use no máximo 3 itens curtos.
- Quebre informações em mensagens curtas em vez de mandar um texto único e gigante.
- Prefira responder primeiro e só pedir detalhes adicionais se realmente necessário.

---

# FORMATAÇÃO DAS RESPOSTAS (WHATSAPP)

- Responda SEMPRE em texto puro, compatível com WhatsApp.
- É PROIBIDO usar tags HTML como <font>, <span>, <div>, <b>, <i>, <u>, <color>, <br>, etc.
- É PROIBIDO usar atributos como color="...", style="...", class="...".
- Não use cores, fontes, tamanhos ou qualquer marcação visual via HTML/CSS.
- Para ênfase no WhatsApp, use apenas a formatação nativa: *negrito*, _itálico_, ~tachado~, \`\`\`código\`\`\`.
- Quebre linhas com \n simples, sem <br>.
- Nunca envolva nomes, saudações ou frases em tags coloridas (ex.: <font color="blue">...</font>). Escreva o texto cru.

---

# LIMITES ÉTICOS

- Você pode prestar informações jurídicas iniciais e organizar o atendimento.
- Não substitua consulta formal com advogada regularmente inscrita na OAB.
- Em temas sensíveis, urgentes ou com risco de prazo, recomende atendimento direto com a Dra. Kênia Garcia.

Entregue somente a resposta final pronta para o cliente.`;

export const DEFAULT_PROMPT = SECRETARIA_JURIDICA_PROMPT;

const OFFICIAL_GREETING = "Olá! Sou a secretária da Dra. Kênia Garcia. Como posso ajudar?";
const OLLAMA_SYSTEM_PROMPT = SECRETARIA_JURIDICA_PROMPT;

const buildOllamaPrompt = (prompt) => `/no_think
${OLLAMA_SYSTEM_PROMPT}

INSTRUÇÃO CRÍTICA: se você começar a raciocinar em voz alta, pare e responda apenas a resposta final em português.
Se o cliente pedir data, dia da semana ou hora atual, responda com a data/hora de America/Sao_Paulo informada no prompt.

${prompt}

Resposta final em português do Brasil:`;

const cleanInternalChatMarkers = (text) =>
  String(text || "")
    .replace(/<?\/?\s*HANDOFF[_\s-]*K[EÊ]NIA\s*\/?>/giu, "")
    .replace(/`{1,3}\s*HANDOFF[_\s-]*K[EÊ]NIA\s*`{1,3}/giu, "")
    .trim();

const sanitizeOllamaReply = (reply, userMessage = "") => {
  const text = cleanInternalChatMarkers(reply).replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
  if (/Tudo bem\?\s*Sou a assistente virtual da Dra\.\s*K[êe]nia Garcia/i.test(text)) return OFFICIAL_GREETING;
  const looksLikeThinking = /^(okay|ok,|the user|let me|i need|i should|we need|first,|so i|a resposta|vou analisar|preciso)/i.test(text);
  const isInitialGreeting = /^(ol[aá]|oi|bom dia|boa tarde|boa noite|hello|hi)\b/i.test(String(userMessage || "").trim());
  if (looksLikeThinking && isInitialGreeting) return OFFICIAL_GREETING;
  return text;
};

const isInvalidOllamaReply = (text) =>
  /^(okay|ok,|the user|let me|i need|i should|we need|first,|so i)\b/i.test(String(text || "").trim()) ||
  /\b(the user|let me|i need to|i should|instructions)\b/i.test(String(text || "").slice(0, 260));

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
  if (userAskedTemporalInfo(text)) return buildTemporalAnswer();
  if (/\b(agendar|marcar|consulta|reuni[aã]o|hor[aá]rio|atendimento)\b/i.test(text)) {
    return "Claro. Para registrar a consulta, me envie nome completo, telefone, e-mail, cidade/estado, área do caso, data e horário desejados.";
  }
  if (/\b(div[oó]rcio|guarda|pens[aã]o|fam[ií]lia|invent[aá]rio|trabalhista|demiss[aã]o|rescis[aã]o|inss|aposentadoria|consumidor|audi[eê]ncia|intima[cç][aã]o)\b/i.test(text)) {
    return "Entendi. Para direcionar melhor seu atendimento, me conte quando isso aconteceu, sua cidade/estado e se existe algum prazo ou audiência marcado.";
  }
  return "Entendi. Para seguir sem repetir informações, me conte em poucas palavras o que aconteceu e qual ajuda você precisa agora.";
};

const userAskedTemporalInfo = (text) =>
  /\b(que\s+horas|qual\s+(?:é\s+)?(?:a\s+)?hora|hor[áa]rio\s+atual|agora\s+s[aã]o|data\s+de\s+hoje|qual\s+(?:é\s+)?(?:a\s+)?data|que\s+data|que\s+dia\s+(?:é|estamos|s[aã]o|de\s+hoje)|hoje\s+[ée]\s+que\s+dia|dia\s+da\s+semana|dia\s+de\s+hoje|que\s+m[eê]s|qual\s+(?:o\s+)?(?:dia|m[eê]s|ano))\b/i.test(String(text || ""));

const buildTemporalAnswer = () => {
  const now = new Date();
  const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(now);
  return `Hoje é ${date}, e agora são ${time}.`;
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
const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(`static_api_${key}`);
    return raw ? JSON.parse(raw) : clone(fallback);
  } catch {
    return clone(fallback);
  }
};
const write = (key, value) => localStorage.setItem(`static_api_${key}`, JSON.stringify(value));
const response = (data, status = 200, headers = {}) => Promise.resolve({ data: clone(data), status, statusText: "OK", headers, config: {} });
const nextId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const buildJitsiLink = (seed) => {
  const safe = String(seed || `kenia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .slice(0, 60);
  return `https://meet.jit.si/${safe}`;
};

const normalizeAppointment = (item) => {
  const startsAt = item.starts_at || (item.appointment_date && item.appointment_time
    ? new Date(`${item.appointment_date}T${String(item.appointment_time).slice(0, 5)}:00`).toISOString()
    : nowIso());
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
    })();
  }
  if (path === "/creatives") return response(read("creatives", seedCreatives));
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
    let items = read("case_analyses", seedAnalyses);
    if (!Array.isArray(items) || items.length === 0) {
      items = clone(seedAnalyses);
      write("case_analyses", items);
    }
    const qs = String(url).includes("?") ? String(url).split("?")[1] : "";
    const params = new URLSearchParams(qs);
    const qualif = params.get("qualificacao");
    const filtered = qualif ? items.filter((i) => i.qualificacao === qualif) : items;
    return response({
      total: items.length,
      qualificados: items.filter((i) => i.qualificacao === "qualificado").length,
      nao_qualificados: items.filter((i) => i.qualificacao === "nao_qualificado").length,
      necessita_mais_info: items.filter((i) => i.qualificacao === "necessita_mais_info").length,
      avg_acertividade: items.length ? Math.round(items.reduce((s, i) => s + i.acertividade, 0) / items.length) : 0,
      items: filtered,
    });
  }
  if (path.startsWith("/admin/case-analyses/")) {
    let items = read("case_analyses", seedAnalyses);
    if (!Array.isArray(items) || items.length === 0) items = clone(seedAnalyses);
    const analysis = items.find((i) => i.id === path.split("/").pop()) || items[0] || seedAnalyses[0];
    return response({ analysis, messages: seedMessages["contact-1"] || [] });
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
      const fallbackReply =
        "Tive uma instabilidade momentânea. Estou aqui para te ajudar; pode me contar o que aconteceu em uma frase curta?";
      try {
        const history = (body.history || [])
          .map((m) => `${m.role === "user" ? "Cliente" : "Assistente"}: ${m.content}`)
          .join("\n");
        const system = DEFAULT_PROMPT;
        const userText = body.message || body.text || "";
        if (userAskedTemporalInfo(userText)) {
          return response({
            session_id: sessionId,
            response: buildTemporalAnswer(),
            audio_base64: null,
            appointment: null,
            handoff: false,
            speaker: null,
            analysis: { acertividade: 100, qualificacao: "ok" },
            server_time: new Date().toISOString(),
          });
        }
        const prompt = `${system}\n\nCONTEXTO TEMPORAL INTERNO: ${buildTemporalAnswer()} Use somente se o cliente pedir data ou hora.\n\n${history}\nCliente: ${userText}\nAssistente:`;

        const tryModel = async (modelName) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 45000);
          const res = await fetch(DIRECT_OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ model: modelName, system: OLLAMA_SYSTEM_PROMPT, prompt: buildOllamaPrompt(prompt), stream: false, think: false, keep_alive: "10m", options: { num_ctx: 2048, num_predict: 220, temperature: 0.1 } }),
          }).finally(() => clearTimeout(timeout));
          if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
          const raw = await res.text();
          const data = JSON.parse(raw || "{}");
          if (data?.fallback || data?.error) throw new Error(data.error || "Ollama indisponível");
          const text = sanitizeOllamaReply(data?.response || "", userText);
          if (!text || isInvalidOllamaReply(text)) throw new Error("Ollama retornou raciocínio interno ou resposta inválida");
          return text;
        };

        const candidates = [DIRECT_OLLAMA_MODEL];
        let text = null;
        let lastErr = null;
        for (const m of candidates) {
          try { text = await tryModel(m); break; } catch (err) { lastErr = err; console.warn(`Ollama modelo ${m} falhou, tentando próximo`, err); }
        }
        if (!text) throw lastErr || new Error("Ollama indisponível");

        const responseText = isNearDuplicateReply(text, body.history || [])
          ? buildNonRepeatingFallback(userText)
          : cleanInternalChatMarkers(text);
        return response({
            session_id: sessionId,
            response: responseText,
            audio_base64: null,
            appointment: null,
            handoff: false,
            speaker: null,
            analysis: { acertividade: 80, qualificacao: "ok" },
            server_time: null,
          });
      } catch (e) {
        console.warn("Ollama llama3.2:3b falhou no chat", e);
      }
      return response({
          session_id: sessionId,
          response: fallbackReply,
          audio_base64: null,
          analysis: { acertividade: 40, qualificacao: "fallback" },
        });
    })();
  }



  if (path === "/finance/transactions") return insertItem("transactions", seedTransactions, "tx", body);
  if (path === "/appointments") {
    return (async () => {
      try {
        const start = body.starts_at ? new Date(body.starts_at) : new Date();
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
            appointment_date: start.toISOString().slice(0, 10),
            appointment_time: start.toTimeString().slice(0, 5),
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
            reference_image_base64: body.reference_image_base64 || null,
            logo_base64: body.logo_base64 || null,
          },
        });
        if (error) throw error;
        b64 = data?.image_data_url || data?.b64_json || "";
        if (!b64 && data?.error) genError = data.error;
      } catch (e) {
        genError = e?.message || String(e);
      }
      const item = {
        id: nextId("creative"),
        ...body,
        caption: `Post sugerido: ${topic}.\n\nExplique o direito com clareza, convide o cliente a separar documentos e finalize com chamada para atendimento.`,
        image_b64: b64,
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
          },
        });
        if (error) throw error;
        return response(data);
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

const staticPatch = (url, body = {}) => {
  const [path] = String(url).split("?");
  const updateCollection = (key, fallback) => {
    const id = path.split("/").pop();
    const items = read(key, fallback).map((item) => (item.id === id ? { ...item, ...body } : item));
    write(key, items);
    return response(items.find((item) => item.id === id) || { ok: true });
  };
  if (path.startsWith("/leads/")) return updateCollection("leads", seedLeads);
  if (path.startsWith("/finance/transactions/")) return updateCollection("transactions", seedTransactions);
  if (path.startsWith("/appointments/")) return updateCollection("appointments", seedAppointments);
  if (path.startsWith("/legal-deadlines/")) return updateCollection("legal_deadlines", seedLegalDeadlines);
  if (path.startsWith("/admin/case-analyses/")) return updateCollection("case_analyses", seedAnalyses);
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

const cloudFirstGetPaths = new Set(["/appointments", "/legal-deadlines", "/creatives", "/whatsapp/default-prompt", "/legislation/today"]);
const cloudFirstPostPaths = new Set(["/creatives/generate", "/creatives/fuse-images", "/appointments", "/legal-deadlines", "/legal-deadlines/sync"]);
const liveFirstWithStaticFallbackPostPaths = new Set(["/chat/message"]);
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
  if (typeof data === "object") {
    if ("items" in data) return !data.items || data.items.length === 0;
    if ("total" in data && Number(data.total) === 0) return true;
  }
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
        if (cloudFirstGetPaths.has(path)) return staticGet(url, config);
        try {
          const res = await liveApi.get(url, config);
          if (fallbackToStaticGetPaths.has(path) && isEmptyPayload(res?.data)) {
            return staticGet(url, config);
          }
          if (path === "/whatsapp/config") {
            return { ...res, data: withCurrentBotPrompt(res?.data || {}) };
          }
          return res;
        } catch (err) {
          if (backendSafeGetPaths.has(path)) return staticGet(url, config);
          if (fallbackToStaticGetPaths.has(path)) return staticGet(url, config);
          throw err;
        }
      },
      post: (url, body, config) => {
        const [path] = String(url).split("?");
        if (path.startsWith("/legal-deadlines/")) return staticPost(url, body);
        if (cloudFirstPostPaths.has(path)) return staticPost(url, body);
        if (path === "/chat/message") return staticPost(url, body);
        if (liveFirstWithStaticFallbackPostPaths.has(path)) {
          return liveApi.post(url, body, config).catch(() => staticPost(url, body));
        }
        if (fallbackToStaticPostPaths.has(path)) {
          return liveApi.post(url, body, config).catch(() => staticPost(url, body));
        }
        return liveApi.post(url, body, config);
      },
      put: liveApi.put.bind(liveApi),
      patch: (url, body, config) => String(url).split("?")[0].startsWith("/legal-deadlines/") ? staticPatch(url, body) : liveApi.patch(url, body, config),
      delete: (url, config) => String(url).split("?")[0].startsWith("/legal-deadlines/") ? staticDelete(url) : liveApi.delete(url, config),
    }
  : {
      get: staticGet,
      post: staticPost,
      put: staticPut,
      patch: staticPatch,
      delete: staticDelete,
    };
