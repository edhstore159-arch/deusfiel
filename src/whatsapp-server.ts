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

async function generateReply(strategy: string, message: string): Promise<string> {
  const replies: Record<string, string> = {
    saudacao: "Olá! Bem-vindo(a) à Secretaria da Missão Evangélica Lusitana. Como posso ajudar?",
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
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      if (!text || !phone) return;

      console.log(`[WA] ${phone}: ${text}`);

      const strategy = detectStrategy(text);
      const convId = await findOrCreateConversation(phone);
      if (!convId) return;

      await storeMessage(convId, "incoming", text, strategy);

      const reply = await generateReply(strategy, text);
      await sock.sendMessage(msg.key.remoteJid!, { text: reply });
      await storeMessage(convId, "outgoing", reply, strategy);
    }
  });
}

connectWhatsApp();
