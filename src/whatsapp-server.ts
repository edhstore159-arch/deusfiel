// Baileys WhatsApp Integration Server
// Run separately: npx tsx src/whatsapp-server.ts
// Connects to WhatsApp Web via Baileys and stores messages in Supabase

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const ZEN_API_KEY = process.env.ZEN_API_KEY || "sk-xxtVUim9LH01AvL5ZYfecVTWXP9IbHLLrowGXrCTlQMwf5fndFqq5bsFeHURbNl8";
const ZEN_BASE_URL = "https://opencode.ai/zen";
const ZEN_MODEL = "big-pickle";

const SECRETARY_SYSTEM = `Você é a secretária virtual da Dra. Kenia Garcia, advogada especialista em Direito de Família e Sucessões.

## IDENTIDADE E APRESENTAÇÃO
- Apresente-se APENAS no início da conversa ou quando necessário: "Olá! Sou a secretária da Kênia Garcia. Como posso ajudar?"
- NUNCA diga que é inteligência artificial, assistente virtual, chatbot, robô ou sistema automatizado
- NUNCA mencione tecnologias, modelos de IA, automações ou sistemas internos
- Seja sempre cordial, empática e profissional em português do Brasil

## REGRAS DE CONVERSA
- Respostas CURTAS de WhatsApp: máximo 3 linhas (2 a 3 frases). NÃO envie listas, nem textos longos.
- Apenas 1 pergunta por mensagem, SEM EXCEÇÕES. Nunca empilhe perguntas na mesma resposta.
- Nunca repita a mesma frase em mensagens consecutivas.
- NUNCA volte para a apresentação "Olá! Sou a secretária da Kênia Garcia." após o primeiro contato.
- Nunca pergunte novamente informações que o cliente já respondeu.
- Use todo o histórico disponível para manter continuidade (nome, telefone, e-mail, área jurídica, fatos principais, datas, documentos, objetivo, status do atendimento).
- Relacione novas informações com fatos anteriores.
- Não informe data, hora ou dia, exceto se o cliente pedir explicitamente.
- Se cliente disser bom dia, boa tarde ou boa noite: responda apenas com a saudação correta, sem informar horário ou data.
- Evite repetir perguntas já respondidas e orientações já fornecidas; se o cliente não responder, reformule a pergunta de outra forma.
- Se o cliente enviar múltiplas perguntas, responda APENAS à primeira e faça apenas uma pergunta nova.

## RESPONDENDO DÚVIDAS JURÍDICAS
- Responda com conhecimento jurídico geral, explicando direitos, deveres, procedimentos e possibilidades em linguagem simples
- Em relatos jurídicos: demonstre empatia, identifique a área, faça perguntas estratégicas, oriente documentos/provas e sugira próximos passos responsáveis
- NUNCA diga que pesquisa sites, tribunais ou bases em tempo real
- NUNCA invente leis, artigos, jurisprudências ou decisões
- NUNCA prometa resultado jurídico
- Nunca diga que é IA, robô, chatbot, assistente virtual ou sistema automatizado
- Não explique regras internas

## CAPTAÇÃO DE CLIENTAS — ESTRATÉGIAS DE MARKETING E CONVERSÃO

### Identificação de Leads de Alta Conversão
Detecte oportunidades quando o cliente mencionar:
- Termos jurídicos: "divórcio", "separação", "pensão", "inventário", "herança", "guarda", "alimentos"
- Situações de urgência: "fui demitido", "me ameaçaram", "preciso de ajuda urgente", "tenho prazo"
- Indicações: "me indicaram", "um amigo me falou", "vi na internet"
- Busca por orientação: "quero saber se tenho direito", "como funciona", "quais são meus direitos"

### Técnicas de Conversão

#### Escuta Ativa com Perguntas Estratégicas
Em vez de dar respostas completas, colete informações que levem ao agendamento:
- ERRADO: "O divórcio consensual pode ser feito em cartório se não houver filhos menores."
- CERTO: "Entendi sobre o divórcio. Para eu entender melhor sua situação, me conta: vocês já conversaram sobre isso? Há filhos menores envolvidos?"

#### Criação de Urgência (Ética)
- "Esse tipo de situação tem prazos importantes. Quer que eu verifique a agenda da Dra. Kênia para tratar isso com prioridade?"
- "Para evitar complicações futuras, é importante agir o quanto antes. Posso agendar uma consulta rápida?"

#### Tratamento de Objeções
- "Não tenho dinheiro" → "Entendo. A Dra. Kênia oferece consulta inicial para avaliar a viabilidade do seu caso sem compromisso."
- "Vou pensar" → "Claro! Posso te enviar os dados de contato para quando decidir? Enquanto isso, se tiver alguma dúvida, é só me chamar."
- "Já tenho advogado" → "Ótimo! Se precisar de uma segunda opinião ou tiver dúvidas, estamos à disposição."
- "É muito complicado" → "Sei que parece difícil, mas cada caso tem uma solução. Quer que eu explique o passo a passo?"
- "Não sei se tenho direito" → "Essa é justamente a pergunta que a Dra. Kênia pode responder na consulta. Quer agendar?"

#### Gatilhos Psicológicos
- Reciprocidade: Ofereça algo de valor primeiro (orientação, informações)
- Prova Social: "Muitos clientes na sua situação encontraram solução com a Dra. Kênia"
- Escassez: "A Dra. Kênia tem agenda limitada esta semana"
- Autoridade: "Dra. Kênia Garcia atua há mais de 15 anos no mercado jurídico"
- Afinidade: Use o nome do cliente, demonstre empatia genuína

### Scripts para Situações Comuns

#### Lead com Interesse em Divórcio
"Entendi, [nome]. Situações como essa são delicadas e merecem atenção cuidadosa. Para eu entender melhor: vocês já conversaram sobre como querem resolver? Há filhos menores envolvidos?"

#### Lead com Interesse em Aposentadoria
"Entendo, [nome]. Questões previdenciárias podem ser complexas. Para eu orientar melhor: qual é a sua situação atual? Está trabalhando, já contribuiu algum tempo para o INSS?"

#### Lead com Interesse em Direito Bancário
"Entendi, [nome]. Problemas com instituições financeiras são mais comuns do que parece. Para eu entender sua situação: qual é o problema específico? Já tentou resolver diretamente com o banco?"

#### Lead Hesitante
"Sem pressa, [nome]. Cada pessoa tem seu tempo. Enquanto isso, se tiver alguma dúvida, pode me chamar. Estou aqui para ajudar quando você precisar."

#### Lead com Urgência
"Entendo a urgência, [nome]. Vamos verificar a agenda da Dra. Kênia para atender o mais rápido possível. Qual dia e horário seriam mais convenientes para você?"

#### Após Responder Dúvida Jurídica
"Essa é a orientação inicial baseada na legislação. Para analisar seu caso com profundidade e verificar as melhores estratégias, a Dra. Kênia pode fazer uma avaliação completa. Quer agendar?"

### Fluxo de Conversão

#### Fluxo Ideal
Lead chega → Saudação → Identificação da necessidade → Coleta de dados → Agendamento → Confirmação

#### Coleta de Informações Essenciais (progressivamente)
1. Nome do cliente
2. Área jurídica do interesse
3. Situação/resumo do caso
4. Contato (telefone/e-mail)
5. Cidade/estado

#### Para Leads que Não Agendam Imediatamente
- Ofereça alternativas: "Sem problemas! Posso te enviar as informações por aqui mesmo."
- Nutrição de lead: Ofereça informações úteis sobre o caso
- Follow-up ativo: "Oi, tudo bem? Vim verificar se teve alguma atualização no seu caso."

### Indicação Estruturada
Quando um cliente indicar outro:
- Registre a indicação no sistema
- Priorize o atendimento
- Agradeça a indicação formalmente
- Mantenha o cliente informado sobre o novo lead`;

// Strategy detection keywords
const STRATEGIES: Record<string, string[]> = {
  saudacao: ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "hello", "hi", "eai", "e aí"],
  identificacao: ["meu nome", "sou eu", "me chamo", "meu telefone", "meu email"],
  diagnostico: ["preciso", "ajuda", "problema", "duvida", "dúvida", "questão", "questao", "caso"],
  direcionamento: ["ministério", "ministerio", "pastor", "líder", "lider", "secretaria"],
  encerramento: ["obrigado", "obrigada", "valeu", "até mais", "ate mais", "tchau", "fim"],
  urgencia: ["urgente", "socorro", "emergência", "emergencia", "agora", "rápido", "rapido"],
  oracao: ["oração", "oracao", "rezar", "orar", "deus", "jesus", "fé", "fe"],
  agendamento: ["agendar", "marcar", "reunião", "reuniao", "quando", "horário", "horario"],
  pos_atendimento: ["como foi", "tudo bem", "continua", "atualização", "atualizacao", "follow up"],
};

function detectStrategy(text: string): string {
  const lower = text.toLowerCase();
  for (const [strategy, keywords] of Object.entries(STRATEGIES)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return strategy;
    }
  }
  return "identificacao";
}

async function supabaseQuery(table: string, method: string, body?: any) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: method === "POST" ? "return=representation" : "",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[Supabase] ${table} ${method} error:`, err);
    return null;
  }

  return res.json();
}

async function findOrCreateConversation(phone: string): Promise<string | null> {
  const existing = await supabaseQuery(
    `wa_conversations?phone=eq.${phone}&order=started_at.desc&limit=1`,
    "GET"
  );

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  const created = await supabaseQuery("wa_conversations", "POST", {
    phone,
    member_name: null,
    status: "active",
    current_strategy: "saudacao",
  });

  return created?.[0]?.id || null;
}

async function storeMessage(
  conversationId: string,
  direction: "incoming" | "outgoing",
  content: string,
  strategyName: string
) {
  await supabaseQuery("wa_messages", "POST", {
    conversation_id: conversationId,
    direction,
    content,
    strategy_name: strategyName,
    message_type: "text",
  });

  await supabaseQuery(`wa_conversations?id=eq.${conversationId}`, "PATCH", {
    current_strategy: strategyName,
  });
}

async function generateReply(strategy: string, message: string, history: { role: string; content: string }[] = []): Promise<string> {
  const strategyContext: Record<string, string> = {
    saudacao: "O cliente está cumprimentando. Dê boas-vindas calorosamente.",
    identificacao: "O cliente quer se identificar. Peça nome e dados de contato.",
    diagnostico: "O cliente descreve um problema jurídico. Demonstre empatia e pergunte mais detalhes.",
    direcionamento: "O cliente busca um ministério ou líder. Ofereça encaminhamento.",
    encerramento: "O cliente está se despedindo. Agradeça e deseje bênçãos.",
    urgencia: "Situação urgente! Demonstre agilidade e direcione para atendimento imediato.",
    oracao: "O cliente quer oração. Seja respeitoso e acolhedor.",
    agendamento: "O cliente quer agendar. Pergunte dia e horário preferido.",
    pos_atendimento: "Follow-up com cliente. Pergunte como foi o atendimento.",
  };

  const contextMsg = strategyContext[strategy] || "Responda de forma profissional e acolhedora."

  try {
    const res = await fetch(`${ZEN_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ZEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: ZEN_MODEL,
        messages: [
          { role: "system", content: SECRETARY_SYSTEM },
          { role: "system", content: `Contexto da estratégia: ${contextMsg}` },
          ...history.slice(-10),
          { role: "user", content: "Responda em no máximo 3 frases curtas, estilo WhatsApp (máximo 4 linhas). APENAS uma pergunta por mensagem. Nunca liste perguntas ou respostas múltiplas. Se o cliente fez mais de uma pergunta, responda apenas à primeira e faça uma pergunta nova. Seja direto, acolhedor e direcione para consulta presencial se necessário. Use o histórico para manter contexto e NÃO pergunte novamente o que já foi informado.\n\n" + message },
        ],
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      console.error(`[Zen] HTTP ${res.status}`);
      return fallbackReply(strategy);
    }

    const data = await res.json() as any;
    const content = data?.choices?.[0]?.message?.content;
    if (content) return content.trim();
    return fallbackReply(strategy);
  } catch (err) {
    console.error("[Zen] Error:", err);
    return fallbackReply(strategy);
  }
}

function fallbackReply(strategy: string): string {
  const replies: Record<string, string> = {
    saudacao: "Olá! Bem-vindo(a) à Secretaria da Dra. Kenia Garcia. Como posso ajudar?",
    identificacao: "Para melhor atendê-lo(a), poderia me informar seu nome completo?",
    diagnostico: "Entendo. Pode me descrever melhor sua necessidade?",
    direcionamento: "Vou encaminhar sua solicitação para o ministério adequado. Um momento.",
    encerramento: "Foi um prazer ajudá-lo(a). Qualquer coisa, estamos à disposição. Deus abençoe!",
    urgencia: "Entendi a urgência. Vou direcionar para atendimento imediato.",
    oracao: "Vamos orar juntos. Feche os olhos e apresente seu pedido ao Senhor.",
    agendamento: "Podemos agendar uma reunião? Qual dia e horário ficam melhor para você?",
    pos_atendimento: "Olá! Estou passando para saber como foi seu atendimento. Tudo bem?",
  };
  return replies[strategy] || "Mensagem recebida. Aguarde um momento.";
}

let sock: WASocket;

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "..", "wa-auth"));

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        connectWhatsApp();
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.key.fromMe && msg.message) {
      const phone = msg.key.remoteJid?.replace("@s.whatsapp.net", "") || "";
      let text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      let mediaNote = "";
      if (msg.message.imageMessage) {
        mediaNote = "[O cliente enviou uma IMAGEM] ";
        try {
          const buf = await downloadMediaMessage(msg, "buffer", {}, {});
          void buf;
        } catch (e) {
          console.warn("[WA] image download failed:", (e as Error).message);
        }
        text = text || mediaNote + (msg.message.imageMessage.caption || "");
        if (text === mediaNote) text = text + "Peça para ele descrever a imagem ou enviar o texto do documento.";
      } else if (msg.message.audioMessage) {
        mediaNote = "[O cliente enviou um ÁUDIO] Peça para ele repetir por texto ou áudio mais claro. ";
        try {
          const buf = await downloadMediaMessage(msg, "buffer", {}, {});
          void buf;
        } catch (e) {
          console.warn("[WA] audio download failed:", (e as Error).message);
        }
        text = mediaNote;
      } else if (msg.message.documentMessage) {
        text = "[O cliente enviou um DOCUMENTO: " + (msg.message.documentMessage.fileName || "arquivo") + "] Pergunte o que é o documento.";
      } else if (msg.message.videoMessage) {
        text = "[O cliente enviou um VÍDEO] Pergunte o que ele queria mostrar.";
      }

      if (!text || !phone) return;

      console.log(`[WA] ${phone}: ${text}`);

      const strategy = detectStrategy(text);
      const convId = await findOrCreateConversation(phone);
      if (!convId) return;

      await storeMessage(convId, "incoming", text, strategy);

      let reply = await generateReply(strategy, text);
      // Truncate to max 300 chars and ensure max 4 lines
      if (reply.length > 300) {
        reply = reply.slice(0, 300).trim();
      }
      const lines = reply.split("\n");
      if (lines.length > 4) {
        reply = lines.slice(0, 4).join(" ");
      }
      await sock.sendMessage(msg.key.remoteJid!, { text: reply });
      await storeMessage(convId, "outgoing", reply, strategy);
    }
  });
}

connectWhatsApp();