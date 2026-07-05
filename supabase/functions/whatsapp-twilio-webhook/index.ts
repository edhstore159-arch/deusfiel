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
const AUDIO_BUCKET = "creative-assets"; // bucket privado; usamos signed URL para Twilio

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
  if (mediaUrl.startsWith("data:")) {
    const match = mediaUrl.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/);
    if (!match) throw new Error("data URL de mídia inválida");
    const bytes = b64ToBytes(match[2]);
    return { buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), contentType: match[1] };
  }
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

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function cleanBase64(value: string): string {
  let cleaned = String(value || "").trim();
  if (cleaned.startsWith("data:") && cleaned.includes(",")) cleaned = cleaned.split(",").pop() || "";
  cleaned = cleaned.replace(/\s/g, "");
  if (!cleaned || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) throw new Error("invalid base64 image data");
  return cleaned;
}

async function describeImage(buffer: ArrayBuffer, mime: string, userCaption: string): Promise<string> {
  const cleanMime = (mime || "image/jpeg").split(";")[0].trim().toLowerCase();
  const b64 = cleanBase64(bufferToBase64(buffer));
  const dataUrl = `data:${cleanMime};base64,${b64}`;
  const question = userCaption?.trim()
    ? `O cliente enviou esta imagem junto com o texto: "${userCaption.trim()}". Descreva detalhadamente o que aparece na imagem e relacione com o texto quando fizer sentido.`
    : `O cliente enviou esta imagem. Descreva detalhadamente o que aparece nela (objetos, pessoas, textos visíveis, contexto). Se for um documento, extraia o texto principal.`;
  const messages = [{
    role: "user",
    content: [
      { type: "text", text: question },
      { type: "image_url", image_url: { url: dataUrl } },
    ],
  }];

  // Try Lovable first, then Emergent
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
      });
      if (r.ok) {
        const d = await r.json();
        const txt = d?.choices?.[0]?.message?.content;
        if (typeof txt === "string" && txt.trim()) return txt.trim();
      } else {
        console.error("[whatsapp] vision lovable falhou", r.status, (await r.text()).slice(0, 200));
      }
    } catch (e) { console.error("[whatsapp] vision lovable exc", e); }
  }
  const emergentKey = Deno.env.get("EMERGENT_API_KEY");
  if (emergentKey) {
    try {
      const r = await fetch("https://integrations.emergentagent.com/llm/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${emergentKey}` },
        body: JSON.stringify({ model: "gemini/gemini-2.5-flash", messages }),
      });
      if (r.ok) {
        const d = await r.json();
        const txt = d?.choices?.[0]?.message?.content;
        if (typeof txt === "string" && txt.trim()) return txt.trim();
      } else {
        console.error("[whatsapp] vision emergent falhou", r.status, (await r.text()).slice(0, 200));
      }
    } catch (e) { console.error("[whatsapp] vision emergent exc", e); }
  }
  return "";
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
    return await signStorageUrl(AUDIO_BUCKET, path);
  } catch (e) {
    console.error("[whatsapp] upload exceção", e);
    return null;
  }
}

function detectImagePrompt(text: string): string | null {
  const t = String(text || "").trim();
  if (!t) return null;
  // gatilhos: "gera/gere/crie/faça/desenhe/ilustre uma imagem/foto/figura/desenho/arte de ..."
  const re = /\b(gera(?:r)?|gere|cria(?:r)?|crie|fa[çc]a|desenha(?:r)?|desenhe|ilustre|ilustra(?:r)?|produza|monte)\s+(?:uma\s+|um\s+|essa\s+|esse\s+)?(?:imagem|foto|figura|desenho|arte|ilustra[cç][aã]o|logo|logotipo|banner|poster|p[oô]ster|thumbnail)\s+(?:de\s+|com\s+|sobre\s+|do\s+|da\s+|dos\s+|das\s+)?(.+)/i;
  const m = t.match(re);
  if (m && m[2] && m[2].trim().length >= 2) return m[2].trim();
  // padrão alternativo: "imagem: xxx" / "foto: xxx"
  const m2 = t.match(/^\s*(?:imagem|foto|figura|ilustra[cç][aã]o|arte)\s*[:\-]\s*(.+)/i);
  if (m2 && m2[1].trim().length >= 2) return m2[1].trim();
  return null;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(cleanBase64(b64));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function tryOpenAIImage(prompt: string): Promise<Uint8Array | null> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", n: 1 }),
    });
    if (!r.ok) {
      console.error("[whatsapp] openai image falhou", r.status, (await r.text()).slice(0, 300));
      return null;
    }
    const d = await r.json();
    const b64 = d?.data?.[0]?.b64_json;
    if (b64) return b64ToBytes(b64);
    const url = d?.data?.[0]?.url;
    if (url) {
      const ir = await fetch(url);
      if (ir.ok) return new Uint8Array(await ir.arrayBuffer());
    }
    return null;
  } catch (e) {
    console.error("[whatsapp] openai image exceção", e);
    return null;
  }
}

async function tryEmergentImage(prompt: string): Promise<Uint8Array | null> {
  const key = Deno.env.get("EMERGENT_API_KEY");
  if (!key) return null;
  // Try LiteLLM /images/generations first (OpenAI-compatible)
  try {
    const r = await fetch("https://integrations.emergentagent.com/llm/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-image-2", prompt, size: "1024x1024", n: 1 }),
    });
    if (r.ok) {
      const d = await r.json();
      const b64 = d?.data?.[0]?.b64_json;
      if (b64) return b64ToBytes(b64);
      const url = d?.data?.[0]?.url;
      if (url) {
        const ir = await fetch(url);
        if (ir.ok) return new Uint8Array(await ir.arrayBuffer());
      }
    } else {
      console.error("[whatsapp] emergent /images falhou", r.status, (await r.text()).slice(0, 300));
    }
  } catch (e) {
    console.error("[whatsapp] emergent /images exceção", e);
  }
  // Fallback: chat/completions with gemini image modality
  for (const model of ["vertex_ai/gemini-2.5-flash-image", "vertex_ai/gemini-3.1-flash-image-preview"]) {
    try {
      const r = await fetch("https://integrations.emergentagent.com/llm/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          modalities: ["image", "text"],
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!r.ok) {
        console.error("[whatsapp] emergent chat img falhou", model, r.status, (await r.text()).slice(0, 200));
        continue;
      }
      const d = await r.json();
      const msg = d?.choices?.[0]?.message;
      const url: string | undefined = msg?.images?.[0]?.image_url?.url;
      if (url?.startsWith("data:")) {
        const b64 = url.split(",")[1];
        if (b64) return b64ToBytes(b64);
      }
      if (url) {
        const ir = await fetch(url);
        if (ir.ok) return new Uint8Array(await ir.arrayBuffer());
      }
      const content = String(msg?.content || "");
      const m = content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+)/);
      if (m) return b64ToBytes(m[1]);
    } catch (e) {
      console.error("[whatsapp] emergent chat img exceção", model, e);
    }
  }
  return null;
}

async function tryLovableGeminiImage(prompt: string): Promise<Uint8Array | null> {
  if (!LOVABLE_API_KEY) return null;
  // Gemini "Nano Banana" image generation via chat/completions with image modality
  for (const model of ["google/gemini-2.5-flash-image", "google/gemini-3.1-flash-image"]) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Lovable-API-Key": LOVABLE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          modalities: ["image", "text"],
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!r.ok) {
        console.error("[whatsapp] gemini image falhou", model, r.status, (await r.text()).slice(0, 300));
        continue;
      }
      const d = await r.json();
      const msg = d?.choices?.[0]?.message;
      const url: string | undefined = msg?.images?.[0]?.image_url?.url;
      if (url?.startsWith("data:")) {
        const b64 = url.split(",")[1];
        if (b64) return b64ToBytes(b64);
      }
      if (url) {
        const ir = await fetch(url);
        if (ir.ok) return new Uint8Array(await ir.arrayBuffer());
      }
      const content = String(msg?.content || "");
      const m = content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+)/);
      if (m) return b64ToBytes(m[1]);
    } catch (e) {
      console.error("[whatsapp] gemini image exceção", model, e);
    }
  }
  return null;
}

async function tryLovableImage(prompt: string): Promise<Uint8Array | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "openai/gpt-image-2", prompt, quality: "low", size: "1024x1024", n: 1 }),
    });
    if (!r.ok) {
      console.error("[whatsapp] lovable image falhou", r.status, (await r.text()).slice(0, 300));
      return null;
    }
    const d = await r.json();
    const b64 = d?.data?.[0]?.b64_json;
    if (b64) return b64ToBytes(b64);
    return null;
  } catch (e) {
    console.error("[whatsapp] lovable image exceção", e);
    return null;
  }
}

async function generateImagePng(prompt: string): Promise<Uint8Array | null> {
  // Prioridade: Gemini (Lovable AI) → OpenAI → Emergent → Lovable gpt-image
  return (await tryLovableGeminiImage(prompt))
      ?? (await tryOpenAIImage(prompt))
      ?? (await tryEmergentImage(prompt))
      ?? (await tryLovableImage(prompt));
}

async function uploadImagePublic(bytes: Uint8Array): Promise<string | null> {
  try {
    const path = `wa-img/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${AUDIO_BUCKET}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "image/png",
        "x-upsert": "true",
      },
      body: bytes,
    });
    if (!r.ok) {
      console.error("[whatsapp] upload imagem falhou", r.status, await r.text());
      return null;
    }
    return await signStorageUrl(AUDIO_BUCKET, path);
  } catch (e) {
    console.error("[whatsapp] upload imagem exceção", e);
    return null;
  }
}

async function signStorageUrl(bucket: string, path: string, expiresIn = 60 * 60 * 24): Promise<string | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn }),
    });
    if (!r.ok) {
      console.error("[whatsapp] signed url falhou", r.status, await r.text());
      return null;
    }
    const d = await r.json();
    const signed = d?.signedURL || d?.signedUrl;
    if (!signed) return null;
    return `${SUPABASE_URL}/storage/v1${signed.startsWith("/") ? signed : "/" + signed}`;
  } catch (e) {
    console.error("[whatsapp] signed url exceção", e);
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

    let userText = body;
    let audioFailed = false;
    let inboundWasAudio = false;
    let inboundImageDescription = "";

    if (numMedia > 0) {
      const mediaUrl = String(form.get("MediaUrl0") || "");
      const mediaTypeRaw = String(form.get("MediaContentType0") || "audio/ogg");
      const mediaType = mediaTypeRaw.split(";")[0].trim().toLowerCase();
      const isAudio = mediaType.startsWith("audio") || mediaType.includes("ogg") || mediaType.includes("opus");
      const isImage = mediaType.startsWith("image/");
      if (mediaUrl && isAudio) {
        inboundWasAudio = true;
        try {
          console.log("[whatsapp] baixando áudio", { mediaUrl, mediaType });
          const { buffer, contentType } = await fetchTwilioMedia(mediaUrl);
          const cleanCt = (contentType || mediaType).split(";")[0].trim().toLowerCase();
          console.log("[whatsapp] áudio baixado", { bytes: buffer.byteLength, cleanCt });
          const transcribed = await transcribe(buffer, cleanCt);
          console.log("[whatsapp] transcrição", { chars: transcribed.length, preview: transcribed.slice(0, 80) });
          if (transcribed) userText = transcribed;
          else audioFailed = true;
        } catch (audioErr) {
          console.error("[whatsapp] erro no áudio:", audioErr);
          audioFailed = true;
        }
      } else if (mediaUrl && isImage) {
        try {
          console.log("[whatsapp] baixando imagem", { mediaUrl, mediaType });
          const { buffer, contentType } = await fetchTwilioMedia(mediaUrl);
          const cleanCt = (contentType || mediaType).split(";")[0].trim().toLowerCase();
          console.log("[whatsapp] imagem baixada", { bytes: buffer.byteLength, cleanCt });
          const desc = await describeImage(buffer, cleanCt, body);
          console.log("[whatsapp] descrição imagem", { chars: desc.length, preview: desc.slice(0, 120) });
          if (desc) {
            inboundImageDescription = desc;
            userText = body?.trim()
              ? `${body.trim()}\n\n[Imagem enviada pelo cliente — descrição: ${desc}]`
              : `[O cliente enviou uma imagem. Descrição do conteúdo: ${desc}]\n\nResponda de forma útil e acolhedora sobre essa imagem.`;
          }
        } catch (imgErr) {
          console.error("[whatsapp] erro na imagem:", imgErr);
        }
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

    // === Geração de imagem sob demanda ===
    const imgPrompt = detectImagePrompt(userText);
    if (imgPrompt) {
      console.log("[whatsapp] intent imagem detectado", { imgPrompt });
      const bytes = await generateImagePng(imgPrompt);
      console.log("[whatsapp] geração imagem", { ok: !!bytes, bytes: bytes?.byteLength || 0 });
      const url = bytes ? await uploadImagePublic(bytes) : null;
      console.log("[whatsapp] upload imagem whatsapp", { hasUrl: !!url });
      if (url) {
        await sendTwilioMessage(to, from, `Pronto! Aqui está a imagem sobre: ${imgPrompt}`, url);
      } else {
        await sendTwilioMessage(to, from, "Não consegui gerar a imagem agora. Pode tentar novamente com uma descrição diferente?");
      }
      return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
    }

    const { reply, audio_base64 } = await callChatAI(userText, from.replace(/[^\d+]/g, ""), inboundWasAudio);
    await sleep(1000 + Math.floor(Math.random() * 2000));
    let mediaUrl: string | null = null;
    if (inboundWasAudio && audio_base64) {
      mediaUrl = await uploadAudioPublic(audio_base64);
      console.log("[whatsapp] resposta em áudio", { hasUrl: !!mediaUrl });
    }
    // From e To invertidos para responder
    await sendTwilioMessage(to, from, reply, mediaUrl);

    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
  } catch (e) {
    console.error("[whatsapp-twilio-webhook]", e);
    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" }, status: 200 });
  }
});
