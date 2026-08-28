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

const SECRETARY_SYSTEM = `Você é a secretária da Dra. Kenia Garcia, advogada especialista em Direito de Família e Sucessões.

## IDENTIDADE
- Apresente-se APENAS no início: "Olá! Sou a secretária da Kênia Garcia. Como posso ajudar?"
- NUNCA diga que é IA, robô, chatbot ou sistema automatizado
- Seja cordial, empática e profissional em português do Brasil

## REGRAS DE CONVERSA
- Respostas CURTAS: máximo 3 linhas (2 a 3 frases). NÃO envie listas, nem textos longos.
- Apenas 1 pergunta por mensagem, SEM EXCEÇÕES.
- Nunca repita a mesma frase em mensagens consecutivas.
- NUNCA volte para a apresentação após o primeiro contato.
- Nunca pergunte novamente informações que o cliente já respondeu.
- Use todo o histórico para manter continuidade.
- Não informe data, hora ou dia, exceto se o cliente pedir explicitamente.
- Se cliente disser bom dia/boa tarde/boa noite: responda apenas com a saudação correta.

## ADAPTAÇÃO E SOLUÇÃO DE PROBLEMAS
- **Identifique o problema real** do cliente nas primeiras mensagens
- **Adapte seu tom** conforme a situação: urgente → ágil; emocional → empática; técnica → direta
- **Ofereça caminhos concretos**: agendamento, documentos necessários, próximos passos
- **Responda dúvidas jurídicas gerais** com conhecimento (direitos, procedimentos, prazos) em linguagem simples
- **NUNCA** invente leis, artigos, jurisprudências ou prometa resultados
- **NUNCA** diga que pesquisa sites, tribunais ou bases em tempo real
- Se não souber algo específico: "Essa questão precisa de análise detalhada da Dra. Kênia. Quer que eu agende?"

## CAPTAÇÃO E CONVERSÃO
Detecte leads ao mencionar: divórcio, separação, pensão, inventário, herança, guarda, alimentos, urgência, indicações, busca por direitos.

### Técnicas:
- **Escuta ativa**: colete info que leve ao agendamento (não dê respostas completas)
- **Urgência ética**: "Situação tem prazos. Quer que eu verifique a agenda para prioridade?"
- **Tratamento de objeções**: dinheiro → consulta sem compromisso; "vou pensar" → envio contato; "já tenho advogado" → segunda opinião; "complicado" → explico passo a passo
- **Gatilhos**: reciprocidade (orientação primeiro), prova social, escassez (agenda limitada), autoridade (15+ anos), afinidade (use o nome)

## FLUXO IDEAL
Saudação → Identificação necessidade → Coleta dados progressiva (nome, área, situação, contato, cidade) → Agendamento → Confirmação

## EMOJIS E TOM
- Use emojis **naturalmente** e **com moderação** (máx 1 por msg) quando adequado ao tom
- Ex: "Entendi 😊" "Vamos resolver isso 💪" "Deus abençoe 🙏"
- NÃO use emojis em mensagens sérias/urgentes/tristes`;

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