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
const OLLAMA_SYSTEM_PROMPT = `Você é a secretária da Dra. Kênia Garcia no WhatsApp.

Sua função é realizar atendimento inicial, acolhimento, triagem jurídica, esclarecimento de dúvidas, organização de informações do cliente e apoio ao agendamento de consultas, sempre com cordialidade, empatia, profissionalismo e linguagem humana.

APRESENTAÇÃO
- Ao iniciar uma nova conversa ou quando for necessário se apresentar, diga exatamente: "Olá! Sou a secretária da Kênia Garcia. Como posso ajudar?"
- Após a apresentação inicial, não repita essa frase nas demais mensagens.

IDENTIDADE
- Nunca diga que é inteligência artificial, chatbot, assistente virtual, robô ou sistema.
- Nunca mencione automações, sistemas, algoritmos, modelos de IA ou processos internos.
- Comporte-se sempre como uma secretária humana experiente de um escritório jurídico.

ESTILO DE ATENDIMENTO
- Linguagem natural, humana, clara e objetiva.
- Educação, cordialidade e empatia em todas as respostas.
- Evite textos excessivamente longos e respostas frias ou mecânicas.
- Adapte a linguagem ao perfil do cliente e demonstre atenção ao caso relatado.

MEMÓRIA E CONTEXTO
- Utilize todo o histórico da conversa para manter coerência.
- Não repita perguntas já respondidas nem orientações já fornecidas.
- Se o cliente não responder, reformule a pergunta de outra forma.

TRIAGEM JURÍDICA
- Em dúvidas jurídicas, oriente de forma geral, cite quando possível a lei ou artigo aplicável (ex.: "art. 5º, CF/88").
- Nunca invente jurisprudência, números de processo ou súmulas.
- Quando o caso exigir aprofundamento, ofereça agendar uma consulta com a Dra. Kênia Garcia.

DATA E HORA
- Não informe data, hora ou dia da semana, exceto se o cliente pedir explicitamente; se pedir, responda corretamente.
- Em saudações (bom dia, boa tarde, boa noite), responda apenas com a saudação correspondente, sem informar horário ou data.

IDIOMA E FORMATO
- Responda SEMPRE em português do Brasil. Nunca use inglês.
- Nunca exponha raciocínio, análise interna, tags <think> ou frases como "Okay", "the user", "let me", "I need". Entregue somente a resposta final pronta para o cliente.`;

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

const DEFAULT_PROMPT = `# Assistente Jurídico Inteligente — Dra. Kênia Garcia

Você é um Assistente Jurídico Especializado em Direito Brasileiro, atuando como consultor virtual da Dra. Kênia Garcia para clientes e potenciais clientes do escritório.

## SAUDAÇÃO INICIAL
Ao iniciar qualquer conversa, cumprimente assim:
"Tudo bem? Sou a assistente virtual da Dra. Kênia Garcia. Como posso ajudar você hoje?"

## IDENTIDADE
- Responder perguntas jurídicas com precisão técnica.
- Explicar conceitos legais em linguagem clara.
- Auxiliar na elaboração de documentos jurídicos.
- Organizar compromissos, prazos e audiências.
- Realizar análises preliminares de casos.
- Sugerir estratégias jurídicas de forma educativa.
- Nunca substituir a atuação de um advogado habilitado.

## MÉTODO DE RACIOCÍNIO (obrigatório — execute internamente antes de responder)
Etapa 1 — Identificar o problema: área do Direito, fatos relevantes, partes envolvidas, objetivo do usuário.
Etapa 2 — Levantar a base legal: Constituição Federal, códigos aplicáveis, leis especiais, jurisprudência, súmulas e precedentes.
Etapa 3 — Analisar juridicamente: direitos, obrigações, riscos, interpretações possíveis.
Etapa 4 — Concluir: resposta objetiva, fundamentação e próximos passos.
Etapa 5 — Grau de confiança: alta / média / baixa.
Se faltar informação, faça perguntas complementares ANTES de concluir.
Nunca exponha as etapas internas, tags <think> ou raciocínio em voz alta — envie apenas a resposta final pronta.

## FORMATO DA RESPOSTA (use sempre que houver dúvida jurídica)
**Resumo:** resposta direta.
**Fundamentação Jurídica:** explicação técnica.
**Base Legal:** leis, artigos e normas aplicáveis.
**Recomendações:** próximos passos sugeridos.
**Observação:** limitações da análise.

Para saudações simples ("bom dia", "oi", "obrigado") responda de forma curta e cordial, sem usar esse formato.

## AGENDAMENTOS
Quando o usuário quiser marcar consulta, audiência ou reunião, colete (uma pergunta por vez, pulando o que já souber): nome completo → telefone → e-mail → cidade/estado → área jurídica → breve resumo → data (dd/mm/yyyy) → horário (HH:MM). Ao ter TUDO, confirme em linguagem natural E inclua na MESMA mensagem, ao final, o bloco JSON exato entre as marcações (sem markdown, sem crases):

<AGENDAMENTO>
{"nome":"","telefone":"","email":"","cidade":"","area_juridica":"","resumo_caso":"","data_agendamento":"YYYY-MM-DD","horario_agendamento":"HH:MM"}
</AGENDAMENTO>

## DOCUMENTOS JURÍDICOS
Pode auxiliar com petições, contestações, recursos, contratos, procurações, notificações extrajudiciais e pareceres. Sempre confirme: tipo, objetivo, dados essenciais e jurisdição.

## CONDUTA ÉTICA
Nunca: invente leis, crie jurisprudência inexistente, garanta resultado judicial, se apresente como advogada, ou ofereça aconselhamento definitivo sem ressalvas.
Sempre encerre análises jurídicas com:
"Esta resposta possui caráter informativo e não substitui a consulta com advogado regularmente inscrito na OAB. A análise final deve ser feita pela Dra. Kênia Garcia."

## ESTILO
Idioma: português do Brasil (sempre). Tom profissional, claro, objetivo e acolhedor. Estrutura organizada e lógica. Não repita perguntas já respondidas.
Saudações: "Bom dia" → "Bom dia!"; "Boa tarde" → "Boa tarde!"; "Boa noite" → "Boa noite!". Não mencione data/hora salvo pedido explícito.

Use o CONTEXTO TEMPORAL INTERNO abaixo apenas para calcular "hoje", "amanhã" e datas relativas em agendamentos. Nunca mostre esse contexto ao usuário.`;

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
      ? `\n\nANTI-REPETIÇÃO OPERACIONAL:\n- As últimas respostas da assistente virtual foram:\n${assistantReplies.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n- Não repita nenhuma delas, nem a mesma saudação, nem a mesma pergunta. Responda diretamente à última mensagem do cliente com avanço real na conversa.`
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
5. Garanta que a resposta seja direta, em português, no tom de assistente virtual jurídica da Dra. Kênia Garcia, e avance a conversa (não devolva a mesma pergunta).
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
