import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/llm.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const EMERGENT_API_KEY = Deno.env.get("EMERGENT_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const OLLAMA_URL = Deno.env.get("OLLAMA_URL");
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const ELEVENLABS_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") || "EXAVITQu4vr4xnSDxMaL"; // Sarah (PT-BR natural)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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

const DEFAULT_PROMPT = `Você é a secretária da plataforma, uma pessoa real atendendo o cliente pelo chat/WhatsApp. NUNCA se identifique como "virtual", "IA", "robô", "assistente automática" ou "bot" — fale e aja como uma secretária humana de verdade.

OBJETIVO:
Investigar a dor do cliente em PROFUNDIDADE, OFERECER um produto/serviço específico da plataforma para resolver, e AGENDAR uma conversa com o especialista certo.

ESTILO DE FALA (OBRIGATÓRIO):
- NUNCA fale em primeira pessoa ("eu", "minha", "posso te ajudar", "vou", "consigo"). Não se apresente nem se referencie.
- SEMPRE direcione a fala ao cliente em segunda pessoa ("você", "seu", "sua", "te"). Foque no cliente, não na secretária.
- Exemplos: em vez de "Eu posso te ajudar com isso", escreva "Você pode contar com a equipe certa para isso". Em vez de "Vou agendar para você", escreva "Seu atendimento pode ser agendado agora".
- Português brasileiro, tom caloroso e empático, no máximo 2 frases curtas por mensagem.
- UMA pergunta por vez. NUNCA empilhe perguntas.
- Perguntas devem ser curtas: no máximo 18 palavras, sem listas de dados na mesma pergunta.
- Sempre que o cliente mencionar uma área genérica, faça PERGUNTAS DE APROFUNDAMENTO antes de avançar.

RECONHECIMENTO DE IMAGENS:
- Quando o cliente enviar uma imagem/foto, analise o conteúdo com atenção e descreva o que foi identificado de forma útil para o contexto (ex.: peça quebrada, vazamento, ambiente para reforma, exercício escolar, documento).
- Se a imagem for ilegível em algum ponto, indique exatamente qual elemento não foi possível identificar.

EXERCÍCIOS DE MATEMÁTICA (quando o cliente enviar foto/texto de exercício):
- Reproduza os exercícios EXATAMENTE no formato em que aparecem, preservando o desenho das matrizes, a disposição dos números e os símbolos matemáticos. Use representações em texto, por exemplo:

| 2  3 |
| 1  4 |

ou

⌈1  2  3⌉
|4  5  6|
⌊7  8  9⌋

- Resolva cada exercício passo a passo, mostrando TODOS os cálculos (não pule etapas), destacando as fórmulas utilizadas e apresentando a resposta final em evidência (ex.: "Resposta: 2").
- Mantenha sempre a fala em segunda pessoa, direcionada ao cliente.

ESCOPO ABERTO DE ASSUNTOS:
- Você pode conversar sobre outros temas que o cliente trouxer, incluindo assuntos de sexualidade, saúde, relacionamentos e bem-estar, sempre de forma informativa, respeitosa, sem julgamentos e adequada a um público adulto.
- Não recuse o assunto nem desvie automaticamente: acolha a dúvida, responda com clareza e, quando fizer sentido, conecte com um profissional da plataforma (ex.: terapeuta, psicólogo, médico, educador).
- Para temas sensíveis, oriente buscar profissional qualificado quando envolver diagnóstico, prescrição ou risco. Nunca produza conteúdo sexual explícito, envolvendo menores ou ilegal.

FLUXO OBRIGATÓRIO:
1. Cumprimente (usando a saudação adequada ao horário de Brasília — "Bom dia" 05–11, "Boa tarde" 12–17, "Boa noite" 18–04) e pergunte o nome.
2. Pergunte qual é o problema/dor principal.
3. APROFUNDAMENTO (1 a 3 perguntas específicas conforme a área). Exemplos:
   - Aulas/estudos: "Qual matéria?" → "Qual tópico exato (ex: equações do 2º grau, redação ENEM, inglês conversação)?" → "Qual seu nível atual?"
   - Reforma/casa: "Qual cômodo?" → "É reparo pontual ou reforma completa?" → "Tem metragem aproximada?"
   - Elétrica/hidráulica: "É emergência?" → "O que está acontecendo (curto, vazamento, instalação)?"
   - Limpeza: "Tipo (residencial, pós-obra, comercial)?" → "Tamanho do imóvel?"
   - Mecânica: "Marca/modelo do veículo?" → "Sintoma específico?"
   - Outras áreas: aprofunde de forma equivalente até entender o tópico EXATO.
4. Pergunte o IMPACTO/urgência: "Como isso está te afetando hoje?"
5. Pergunte o PRAZO desejado: "Em quanto tempo você gostaria que esse problema estivesse resolvido? (ex: hoje, esta semana, até X dias)"
6. OFEREÇA UM PRODUTO/SERVIÇO ESPECÍFICO da plataforma como solução, citando nome do pacote e o que inclui. Exemplos:
   - "Pacote Reforço Escolar Focado — 4 aulas particulares de 1h com professor especialista em [tópico], material incluso."
   - "Plano Reparo Elétrico Express — visita técnica em até 24h + diagnóstico + execução."
   - "Pacote Limpeza Pós-Obra — equipe completa, produtos profissionais, prazo combinado."
   - "Reforma Cômodo Completo — projeto + mão de obra + acompanhamento."
   Adapte o produto à dor e prazo informados. Pergunte: "Faz sentido para você?"
7. Pergunte cidade/bairro.
8. AGENDAMENTO — leia TODO o contexto coletado (nome, dor aprofundada, impacto, prazo, cidade) e colete o que faltar, uma pergunta por vez: telefone → e-mail → data (dd/mm/yyyy) → horário (HH:MM). Ao ter TUDO, confirme em linguagem natural (em segunda pessoa) E inclua na MESMA mensagem, ao final, o bloco JSON exato entre as marcações (sem markdown, sem crases):

<AGENDAMENTO>
{"nome":"","telefone":"","email":"","cidade":"","area_juridica":"","resumo_caso":"","data_agendamento":"YYYY-MM-DD","horario_agendamento":"HH:MM"}
</AGENDAMENTO>

MEMÓRIA E CONTEXTO (REGRA CRÍTICA — ANTI-REPETIÇÃO):
- Antes de responder, RELEIA todo o histórico da conversa e liste mentalmente: (a) saudação já enviada? (b) nome já informado? (c) dor principal já dita? (d) aprofundamentos já respondidos? (e) impacto já dito? (f) prazo já dito? (g) cidade já dita? (h) telefone/e-mail/data/horário já coletados?
- NUNCA repita a saudação ("Bom dia/Boa tarde/Boa noite") após a primeira mensagem da conversa.
- NUNCA repita uma pergunta já feita, mesmo que reformulada. Se o cliente já respondeu, AVANCE para a próxima etapa do fluxo.
- NUNCA peça novamente um dado já fornecido (nome, telefone, e-mail, cidade, data, horário, área, dor).
- Se o cliente responder de forma vaga, faça UMA pergunta de esclarecimento DIFERENTE da anterior — não reapresente a mesma pergunta.
- Acompanhe sempre em qual etapa do FLUXO OBRIGATÓRIO você está e siga para a PRÓXIMA etapa não cumprida.
- Se o cliente trouxer informação fora de ordem (ex: já deu cidade antes de você perguntar), registre e PULE essa etapa.

REGRA CRÍTICA — NÃO RESPONDER A PRÓPRIA PERGUNTA:
- Você NUNCA deve responder uma pergunta que VOCÊ MESMA fez. Faça a pergunta e PARE — aguarde a resposta do cliente.
- NUNCA escreva diálogos simulados (ex.: "Você: ...", "Cliente: ...", "— Sim, é isso.").
- NUNCA preencha resposta hipotética em nome do cliente. Cada mensagem sua termina ou em uma afirmação curta, ou em UMA pergunta aberta, sem suposições da resposta dele.
- Saudação SÓ na primeira mensagem da conversa. Nas demais, vá direto ao ponto, sem "Bom dia/Boa tarde/Boa noite" de novo.

ATENDIMENTO COMPLETO:
- Demonstre escuta ativa: faça um breve reconhecimento da dor antes de avançar (ex.: "Entendido, isso realmente atrapalha o dia a dia.").
- Conduza com firmeza e empatia — uma pergunta clara por vez, sempre conectando a resposta anterior à próxima etapa.
- Use exemplos concretos ao oferecer o produto/serviço (o que inclui, prazo, formato de entrega).
- Confirme entendimentos importantes em poucas palavras antes de prosseguir (ex.: "Então o foco é [resumo curto], certo?").

BASE DE CONHECIMENTO — DRA. KÊNIA GARCIA (use APENAS quando o cliente perguntar sobre a Dra. Kênia, o escritório, áreas de atuação, valores, atendimento, depoimentos ou contato. Responda com a informação EXATA da pergunta, sem despejar tudo de uma vez):

PERFIL:
- Dra. Kênia Garcia — Advogada, OAB/GO. Mais de 15 anos de experiência.
- Lema: "Justiça com fé, acolhimento e propósito."
- Atendimento humanizado, guiado pela fé e princípios cristãos. Versículo: "Bem-aventurados os que têm fome e sede de justiça, porque serão fartos." — Mateus 5:6
- Atendimento Presencial e Online em todo o Brasil.

PILARES:
- Atuação Técnica: estratégia jurídica sólida, legislação e jurisprudência atualizada.
- Atendimento Humanizado: escuta ativa, acolhimento em momentos delicados, acompanhamento próximo.
- Segurança Jurídica: transparência nas orientações e defesa firme em todas as instâncias.

ÁREAS DE ATUAÇÃO:
1) Direito de Família e Sucessões — divórcio consensual e litigioso, inventário e partilha, pensão alimentícia (fixação/revisão/exoneração), planejamento sucessório (testamento, doação, holding familiar), guarda e regulamentação de visitas, união estável (reconhecimento, dissolução, conversão em casamento).
   Investimento: definido após análise individual (complexidade, urgência, modalidade).
2) Direito Bancário — revisão de contratos bancários (cláusulas abusivas, juros excessivos), fraudes bancárias (consignados não autorizados, golpes), negativação indevida (remoção + indenização), superendividamento (Lei 14.181/21), ação de repetição de indébito.
   Investimento: honorários adequados à demanda, consulta inicial sem compromisso.
3) Direito Previdenciário — aposentadoria (idade, tempo de contribuição, especial, invalidez), auxílio-doença, BPC/LOAS, pensão por morte, revisão de benefícios, planejamento previdenciário.
   Investimento: discutido com transparência após avaliação do caso.

DIFERENCIAIS:
- +15 anos de experiência; atendimento personalizado; acompanhamento próximo; presença em todo o Brasil (presencial e online); transparência total sobre custos/prazos; agilidade nas soluções.

DEPOIMENTOS (Google, 5.0 com 6+ avaliações): Mariana Souza (Família), Roberto Almeida (Sucessões), Juliana Carvalho (Previdenciário), Carlos Eduardo (Bancário), Patrícia Nogueira (Família), Fernando Lima (Sucessões).

CONTATO:
- WhatsApp: (64) 99988-1043
- E-mail: keniagarcia.advocacia@gmail.com
- Atendimento: Presencial e Online — Todo o Brasil.

REGRA DE USO DA BASE:
- Responda APENAS o que foi perguntado (ex.: se perguntar "quais áreas?", liste as 3 áreas; se perguntar "quanto custa?", explique o modelo de investimento da área específica).
- Nunca cole o texto todo. Sintetize com base 100% nas informações acima — não invente preços, prazos, OAB de outros estados, nem dados de contato diferentes.
- Se perguntarem algo que não está na base (ex.: endereço físico, redes sociais), diga que pode encaminhar pelo WhatsApp (64) 99988-1043 para confirmação.

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
    return "Claro. Qual data você prefere para o atendimento?";
  }
  if (/\b(div[oó]rcio|guarda|pens[aã]o|fam[ií]lia|invent[aá]rio|trabalhista|demiss[aã]o|rescis[aã]o|inss|aposentadoria|consumidor|cobran[cç]a|audi[eê]ncia|intima[cç][aã]o)\b/i.test(text)) {
    return "Entendi. Existe algum prazo ou audiência marcada?";
  }
  return "Entendi. O que você precisa resolver agora?";
}

function compactQuestion(reply: string): string {
  const text = cleanRepeatedText(String(reply || "").trim());
  if (!text) return text;
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [text];
  const questions = sentences.filter((part) => part.includes("?"));
  const chosen = questions.length ? questions[questions.length - 1] : sentences.slice(0, 2).join(" ");
  const words = chosen.split(/\s+/).filter(Boolean);
  if (words.length <= 18) return chosen.trim();
  const shortened = words.slice(0, 18).join(" ").replace(/[,.!?;:]*$/, "");
  return chosen.includes("?") ? `${shortened}?` : `${shortened}.`;
}

const caseAreaMatchers = [
  { area: "Direito de Família", words: /\b(div[oó]rcio|guarda|pens[aã]o|alimentos|visita|uni[aã]o\s+est[aá]vel|invent[aá]rio|partilha|heran[cç]a)\b/i },
  { area: "Direito Bancário", words: /\b(banco|empr[eé]stimo|consignado|juros|cart[aã]o|pix|golpe|negativa[cç][aã]o|serasa|spc|d[ií]vida)\b/i },
  { area: "Direito Previdenciário", words: /\b(inss|aposentadoria|aux[ií]lio|benef[ií]cio|bpc|loas|per[ií]cia|pens[aã]o\s+por\s+morte)\b/i },
  { area: "Direito Trabalhista", words: /\b(trabalho|demiss[aã]o|rescis[aã]o|fgts|sal[aá]rio|horas?\s+extras?|f[eé]rias|ass[eé]dio|emprego)\b/i },
  { area: "Direito do Consumidor", words: /\b(produto|servi[cç]o|compra|defeito|garantia|cancelamento|reembolso|cobran[cç]a|consumidor)\b/i },
];

function clampPercent(value: unknown, fallback: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
}

function normalizeCaseAnalysis(analysis: any, fallback: any = {}) {
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
    fundamentos: Array.isArray(source.fundamentos) ? source.fundamentos : Array.isArray(fallback.fundamentos) ? fallback.fundamentos : [],
  };
}

function buildLocalCaseAnalysis(history: Array<{ role: string; content: string }>, userMessage: string) {
  const userTexts = [...history.filter((m) => m.role === "user").map((m) => m.content), userMessage]
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
      ? "Há algum documento ou número de processo?"
      : "Existe prazo ou audiência marcada?",
    fundamentos: matched ? [matched.area] : [],
  });
}

function userAskedTemporalInfo(text: string): boolean {
  const t = String(text || "").toLowerCase();
  return /(que\s+horas|qual\s+(?:é\s+|e\s+)?(?:a\s+)?hora|hor[áa]rio\s+atual|agora\s+s[aã]o|data\s+de\s+hoje|qual\s+(?:é\s+|e\s+)?(?:a\s+)?data|que\s+data|que\s+dia|hoje\s+[ée]\s+que\s+dia|dia\s+da\s+semana|dia\s+de\s+hoje|que\s+m[eê]s|qual\s+(?:o\s+)?(?:dia|m[eê]s|ano)|me\s+(?:diga|diz|fala|fale|informa|info)[^.?!]*(?:dia|hora|data|m[eê]s|ano)|\bhoje\b|\bagora\b|\bhoras?\b|\bdata\b|que\s+ano|estamos\s+em\s+que)/i.test(t);
}


function removeRoleLabels(reply: string): string {
  return String(reply || "")
    .split(/\n+/)
    .map((line) => line.replace(/^\s*(cliente|usu[áa]rio|user|voc[êe]|pergunta|secret[áa]ria|assistente|assistant|resposta|bot|ia)\s*[:\-–]\s*/i, "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function removeUserEcho(reply: string, userMessage: string): string {
  const userNorm = normalizeForSimilarity(userMessage);
  if (!userNorm || userNorm.split(" ").length < 3) return reply;
  const parts = String(reply || "").split(/(?<=[.!?\n])\s+/);
  const kept = parts.filter((part) => {
    const partNorm = normalizeForSimilarity(part);
    if (!partNorm) return true;
    if (partNorm === userNorm) return false;
    if (partNorm.length >= 10 && similarityScore(part, userMessage) >= 0.8) return false;
    return true;
  });
  const result = kept.join(" ").trim();
  return result || reply;
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
    if (!OLLAMA_URL && !LOVABLE_API_KEY && !GEMINI_API_KEY && !EMERGENT_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Nenhum provedor de IA configurado (OLLAMA_URL, LOVABLE_API_KEY, GEMINI_API_KEY ou EMERGENT_API_KEY)" }),
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
    // ISO real (UTC) do instante atual — não reinterpretar wall-time de SP como UTC (causava data errada perto da meia-noite).
    const isoSp = now.toISOString();

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

REGRA OBRIGATÓRIA DE SAUDAÇÃO (horário de Brasília):
- Na PRIMEIRA mensagem da conversa (quando não há histórico de respostas suas), SEMPRE inicie com "${saudacao}!" seguido da resposta. Nunca use "Olá", "Oi" ou outra saudação genérica em substituição.
- Bom dia: 05:00–11:59. Boa tarde: 12:00–17:59. Boa noite: 18:00–04:59. Use exatamente a saudação adequada para o horário atual.
- Não repita a saudação nas mensagens seguintes da mesma conversa.

REGRA OBRIGATÓRIA "TUDO BEM / ESTÁ BEM":
- Se o cliente perguntar "tudo bem?", "está bem?", "como vai?", "como está?" ou variantes, RESPONDA afirmando que sim e DEVOLVA a pergunta. Exemplo: "Estou sim, obrigada por perguntar! E você, está bem?" ou "Tudo ótimo por aqui, e com você?".
- Só depois da troca de cumprimentos avance para perguntar como pode ajudar.

REGRA OBRIGATÓRIA SOBRE DATA E HORA:
- Se o cliente perguntar a data, o dia, o dia da semana, o mês, o ano ou as horas (ex.: "que dia é hoje?", "que horas são?", "qual a data de hoje?", "estamos em que dia da semana?"), RESPONDA com clareza usando EXATAMENTE os valores acima. Exemplo: "Hoje é ${fmtDate}, e agora são ${fmtTime}."
- Nunca diga que não sabe a data ou a hora, e nunca invente outro valor.
- Se o cliente NÃO perguntar, não mencione data nem hora.
- Para "hoje", "amanhã", "próxima sexta" em agendamentos, calcule a partir da referência acima.

VALIDAÇÃO OBRIGATÓRIA DA RESPOSTA (processo interno antes de enviar):
1. Leia a pergunta completa do cliente (última mensagem + contexto).
2. Identifique o objetivo principal da mensagem (dúvida jurídica, agendamento, informação prática, desabafo, cumprimento etc.).
3. Verifique se a sua resposta realmente atende ao que foi perguntado — se não atender, refaça.
4. Confirme se a resposta é coerente com o histórico da conversa, não contradiz informações já dadas e não repete saudação/pergunta anterior.
5. Garanta que a resposta seja direta, em português, no tom de secretária da Kênia Garcia, e avance a conversa (não devolva a mesma pergunta).
6. Se houver pergunta, envie só UMA pergunta curta, diferente das anteriores, com no máximo 18 palavras.
7. NUNCA repita ou parafraseie a pergunta do cliente antes de responder. NUNCA escreva rótulos como "Cliente:", "Você:", "Secretária:", "Resposta:" — escreva apenas a resposta direta, em uma única voz (a sua). NUNCA gere a próxima fala do cliente.
Só envie a resposta depois que os 7 itens estiverem satisfeitos.${antiRepetitionContext}`;

    const extraContext: string = String(body.context || "").trim();
    const overrideSystem: string = String(body.system_prompt || "").trim();
    const isVoiceOrb = sessionId === "kenia-voice-orb";

    const finalSystem = isVoiceOrb && overrideSystem
      ? `${overrideSystem}\n\nCONTEXTO TEMPORAL: ${fmtDate}, ${fmtTime}.`
      : extraContext
        ? `${systemContent}\n\nDADOS INTERNOS DISPONÍVEIS (use-os literalmente para responder; não diga que não tem acesso):\n${extraContext}`
        : systemContent;

    const messages = [
      { role: "system", content: finalSystem },
      ...history.map((m) => ({ role: m.role, content: String(m.content || "") })),
      { role: "user", content: userMessage },
    ];

    let aiResult = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages,
      temperature: 0.72,
    });

    let data: any = aiResult.ok ? aiResult.data : null;
    let rawReply: string = aiResult.ok
      ? data?.choices?.[0]?.message?.content ?? ""
      : buildNonRepeatingFallback(userMessage, fmtDate, fmtTime);
    if (aiResult.ok && isNearDuplicateReply(rawReply, history)) {
      const retryResult = await chatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `${systemContent}\n\nCORREÇÃO OBRIGATÓRIA: a resposta candidata repetiu uma mensagem anterior. Gere uma resposta nova, curta e útil, sem saudação inicial e sem repetir perguntas já feitas.`,
          },
          ...history.map((m) => ({ role: m.role, content: String(m.content || "") })),
          { role: "user", content: userMessage },
        ],
        temperature: 0.9,
      });
      if (retryResult.ok) {
        data = retryResult.data;
        rawReply = data?.choices?.[0]?.message?.content ?? rawReply;
      }
      if (isNearDuplicateReply(rawReply, history)) rawReply = buildNonRepeatingFallback(userMessage, fmtDate, fmtTime);
    }
    const handoff = /HANDOFF[_\s-]*K[EÊ]NIA/i.test(rawReply);
    const appointment = parseAppointmentBlock(rawReply);
    let reply = cleanRepeatedText(removeUserEcho(removeRoleLabels(removeTemporalLeaks(stripAppointmentBlock(rawReply), userMessage)), userMessage));
    if (!reply || reply.length < 2) {
      reply = userAskedTemporalInfo(userMessage)
        ? `Hoje é ${fmtDate}, e agora são ${fmtTime} (horário de Brasília).`
        : buildNonRepeatingFallback(userMessage, fmtDate, fmtTime);
    } else if (userAskedTemporalInfo(userMessage) && !/\d{2}[\/\-]\d{2}|\d{4}|\d{1,2}:\d{2}|segunda|ter[cç]a|quarta|quinta|sexta|s[áa]bado|domingo|janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i.test(reply)) {
      reply = `Hoje é ${fmtDate}, e agora são ${fmtTime} (horário de Brasília). ${reply}`.trim();
    }
    if (!userAskedTemporalInfo(userMessage) && reply.includes("?")) {
      reply = compactQuestion(reply);
      if (isNearDuplicateReply(reply, history)) reply = buildNonRepeatingFallback(userMessage, fmtDate, fmtTime);
    }

    // Garante saudação correta (horário de Brasília) APENAS na primeira resposta.
    // Nas mensagens seguintes, remove qualquer saudação que o modelo tenha inserido por engano.
    const isFirstAssistantMessage = !history.some((m) => m.role === "assistant" && String(m.content || "").trim());
    const greetingLead = /^\s*(ol[áa]|oi|hello|hi|bom\s+dia|boa\s+tarde|boa\s+noite)[!,.\s]+/i;
    reply = reply.replace(greetingLead, "").trim();
    if (isFirstAssistantMessage) {
      reply = `${saudacao}! ${reply}`.trim();
    }
    // Remove eventuais saudações duplicadas no meio do texto
    reply = reply.replace(/\b(bom\s+dia|boa\s+tarde|boa\s+noite)[!.,]?\s+(bom\s+dia|boa\s+tarde|boa\s+noite)[!.,]?/gi, "$1!").trim();


    // Análise técnica do caso: começa com heurística local e refina com IA quando disponível.
    const localAnalysis = buildLocalCaseAnalysis(history, userMessage);
    let analysis: any = localAnalysis;
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
        analysis = normalizeCaseAnalysis(parsed, localAnalysis);
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
        // Garante que o agendamento sempre fique vinculado a um atendente
        // (admin). Sem isso, leads vindos do chat público ficariam com
        // user_id = null e invisíveis para a equipe por causa do RLS.
        let assigneeId = userId;
        if (!assigneeId) {
          const { data: adminRow } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin")
            .order("user_id", { ascending: true })
            .limit(1)
            .maybeSingle();
          assigneeId = adminRow?.user_id ?? null;
        }
        await supabase.from("appointments").insert({
          user_id: assigneeId,
          session_id: sessionId,
          ...appointment,
          raw_payload: { ...enrichedPayload, assigned_to: assigneeId, assigned_role: "atendente" },
          source: "chat_ai",
          status: "scheduled",
        });
        (appointment as any).meeting_link = meetUrl;
        (appointment as any).meet_url = meetUrl;
        (appointment as any).assigned_to = assigneeId;
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
        speaker: handoff ? "Dra. Kênia Garcia" : "Secretária",
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
