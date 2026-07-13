// Webhook do Twilio WhatsApp.
// Configure no Twilio Console (Messaging → Sandbox/Sender → "When a message comes in"):
//   https://<PROJECT_REF>.functions.supabase.co/whatsapp-twilio-webhook
//   método: POST
// Recebe form-urlencoded da Twilio, transcreve áudio (se houver),
// chama chat-ai e responde via Twilio.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY")!;
const AUDIO_BUCKET = "debug-uploads"; // bucket público (TTS respostas)
const DOCS_BUCKET = "whatsapp-documents"; // bucket privado (docs recebidos)
const DOC_URL_TTL = 60 * 60 * 24 * 7; // 7 dias

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "video/quicktime": "mov",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/plain": "txt",
  };
  return map[mime.toLowerCase()] || (mime.split("/")[1] || "bin").split(";")[0];
}

async function uploadWhatsappDocument(
  bytes: Uint8Array,
  mime: string,
  contactId: string,
  originalName?: string,
): Promise<{ signedUrl: string | null; path: string } | null> {
  try {
    const ext = extFromMime(mime);
    const safeContact = (contactId || "unknown").replace(/[^\d]/g, "") || "unknown";
    const filename = (originalName || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`).replace(/[^\w.\-]/g, "_");
    const path = `${safeContact}/${Date.now()}-${filename}`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${DOCS_BUCKET}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": mime || "application/octet-stream",
        "x-upsert": "true",
      },
      body: bytes,
    });
    if (!up.ok) {
      console.error("[whatsapp] upload doc falhou", up.status, await up.text());
      return null;
    }
    const sign = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${DOCS_BUCKET}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: DOC_URL_TTL }),
    });
    const s = await sign.json().catch(() => ({}));
    const signedPath = s.signedURL || s.signedUrl;
    return { signedUrl: signedPath ? `${SUPABASE_URL}/storage/v1${signedPath}` : null, path };
  } catch (e) {
    console.error("[whatsapp] upload doc exceção", e);
    return null;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getSaoPauloHour() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === "hour")?.value || "0");
}

function isBusinessHours() {
  const hour = getSaoPauloHour();
  return hour >= 8 && hour < 20;
}

function isOptOut(text: string) {
  return /\b(sair|parar|cancelar|stop|remover)\b/i.test(text);
}

async function fetchTwilioMedia(mediaUrl: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  // MediaUrl no formato: https://api.twilio.com/2010-04-01/Accounts/{Sid}/Messages/{MSid}/Media/{MeSid}
  // Reescrevemos para o gateway: /Messages/{MSid}/Media/{MeSid}
  const m = mediaUrl.match(/\/Messages\/([^/]+)\/Media\/([^/?]+)/);
  if (!m) throw new Error("media URL inesperada: " + mediaUrl);
  const url = `${GATEWAY_URL}/Messages/${m[1]}/Media/${m[2]}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
    },
    redirect: "follow",
  });
  if (!r.ok) throw new Error(`media ${r.status}`);
  return { buffer: await r.arrayBuffer(), contentType: r.headers.get("content-type") || "audio/ogg" };
}

async function transcribe(buffer: ArrayBuffer, mime: string): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  const r = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-audio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ audio_base64: b64, mime_type: mime }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`transcribe ${r.status}: ${JSON.stringify(d)}`);
  return d.text || d.transcript || "";
}

async function callChatAI(userText: string, sessionId: string, wantAudio: boolean): Promise<{ reply: string; audio_base64: string | null }> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/chat-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ message: userText, want_audio: wantAudio, session_id: sessionId }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`chat-ai ${r.status}: ${JSON.stringify(d)}`);
  return {
    reply: d.response || d.reply || "Desculpe, não consegui processar agora.",
    audio_base64: d.audio_base64 || null,
  };
}

async function uploadAudioPublic(audioB64: string): Promise<string | null> {
  try {
    const bin = atob(audioB64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const path = `wa-tts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${AUDIO_BUCKET}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "audio/mpeg",
        "x-upsert": "true",
      },
      body: bytes,
    });
    if (!r.ok) {
      console.error("[whatsapp] upload áudio falhou", r.status, await r.text());
      return null;
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${AUDIO_BUCKET}/${path}`;
  } catch (e) {
    console.error("[whatsapp] upload exceção", e);
    return null;
  }
}

async function sendTwilioMessage(from: string, to: string, body: string, mediaUrl?: string | null) {
  const params: Record<string, string> = { From: from, To: to, Body: body };
  if (mediaUrl) params.MediaUrl = mediaUrl;
  const r = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`twilio send ${r.status}: ${t}`);
  }
}

async function logWhatsappMessage(opts: {
  contactId: string;
  contactPhone: string;
  contactName?: string;
  text: string;
  fromMe: boolean;
  providerMessageId?: string;
}) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        contact_id: opts.contactId,
        contact_phone: opts.contactPhone,
        contact_name: opts.contactName || null,
        text: opts.text,
        from_me: opts.fromMe,
        provider_message_id: opts.providerMessageId || null,
      }),
    });
    if (!r.ok) console.error("[whatsapp] log msg falhou", r.status, await r.text());
  } catch (e) {
    console.error("[whatsapp] log msg exceção", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const form = await req.formData();
    const from = String(form.get("From") || "");      // ex: whatsapp:+5511...
    const to = String(form.get("To") || "");          // seu número Twilio
    const body = String(form.get("Body") || "").trim();
    const numMedia = Number(form.get("NumMedia") || "0");

    console.log("[whatsapp] inbound", {
      from,
      to,
      hasBody: body.length > 0,
      numMedia,
      mediaType0: form.get("MediaContentType0"),
    });

    const contactPhone = from.replace(/^whatsapp:/i, "").trim();
    const contactId = contactPhone.replace(/[^\d+]/g, "");
    const contactName = String(form.get("ProfileName") || "").trim() || undefined;
    const providerMessageId = String(form.get("MessageSid") || "") || undefined;

    let userText = body;
    let audioFailed = false;
    let inboundWasAudio = false;

    // Percorre todas as mídias: áudio → transcreve, restante → arquiva como documento
    const docSummaries: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = String(form.get(`MediaUrl${i}`) || "");
      const mediaTypeRaw = String(form.get(`MediaContentType${i}`) || "");
      const mediaType = mediaTypeRaw.split(";")[0].trim().toLowerCase();
      if (!mediaUrl) continue;
      const isAudio = mediaType.startsWith("audio") || mediaType.includes("ogg") || mediaType.includes("opus");

      if (isAudio) {
        inboundWasAudio = true;
        try {
          console.log("[whatsapp] baixando áudio", { mediaUrl, mediaType });
          const { buffer, contentType } = await fetchTwilioMedia(mediaUrl);
          const cleanCt = (contentType || mediaType).split(";")[0].trim().toLowerCase();
          const transcribed = await transcribe(buffer, cleanCt);
          console.log("[whatsapp] transcrição", { chars: transcribed.length, preview: transcribed.slice(0, 80) });
          if (transcribed) userText = (userText ? userText + "\n" : "") + transcribed;
          else audioFailed = true;
        } catch (audioErr) {
          console.error("[whatsapp] erro no áudio:", audioErr);
          audioFailed = true;
        }
        continue;
      }

      // Documento / imagem / vídeo → armazena no bucket privado
      try {
        console.log("[whatsapp] baixando documento", { mediaUrl, mediaType });
        const { buffer, contentType } = await fetchTwilioMedia(mediaUrl);
        const cleanCt = (contentType || mediaType).split(";")[0].trim().toLowerCase() || "application/octet-stream";
        const uploaded = await uploadWhatsappDocument(new Uint8Array(buffer), cleanCt, contactId);
        const kind = cleanCt.startsWith("image/") ? "🖼️ Imagem" : cleanCt === "application/pdf" ? "📄 PDF" : cleanCt.startsWith("video/") ? "🎥 Vídeo" : "📎 Documento";
        const line = uploaded?.signedUrl
          ? `${kind} recebido: ${uploaded.signedUrl}`
          : `${kind} recebido (falha ao gerar link)`;
        docSummaries.push(line);
        // Registra cada arquivo como uma mensagem própria para aparecer no chat do dashboard
        await logWhatsappMessage({
          contactId,
          contactPhone,
          contactName,
          text: line,
          fromMe: false,
          providerMessageId: providerMessageId ? `${providerMessageId}-media${i}` : undefined,
        });
      } catch (docErr) {
        console.error("[whatsapp] erro ao armazenar documento:", docErr);
      }
    }

    // Se veio documento(s), confirma o recebimento diretamente (sem chat-ai para evitar
    // que a IA diga que não pode receber anexos) e encerra se não houver texto adicional.
    if (docSummaries.length > 0) {
      const qtd = docSummaries.length;
      const confirmMsg = qtd === 1
        ? "Recebi seu arquivo aqui pelo WhatsApp ✅ A Dra. Kênia vai analisar e te retorno em seguida. Se puder, me conta rapidamente sobre o que se trata."
        : `Recebi seus ${qtd} arquivos aqui pelo WhatsApp ✅ A Dra. Kênia vai analisar e te retorno em seguida. Se puder, me conta rapidamente sobre o que se trata.`;
      await sendTwilioMessage(to, from, confirmMsg).catch((err) => console.error("[whatsapp] falha ao confirmar doc:", err));
      await logWhatsappMessage({ contactId, contactPhone, contactName, text: confirmMsg, fromMe: true });
      if (!userText) {
        return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
      }
    }


    if (!userText) {
      if (audioFailed) {
        await sendTwilioMessage(
          to,
          from,
          "Recebi seu áudio, mas não consegui entender desta vez. Pode tentar gravar novamente ou enviar por texto? 🙏",
        ).catch((err) => console.error("[whatsapp] falha ao avisar áudio:", err));
      }
      return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
    }


    if (isOptOut(userText)) {
      await sendTwilioMessage(to, from, "Tudo bem, atendimento automático pausado. Se precisar falar conosco novamente, envie uma nova mensagem. ✨");
      return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
    }

    if (!isBusinessHours()) {
      await sendTwilioMessage(to, from, "Recebi sua mensagem. Nosso atendimento funciona das 8h às 20h, e retornaremos no próximo horário útil. ✨");
      return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
    }

    // Loga a mensagem recebida do cliente (dispara trigger de agendamento/reagendamento)
    await logWhatsappMessage({
      contactId,
      contactPhone,
      contactName,
      text: userText,
      fromMe: false,
      providerMessageId,
    });

    const { reply, audio_base64 } = await callChatAI(userText, contactId, inboundWasAudio);
    // Delay humanizado: simula tempo de leitura + digitação para não parecer bot
    // 4s base + 30ms/caractere + jitter aleatório de 2s (mínimo ~5s, máximo ~15s)
    const typingMs = Math.min(15000, 4000 + reply.length * 30 + Math.floor(Math.random() * 2000));
    await sleep(typingMs);
    let mediaUrl: string | null = null;
    if (inboundWasAudio && audio_base64) {
      mediaUrl = await uploadAudioPublic(audio_base64);
      console.log("[whatsapp] resposta em áudio", { hasUrl: !!mediaUrl });
    }
    // From e To invertidos para responder
    await sendTwilioMessage(to, from, reply, mediaUrl);

    // Loga a resposta enviada
    await logWhatsappMessage({
      contactId,
      contactPhone,
      contactName,
      text: reply,
      fromMe: true,
    });

    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
  } catch (e) {
    console.error("[whatsapp-twilio-webhook]", e);
    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
  }
});
