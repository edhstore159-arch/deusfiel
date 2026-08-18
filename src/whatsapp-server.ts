// Baileys WhatsApp Integration Server
// Run separately: npx tsx src/whatsapp-server.ts
// Connects to WhatsApp Web via Baileys and stores messages in Supabase

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const ZEN_API_KEY = process.env.ZEN_API_KEY || "sk-xxtVUim9LH01AvL5ZYfecVTWXP9IbHLLrowGXrCTlQMwf5fndFqq5bsFeHURbNl8";
const ZEN_BASE_URL = "https://opencode.ai/zen";
const ZEN_MODEL = "big-pickle";

const SECRETARY_SYSTEM = `Você é a secretaria virtual da Dra. Kenia Garcia, advogada especialista em Direito de Família e Sucessões.

Diretrizes:
- Seja profissional, acolhedora e empática
- Responda sempre em português
- Ofereça orientação jurídica inicial quando perguntado
- Agende consultas quando solicitado
- Para urgências, direcione para atendimento imediato
- Nunca dê parecer definitivo, sempre sugira consulta presencial
- Use linguagem acessível, sem jargão excessivo
- Em orações, seja respeitosa e acolhedora
- RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL — nunca em inglês
- Respostas CURTAS de WhatsApp: no máximo 4 linhas (2 a 4 frases)
- Uma pergunta por mensagem`;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const AUTH_DIR = path.join(__dirname, "..", "wa-auth");

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

  const contextMsg = strategyContext[strategy] || "Responda de forma profissional e acolhedora.";

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
          { role: "user", content: "Responda APENAS em português do Brasil, com resposta CURTA de WhatsApp (máx. 4 linhas).\n\n" + message },
        ],
        max_tokens: 250,
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
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

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
      if (reply.length > 500) {
        reply = reply.slice(0, 500).trim();
        const lastBreak = Math.max(reply.lastIndexOf("\n"), reply.lastIndexOf("."), reply.lastIndexOf("?"));
        if (lastBreak > 250) reply = reply.slice(0, lastBreak + 1);
      }
      await sock.sendMessage(msg.key.remoteJid!, { text: reply });
      await storeMessage(convId, "outgoing", reply, strategy);
    }
  });
}

connectWhatsApp();
