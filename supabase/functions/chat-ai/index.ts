import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/llm.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const EMERGENT_API_KEY = Deno.env.get("EMERGENT_API_KEY");
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const ELEVENLABS_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") || "EXAVITQu4vr4xnSDxMaL"; // Sarah (PT-BR natural)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OLLAMA_BASE_URL = (Deno.env.get("OLLAMA_URL") || "https://unabashed-vertical-crispness.ngrok-free.dev").replace(/\/+$/g, "").replace(/\/api\/(?:generate|chat|tags|show)$/i, "");
const OLLAMA_GENERATE_URL = `${OLLAMA_BASE_URL}/api/generate`;
const OLLAMA_MODEL = "llama3.2:3b";
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
- Máximo de 2 a 4 frases curtas por mensagem (≈ 60 palavras / 350 caracteres). Nunca escreva blocos de texto longos.
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
- Para ênfase no WhatsApp, use apenas a formatação nativa: *negrito*, _itálico_, ~tachado~, ```código```.
- Quebre linhas com \n simples, sem <br>.
- Nunca envolva nomes, saudações ou frases em tags coloridas (ex.: <font color="blue">...</font>). Escreva o texto cru.

---

# LIMITES ÉTICOS

- Você pode prestar informações jurídicas iniciais e organizar o atendimento.
- Não substitua consulta formal com advogada regularmente inscrita na OAB.
- Em temas sensíveis, urgentes ou com risco de prazo, recomende atendimento direto com a Dra. Kênia Garcia.

Entregue somente a resposta final pronta para o cliente.`;
const OLLAMA_SYSTEM_PROMPT = SECRETARIA_JURIDICA_PROMPT;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function isInvalidOllamaReply(text: string): boolean {
  const value = String(text || "").trim();
  return /^(okay|ok,|the user|let me|i need|i should|we need|first,|so i)\b/i.test(value) ||
    /\b(the user|let me|i need to|i should|instructions)\b/i.test(value.slice(0, 260));
}

function buildOllamaPrompt(prompt: string, fmtDate: string, fmtTime: string): string {
  return `/no_think
${OLLAMA_SYSTEM_PROMPT}

CONTEXTO TEMPORAL INTERNO (America/Sao_Paulo): hoje é ${fmtDate}, agora são ${fmtTime}.
Se o cliente pedir data, dia da semana ou hora atual, responda exatamente com esses valores.

INSTRUÇÃO CRÍTICA: se você começar a raciocinar em voz alta, pare e responda apenas a resposta final em português.

${prompt}

Resposta final em português do Brasil:`;
}

async function callOllama(messages: Array<{ role: string; content: string }>, fmtDate: string, fmtTime: string): Promise<string> {
  const prompt = messages
    .map((message) => `${message.role === "system" ? "Instruções" : message.role === "assistant" ? "Assistente" : "Cliente"}: ${message.content}`)
    .join("\n\n");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const resp = await fetch(OLLAMA_GENERATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: OLLAMA_SYSTEM_PROMPT,
        prompt: buildOllamaPrompt(prompt, fmtDate, fmtTime),
        stream: false,
        think: false,
        keep_alive: "10m",
        options: { num_ctx: 2048, num_predict: 220, temperature: 0.1 },
      }),
    });
    const raw = await resp.text();
    let data: any = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { response: raw }; }
    if (!resp.ok) throw new Error(`Ollama ${resp.status}: ${raw.slice(0, 500)}`);
    const reply = String(data?.response || "").replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
    if (!reply) throw new Error("Ollama retornou resposta vazia.");
    if (isInvalidOllamaReply(reply)) throw new Error(`Ollama retornou raciocínio interno: ${reply.slice(0, 160)}`);
    return reply;
  } finally {
    clearTimeout(timeout);
  }
}

async function synthesizeSpeech(text: string): Promise<string | null> {
  if (!ELEVENLABS_API_KEY || !text?.trim()) return null;
  try {
    // Remove blocos JSON de agendamento e marcações para a voz
    const clean = text
      .replace(/<AGENDAMENTO>[\s\S]*?<\/AGENDAMENTO>/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .trim()
      .slice(0, 1500);
    if (!clean) return null;
    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: clean,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 1.0 },
        }),
      },
    );
    if (!resp.ok) {
      console.error("ElevenLabs TTS error:", resp.status, await resp.text());
      return null;
    }
    const buf = await resp.arrayBuffer();
    return bytesToBase64(new Uint8Array(buf));
  } catch (e) {
    console.error("TTS exception:", e);
    return null;
  }
}

const DEFAULT_PROMPT = SECRETARIA_JURIDICA_PROMPT;

function stripAppointmentBlock(text: string): string {
  return String(text || "")
    .replace(/<AGENDAMENTO>[\s\S]*?<\/AGENDAMENTO>/g, "")
    .replace(/<?\/?\s*HANDOFF[_\s-]*K[EÊ]NIA\s*\/?>/giu, "")
    .replace(/`{1,3}\s*HANDOFF[_\s-]*K[EÊ]NIA\s*`{1,3}/giu, "")
    .trim();
}

function cleanRepeatedText(text: string): string {
  const noRepeatedWords = String(text || "")
    .replace(/\b((?:[\p{L}\p{N}]{2,}\s+){1,3}[\p{L}\p{N}]{2,})(?:[\s,.;:!?-]+\1\b)+/giu, "$1")
    .replace(/\b([\p{L}\p{N}]{2,})(?:[\s,.;:!?-]+\1\b)+/giu, "$1")
    .replace(/([^.!?\n]{8,}[.!?])(?:\s+\1)+/giu, "$1")
    .replace(/[ \t]{2,}/g, " ");
  const lines = noRepeatedWords.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const uniqueLines: string[] = [];
  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/[^\p{L}\p{N}]+/giu, " ").trim();
    const previous = uniqueLines.at(-1)?.toLowerCase().replace(/[^\p{L}\p{N}]+/giu, " ").trim();
    if (normalized && normalized !== previous) uniqueLines.push(line);
  }
  return uniqueLines.join("\n").trim();
}

function normalizeForSimilarity(text: string): string {
  return stripAppointmentBlock(String(text || ""))
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarityScore(a: string, b: string): number {
  const left = new Set(normalizeForSimilarity(a).split(" ").filter((word) => word.length > 2));
  const right = new Set(normalizeForSimilarity(b).split(" ").filter((word) => word.length > 2));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const word of left) if (right.has(word)) overlap += 1;
  return overlap / Math.max(left.size, right.size);
}

function recentAssistantReplies(history: Array<{ role: string; content: string }>): string[] {
  return history
    .filter((m) => m.role === "assistant" && String(m.content || "").trim())
    .map((m) => stripAppointmentBlock(m.content))
    .slice(-4);
}

function isNearDuplicateReply(reply: string, history: Array<{ role: string; content: string }>): boolean {
  const normalizedReply = normalizeForSimilarity(reply);
  if (!normalizedReply) return false;
  return recentAssistantReplies(history).some((previous) => {
    const normalizedPrevious = normalizeForSimilarity(previous);
    if (!normalizedPrevious) return false;
    const score = similarityScore(normalizedReply, normalizedPrevious);
    return normalizedReply === normalizedPrevious || score >= 0.86 || (normalizedReply.length < 240 && score >= 0.72);
  });
}

function buildNonRepeatingFallback(userMessage: string, fmtDate: string, fmtTime: string): string {
  const text = String(userMessage || "").toLowerCase();
  if (userAskedTemporalInfo(text)) return `Hoje é ${fmtDate}, e agora são ${fmtTime}.`;
  if (/\b(agendar|marcar|consulta|reuni[aã]o|hor[aá]rio|atendimento)\b/i.test(text)) {
    return "Claro. Para eu deixar a consulta registrada corretamente, me informe nome completo, telefone, e-mail, cidade/estado, área do caso, data e horário desejados.";
  }
  if (/\b(div[oó]rcio|guarda|pens[aã]o|fam[ií]lia|invent[aá]rio|trabalhista|demiss[aã]o|rescis[aã]o|inss|aposentadoria|consumidor|cobran[cç]a|audi[eê]ncia|intima[cç][aã]o)\b/i.test(text)) {
    return "Entendi. Para eu direcionar melhor seu atendimento, me conte quando isso aconteceu, sua cidade/estado e se existe algum prazo ou audiência marcado.";
  }
  return "Entendi. Para seguir sem repetir informações, me conte em poucas palavras o que aconteceu e qual ajuda você precisa agora.";
}

function userAskedTemporalInfo(text: string): boolean {
  return /\b(que\s+horas|qual\s+(?:é\s+)?(?:a\s+)?hora|hor[áa]rio\s+atual|agora\s+s[aã]o|data\s+de\s+hoje|qual\s+(?:é\s+)?(?:a\s+)?data|que\s+data|que\s+dia\s+(?:é|estamos|s[aã]o|de\s+hoje)|hoje\s+[ée]\s+que\s+dia|dia\s+da\s+semana|dia\s+de\s+hoje|que\s+m[eê]s|qual\s+(?:o\s+)?(?:dia|m[eê]s|ano)|me\s+(?:diga|fala|fale|informa).*(?:dia|hora|data))\b/i.test(String(text || ""));
}

function removeTemporalLeaks(reply: string, userMessage: string): string {
  if (userAskedTemporalInfo(userMessage)) return reply;
  return String(reply || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/\b(hoje\s+[ée]|agora\s+s[aã]o|s[aã]o\s+\d{1,2}:\d{2}|hora\s+atual|data\s+de\s+hoje|segunda-feira|terça-feira|ter[cç]a-feira|quarta-feira|quinta-feira|sexta-feira|s[áa]bado|domingo)\b/i.test(part))
    .join(" ")
    .trim();
}

function parseAppointmentBlock(text: string) {
  const match = String(text || "").match(/<AGENDAMENTO>([\s\S]*?)<\/AGENDAMENTO>/);
  if (!match) return null;
  try {
    const payload = JSON.parse(match[1].trim());
    const date = String(payload.data_agendamento || "").trim();
    const time = String(payload.horario_agendamento || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
    return {
      client_name: String(payload.nome || "Cliente do chat").trim() || "Cliente do chat",
      phone: String(payload.telefone || "").trim() || null,
      email: String(payload.email || "").trim() || null,
      city: String(payload.cidade || "").trim() || null,
      legal_area: String(payload.area_juridica || "Atendimento jurídico").trim() || "Atendimento jurídico",
      case_summary: String(payload.resumo_caso || "").trim() || null,
      appointment_date: date,
      appointment_time: time,
      raw_payload: payload,
    };
  } catch (err) {
    console.error("Bloco AGENDAMENTO inválido:", err);
    return null;
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY && !EMERGENT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Nenhuma chave de IA configurada (LOVABLE_API_KEY ou EMERGENT_API_KEY)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const userMessage: string = String(body.message ?? body.text ?? "").trim();
    const history: Array<{ role: string; content: string }> = Array.isArray(body.history) ? body.history : [];
    // Sempre usar o DEFAULT_PROMPT atual — ignora prompts antigos salvos no cliente
    const extraPrompt: string = DEFAULT_PROMPT;
    const sessionId: string | null = body.session_id ? String(body.session_id) : null;
    const userId: string | null = body.user_id ? String(body.user_id) : null;

    if (!userMessage) {
      return new Response(JSON.stringify({ error: "message vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const fmtDate = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const fmtTime = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);
    const isoSp = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).toISOString();

    const hourSp = parseInt(
      new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(now),
      10,
    );
    const saudacao =
      hourSp >= 5 && hourSp < 12 ? "Bom dia" : hourSp >= 12 && hourSp < 18 ? "Boa tarde" : "Boa noite";

    const assistantReplies = recentAssistantReplies(history);
    const antiRepetitionContext = assistantReplies.length
      ? `\n\nANTI-REPETIÇÃO OPERACIONAL:\n- As últimas respostas da secretária foram:\n${assistantReplies.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n- Não repita nenhuma delas, nem a mesma saudação, nem a mesma pergunta. Responda diretamente à última mensagem do cliente com avanço real na conversa.`
      : "";

    const systemContent = `${extraPrompt}

CONTEXTO TEMPORAL INTERNO (fuso America/Sao_Paulo):
- Data/hora atual: ${fmtDate}, ${fmtTime} (ISO ${isoSp})
- Saudação adequada agora: "${saudacao}"

REGRA OBRIGATÓRIA SOBRE DATA E HORA:
- Se o cliente perguntar a data, o dia, o dia da semana, o mês, o ano ou as horas (ex.: "que dia é hoje?", "que horas são?", "qual a data de hoje?", "estamos em que dia da semana?"), RESPONDA com clareza usando EXATAMENTE os valores acima. Exemplo: "Hoje é ${fmtDate}, e agora são ${fmtTime}."
- Nunca diga que não sabe a data ou a hora, e nunca invente outro valor.
- Se o cliente NÃO perguntar, não mencione data nem hora.
- Para "hoje", "amanhã", "próxima sexta" em agendamentos, calcule a partir da referência acima.

VALIDAÇÃO OBRIGATÓRIA DA RESPOSTA (processo interno antes de enviar):
1. Leia a pergunta completa do cliente (última mensagem + contexto).
2. Identifique o objetivo principal da mensagem (dúvida jurídica, agendamento, informação prática, desabafo etc.).
3. Verifique se a sua resposta realmente atende ao que foi perguntado — se não atender, refaça.
4. Confirme se a resposta é coerente com o histórico da conversa, não contradiz informações já dadas e não repete saudação/pergunta anterior.
5. Garanta que a resposta seja direta, em português, no tom de secretária jurídica da Dra. Kênia Garcia, e avance a conversa (não devolva a mesma pergunta).
Só envie a resposta depois que os 5 itens estiverem satisfeitos.${antiRepetitionContext}`;

    const messages = [
      { role: "system", content: systemContent },
      ...history.map((m) => ({ role: m.role, content: String(m.content || "") })),
      { role: "user", content: userMessage },
    ];

    let rawReply: string;
    try {
      rawReply = userAskedTemporalInfo(userMessage)
        ? `Hoje é ${fmtDate}, e agora são ${fmtTime}.`
        : await callOllama(messages, fmtDate, fmtTime);
    } catch (err) {
      console.error("Erro ao chamar Ollama llama3.2:3b:", err);
      rawReply = buildNonRepeatingFallback(userMessage, fmtDate, fmtTime);
    }
    if (isNearDuplicateReply(rawReply, history)) rawReply = buildNonRepeatingFallback(userMessage, fmtDate, fmtTime);
    const handoff = /HANDOFF[_\s-]*K[EÊ]NIA/i.test(rawReply);
    const appointment = parseAppointmentBlock(rawReply);
    const reply = cleanRepeatedText(removeTemporalLeaks(stripAppointmentBlock(rawReply), userMessage));

    // Análise técnica do caso (chamada paralela à IA pedindo JSON estruturado)
    let analysis: any = { acertividade: 70, qualificacao: "necessita_mais_info" };
    try {
      const convoText = [...history, { role: "user", content: userMessage }, { role: "assistant", content: reply }]
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      const aResp = await chatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você analisa conversas jurídicas e responde APENAS um JSON válido (sem markdown) com os campos: area (string), resumo (string curta), motivo (string), acertividade (0-100), chance_exito (0-100), qualificacao (\"qualificado\"|\"necessita_mais_info\"|\"desqualificado\"), proxima_pergunta (string), fundamentos (array de strings com base legal).",
          },
          { role: "user", content: `Conversa:\n${convoText}\n\nGere o JSON de análise.` },
        ],
        response_format: { type: "json_object" },
      });
      if (aResp.ok) {
        const parsed = JSON.parse(aResp.data?.choices?.[0]?.message?.content || "{}");
        analysis = { ...analysis, ...parsed };
      }
    } catch (err) {
      console.error("Erro ao gerar análise:", err);
    }

    // Gera áudio (TTS ElevenLabs) se o cliente pediu
    const wantAudio = body.want_audio !== false; // default true
    const audio_base64 = wantAudio ? await synthesizeSpeech(reply) : null;

    // Salva conversa e agendamento no banco (não bloqueia resposta se falhar)
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from("conversations").insert({
        user_id: userId,
        session_id: sessionId,
        message: userMessage,
        response: reply,
      });
      if (appointment) {
        const room = `kenia-${(appointment.client_name || "consulta")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .slice(0, 30)}-${Date.now().toString(36)}`;
        const meetUrl = `https://meet.jit.si/${room}`;
        const enrichedPayload = {
          ...(appointment.raw_payload || {}),
          meeting_link: meetUrl,
          meet_url: meetUrl,
          location: "Google Meet",
          duration_min: 60,
        };
        await supabase.from("appointments").insert({
          user_id: userId,
          session_id: sessionId,
          ...appointment,
          raw_payload: enrichedPayload,
          source: "chat_ai",
          status: "scheduled",
        });
        (appointment as any).meeting_link = meetUrl;
        (appointment as any).meet_url = meetUrl;
      }
    } catch (err) {
      console.error("Erro ao salvar conversa/agendamento:", err);
    }

    return new Response(
      JSON.stringify({
        response: reply,
        appointment,
        audio_base64,
        handoff,
        speaker: handoff ? "Dra. Kênia Garcia" : "Assistente virtual",
        analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
