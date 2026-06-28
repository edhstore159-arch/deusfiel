// Shared helper: call Gemini Nano Banana (image generation/editing)
// Fallback order: Lovable AI Gateway → Google Gemini (direct) → Emergent universal LLM.
// Returns a data URL (e.g. "data:image/png;base64,...") or null on failure.

type Content =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface NanoBananaOptions {
  prompt: string;
  imageUrls?: string[]; // data URLs or http(s) URLs
  mode?: "edit" | "fusion" | "template" | "generate";
  allowTextOnlyFallback?: boolean; // Pollinations cannot read image references; keep false for edit/template flows.
}

const FACE_PRESERVATION_LOCK =
  "Face preservation lock: when any reference image contains a person, preserve the original identity and facial geometry exactly. Keep eyes aligned, pupils natural, nose and mouth realistic, skin texture natural, expression relaxed. Do not redraw the face, do not beautify, do not over-smooth, do not stretch, warp, melt, duplicate, replace, or stylize facial features.";

function withFacePreservation(prompt: string) {
  return `${prompt}\n\n${FACE_PRESERVATION_LOCK}\nNegative: distorted face, warped face, melted face, asymmetrical eyes, duplicated eyes, distorted pupils, fake teeth, plastic skin, over-smoothed skin, changed identity, different person.`;
}

function extractImageFromAny(value: any, depth = 0): string | null {
  if (!value || depth > 8) return null;
  const RX = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/;
  if (typeof value === "string") {
    const dataUrl = value.match(RX)?.[0];
    if (dataUrl) return dataUrl.replace(/\s+/g, "");
    const imageUrl = value.match(/https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp)(?:\?[^\s"'<>]*)?/i)?.[0];
    if (imageUrl) return imageUrl;
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractImageFromAny(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const direct = value.url || value.image_url?.url || value.inlineData?.data || value.inline_data?.data || value.b64_json;
    if (typeof direct === "string") {
      if (direct.startsWith("data:image/") || direct.startsWith("http")) return extractImageFromAny(direct, depth + 1) || direct;
      const compact = direct.replace(/\s+/g, "");
      const mime = value.inlineData?.mimeType || value.inline_data?.mime_type || "image/png";
      if (compact.length > 80 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return `data:${mime};base64,${compact}`;
    }
    for (const key of ["images", "content", "message", "data", "choices", "parts", "output"]) {
      const found = extractImageFromAny(value[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function extractImageFromMessage(msg: any): string | null {
  if (!msg) return null;
  const images = msg.images;
  if (Array.isArray(images) && images.length > 0) {
    const url = images[0]?.image_url?.url || images[0]?.url;
    if (url) return url;
  }
  const RX = /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/;
  if (typeof msg.content === "string") {
    const m = msg.content.match(RX);
    if (m) return m[0].replace(/\s+/g, "");
  }
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part?.type === "image_url" && part?.image_url?.url) return part.image_url.url;
      if (typeof part?.text === "string") {
        const m = part.text.match(RX);
        if (m) return m[0].replace(/\s+/g, "");
      }
    }
  }
  return extractImageFromAny(msg);
}

function buildContent({ prompt, imageUrls }: NanoBananaOptions): Content[] {
  const parts: Content[] = [{ type: "text", text: prompt }];
  for (const u of imageUrls || []) parts.push({ type: "image_url", image_url: { url: u } });
  return parts;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toBase64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  }
  return btoa(binary);
}

function buildLocalFusionFallback(opts: NanoBananaOptions): string | null {
  const images = (opts.imageUrls || []).filter(Boolean).slice(0, 2);
  if (!images.length) return null;
  if (images.length === 1) {
    const reference = escapeXml(images[0]);
    // Reference/template fallback: do NOT invent a new poster. Preserve the
    // uploaded image as the output when true image-edit providers are unavailable.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#ffffff"/>
  <image href="${reference}" x="0" y="0" width="1024" height="1024" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
    return `data:image/svg+xml;base64,${toBase64Utf8(svg)}`;
  }
  const person = escapeXml(images[0]);
  const scene = escapeXml(images[1] || images[0]);
  // Fusão local SEM IA preservando o ROSTO:
  // - cenário ao fundo (leve desfoque) cobrindo toda a área
  // - pessoa centralizada com preserveAspectRatio="xMidYMid meet"
  //   (NUNCA corta nem estica o rosto — proporção real mantida)
  // - máscara radial suave só nas bordas para integrar ao cenário
  // - SEM color-matrix sobre a pessoa (preserva tom de pele e traços)
  // Mantém o rosto INTACTO: sem corte (meet), máscara só nas bordas extremas,
  // sem color-matrix, sem desfoque sobre a pessoa, sombra suave de ambiente.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="pm" cx="50%" cy="50%" r="78%">
      <stop offset="88%" stop-color="white" stop-opacity="1"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <mask id="soft"><rect width="1024" height="1024" fill="black"/><rect width="1024" height="1024" fill="url(#pm)"/></mask>
    <filter id="bgSoft"><feGaussianBlur stdDeviation="12"/></filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="22"/>
      <feOffset dx="0" dy="28" result="o"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.32"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <image href="${scene}" x="0" y="0" width="1024" height="1024" preserveAspectRatio="xMidYMid slice" filter="url(#bgSoft)"/>
  <rect width="1024" height="1024" fill="rgba(0,0,0,0.10)"/>
  <g mask="url(#soft)" filter="url(#shadow)">
    <image href="${person}" x="0" y="0" width="1024" height="1024" preserveAspectRatio="xMidYMid meet"/>
  </g>
</svg>`;
  return `data:image/svg+xml;base64,${toBase64Utf8(svg)}`;
}

async function callLovableGateway(opts: NanoBananaOptions): Promise<{ url: string | null; error?: string }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { url: null, error: "LOVABLE_API_KEY ausente" };
  const safeOpts = { ...opts, prompt: withFacePreservation(opts.prompt) };
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        modalities: ["image", "text"],
        messages: [{ role: "user", content: buildContent(safeOpts) }],
      }),
    });
    if (!resp.ok) {
      return { url: null, error: `Lovable Gateway ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
    }
    const data = await resp.json();
    const url = extractImageFromMessage(data?.choices?.[0]?.message);
    return { url, error: url ? undefined : "Lovable Gateway não retornou imagem" };
  } catch (e) {
    return { url: null, error: `Lovable Gateway erro: ${(e as Error)?.message || e}` };
  }
}

// Direct Google Generative Language API (Gemini) — uses GEMINI_API_KEY.
async function callGeminiDirect(opts: NanoBananaOptions): Promise<{ url: string | null; error?: string }> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return { url: null, error: "GEMINI_API_KEY ausente" };
  const model = "gemini-2.5-flash-image";
  const parts: any[] = [{ text: withFacePreservation(opts.prompt) }];
  for (const u of opts.imageUrls || []) {
    const m = String(u).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      },
    );
    if (!resp.ok) {
      return { url: null, error: `Gemini direto ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
    }
    const data = await resp.json();
    const out = data?.candidates?.[0]?.content?.parts || [];
    const inline = out.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
    const b64 = inline?.inlineData?.data || inline?.inline_data?.data;
    const mime = inline?.inlineData?.mimeType || inline?.inline_data?.mime_type || "image/png";
    if (!b64) return { url: null, error: "Gemini direto não retornou imagem" };
    return { url: `data:${mime};base64,${b64}` };
  } catch (e) {
    return { url: null, error: `Gemini direto erro: ${(e as Error)?.message || e}` };
  }
}

function parseDataUrl(value: string): { mime: string; base64: string; ext: string } | null {
  const raw = String(value || "").trim();
  // tolera quebras de linha/espacos no base64 (algumas fontes adicionam \n)
  const m = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!m) return null;
  const mime = m[1] || "image/png";
  const cleaned = m[2].replace(/\s+/g, "");
  if (!cleaned || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) return null;
  const ext = mime.includes("jpeg") ? "jpg" : (mime.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "") || "png";
  return { mime, base64: cleaned, ext };
}

function dataUrlToBlob(value: string): { blob: Blob; filename: string } | null {
  const parsed = parseDataUrl(value);
  if (!parsed) return null;
  const bin = atob(parsed.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { blob: new Blob([bytes], { type: parsed.mime }), filename: `reference.${parsed.ext}` };
}

function dataUrlToBytes(value: string): { bytes: Uint8Array; mime: string; filename: string } | null {
  const parsed = parseDataUrl(value);
  if (!parsed) return null;
  const bin = atob(parsed.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime: parsed.mime, filename: `reference.${parsed.ext}` };
}

function buildMultipartBody(
  fields: Record<string, string>,
  files: Array<{ name: string; filename: string; mime: string; bytes: Uint8Array }>,
) {
  const boundary = `----kenia-${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const pushText = (value: string) => chunks.push(encoder.encode(value));
  for (const [name, value] of Object.entries(fields)) {
    pushText(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  }
  for (const file of files) {
    pushText(`--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.mime}\r\n\r\n`);
    chunks.push(file.bytes);
    pushText("\r\n");
  }
  pushText(`--${boundary}--\r\n`);
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}`, contentLength: String(length) };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 25000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function looksLikeBareBase64Image(value: string) {
  const compact = value.replace(/\s+/g, "");
  return compact.length > 80 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact);
}

async function remoteImageToDataUrl(url: string): Promise<string> {
  const resp = await fetchWithTimeout(url, { method: "GET" }, 20000);
  if (!resp.ok) throw new Error(`Falha ao baixar imagem de referência: ${resp.status}`);
  const contentType = (resp.headers.get("content-type") || "image/png").split(";")[0];
  if (!contentType.startsWith("image/")) throw new Error(`URL de referência não é imagem: ${contentType}`);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  return `data:${contentType};base64,${btoa(bin)}`;
}

async function normalizeReferenceImages(imageUrls?: string[]) {
  const out: string[] = [];
  for (const raw of imageUrls || []) {
    const value = String(raw || "").trim();
    if (!value) continue;
    if (/^data:image\//i.test(value)) {
      const parsed = parseDataUrl(value);
      out.push(parsed ? `data:${parsed.mime};base64,${parsed.base64}` : value);
    } else if (/^https?:\/\//i.test(value)) {
      try {
        out.push(await remoteImageToDataUrl(value));
      } catch (e) {
        console.warn("⚠️ Não foi possível normalizar URL de imagem:", (e as Error)?.message || e);
        out.push(value);
      }
    } else if (looksLikeBareBase64Image(value)) {
      out.push(`data:image/png;base64,${value.replace(/\s+/g, "")}`);
    } else {
      out.push(value);
    }
  }
  return out;
}

async function callOpenAIImages(opts: NanoBananaOptions): Promise<{ url: string | null; error?: string }> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return { url: null, error: "OPENAI_API_KEY ausente" };

  const prompt = withFacePreservation(opts.prompt);
  const imageUrls = (opts.imageUrls || []).filter(Boolean);
  try {
    if (imageUrls.length > 0) {
      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("prompt", prompt);
      form.append("size", "1024x1024");
      for (const u of imageUrls.slice(0, 4)) {
        const converted = dataUrlToBlob(u);
        if (!converted) continue;
        form.append(imageUrls.length > 1 ? "image[]" : "image", converted.blob, converted.filename);
      }
      if (!form.has("image")) return { url: null, error: "OpenAI: imagem de referência inválida" };

      const resp = await fetchWithTimeout("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      }, 25000);
      const text = await resp.text();
      if (!resp.ok) return { url: null, error: `OpenAI edição ${resp.status}: ${text.slice(0, 240)}` };
      const data = JSON.parse(text);
      const b64 = data?.data?.[0]?.b64_json;
      const url = data?.data?.[0]?.url;
      if (b64) return { url: `data:image/png;base64,${b64}` };
      if (url) return { url };
      return { url: null, error: "OpenAI edição não retornou imagem" };
    }

    const resp = await fetchWithTimeout("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", n: 1 }),
    }, 25000);
    const text = await resp.text();
    if (!resp.ok) return { url: null, error: `OpenAI imagem ${resp.status}: ${text.slice(0, 240)}` };
    const data = JSON.parse(text);
    const b64 = data?.data?.[0]?.b64_json;
    const url = data?.data?.[0]?.url;
    if (b64) return { url: `data:image/png;base64,${b64}` };
    if (url) return { url };
    return { url: null, error: "OpenAI imagem não retornou imagem" };
  } catch (e) {
    return { url: null, error: `OpenAI erro: ${(e as Error)?.message || e}` };
  }
}

async function callEmergent(opts: NanoBananaOptions): Promise<{ url: string | null; error?: string }> {
  const key = Deno.env.get("EMERGENT_API_KEY");
  if (!key) return { url: null, error: "EMERGENT_API_KEY ausente" };
  const editPrefix = opts.mode === "edit"
    ? "STRICT IMAGE EDIT MODE: the uploaded image is the exact base canvas. Do not generate a new photo. Preserve all pixels/details except the specifically requested edit. The requested edit must be visibly applied.\n\n"
    : "";
  const safeOpts = { ...opts, prompt: editPrefix + withFacePreservation(opts.prompt) };
  const imageUrls = (safeOpts.imageUrls || []).filter(Boolean);

  // A chave Emergent expõe os modelos de imagem Gemini via Vertex AI no endpoint
  // OpenAI-compatible de chat. O endpoint /llm/images/edits tem apresentado
  // erro interno/timeout; por isso usamos chat multimodal primeiro, que edita e
  // gera imagens corretamente com a chave sk-emergent atual.
  const models = [
    "vertex_ai/gemini-2.5-flash-image",
    "vertex_ai/gemini-3.1-flash-image-preview",
  ];
  let lastError = "";
  const isQuotaError = (value: string) => /budget|exceed|quota|daily[_\s-]?(limit|spend)|daily_limit_reached|limit[_\s-]?reached/i.test(value);
  const quotaMessage = (detail: string) =>
    `Emergent: chave válida, mas bloqueada por limite/cota diária no provedor. Detalhe: ${detail}`;

  for (const model of models) {
    try {
      const resp = await fetchWithTimeout("https://integrations.emergentagent.com/llm/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          modalities: ["image", "text"],
          messages: [{ role: "user", content: buildContent(safeOpts) }],
        }),
      }, 45000);
      if (!resp.ok) {
        const txt = (await resp.text()).slice(0, 300);
        lastError = `Emergent[${model}] ${resp.status}: ${txt}`;
        if (isQuotaError(txt)) {
          return { url: null, error: quotaMessage(txt) };
        }
        continue;
      }
      const data = await resp.json();
      const url = extractImageFromMessage(data?.choices?.[0]?.message) || extractImageFromAny(data);
      if (url) return { url };
      lastError = `Emergent[${model}] sem imagem`;
      console.warn("⚠️ Emergent chat não retornou imagem:", JSON.stringify(data).slice(0, 300));
    } catch (e) {
      lastError = `Emergent[${model}] erro: ${(e as Error)?.message || e}`;
    }
  }

  try {
    if (imageUrls.length > 0) {
      const files = imageUrls.slice(0, 4).map((u) => dataUrlToBytes(u)).filter(Boolean) as Array<{ bytes: Uint8Array; mime: string; filename: string }>;
      if (files.length) {
        const multipart = buildMultipartBody(
          { model: "gpt-image-1", prompt: safeOpts.prompt, size: "1024x1024" },
          files.map((file) => ({ name: files.length > 1 ? "image[]" : "image", ...file })),
        );
        const resp = await fetchWithTimeout("https://integrations.emergentagent.com/llm/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": multipart.contentType, "Content-Length": multipart.contentLength },
          body: multipart.body,
        }, 12000);
        const text = await resp.text();
        if (resp.ok) {
          const data = JSON.parse(text);
          const b64 = data?.data?.[0]?.b64_json;
          const url = data?.data?.[0]?.url;
          if (b64) return { url: `data:image/png;base64,${b64}` };
          if (url) return { url };
        } else if (isQuotaError(text)) {
          return { url: null, error: quotaMessage(text.slice(0, 240)) };
        } else {
          console.warn("⚠️ Emergent images/edits falhou:", resp.status, text.slice(0, 240));
        }
      }
    } else {
      const resp = await fetchWithTimeout("https://integrations.emergentagent.com/llm/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1", prompt: safeOpts.prompt, size: "1024x1024", n: 1 }),
      }, 12000);
      const text = await resp.text();
      if (resp.ok) {
        const data = JSON.parse(text);
        const b64 = data?.data?.[0]?.b64_json;
        const url = data?.data?.[0]?.url;
        if (b64) return { url: `data:image/png;base64,${b64}` };
        if (url) return { url };
      } else if (isQuotaError(text)) {
        return { url: null, error: quotaMessage(text.slice(0, 240)) };
      } else {
        console.warn("⚠️ Emergent images/generations falhou:", resp.status, text.slice(0, 240));
      }
    }
  } catch (e) {
    console.warn("⚠️ Emergent images API erro:", (e as Error)?.message || e);
  }
  return { url: null, error: lastError || "Emergent falhou" };
}

async function callPollinations(opts: NanoBananaOptions): Promise<{ url: string | null; error?: string }> {
  // Free, unlimited text-to-image. Doesn't accept base64 inputs, so identity
  // is preserved only via the elaborated prompt (the prompt engineer already
  // describes the subject from IMAGE 1 in detail).
  try {
    const prompt = withFacePreservation(opts.prompt).slice(0, 1800);
    const seed = Math.floor(Math.random() * 1e9);
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=1024&height=1024&nologo=true&enhance=true&model=flux&seed=${seed}`;
    const resp = await fetch(url);
    if (!resp.ok) return { url: null, error: `Pollinations ${resp.status}` };
    const buf = new Uint8Array(await resp.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.slice(i, i + 0x8000));
    return { url: `data:image/jpeg;base64,${btoa(bin)}` };
  } catch (e) {
    return { url: null, error: `Pollinations erro: ${(e as Error)?.message || e}` };
  }
}

export async function generateWithNanoBanana(
  opts: NanoBananaOptions,
): Promise<{ url: string | null; provider: string; error?: string }> {
  const errs: string[] = [];
  const normalizedOpts = { ...opts, imageUrls: await normalizeReferenceImages(opts.imageUrls) };
  const hasRefs = Boolean(normalizedOpts.imageUrls?.length);

  // ===== Novo fluxo solicitado: Pollinations PRIMEIRO (rascunho gratuito),
  // depois Emergent para refinar/corrigir imperfeições usando o rascunho como referência.
  // Só aplica quando não há imagens de referência do usuário (geração pura).
  if (!hasRefs) {
    const draft = await callPollinations(normalizedOpts);
    if (draft.url) {
      if (Deno.env.get("EMERGENT_API_KEY")) {
        const refined = await callEmergent({
          ...normalizedOpts,
          imageUrls: [draft.url],
          prompt: `PHOTOREALISTIC FACE & ANATOMY RESTORATION PASS. Use the provided draft strictly as a layout/composition reference and repaint it as a high-fidelity photograph. STRICT REQUIREMENTS: (1) Faces must be perfectly symmetric, anatomically correct, with two natural eyes (matching color, correct pupils, no extra iris), one nose, one mouth with natural lips and teeth, natural skin texture with pores; NO melted, warped, doubled, asymmetric, cross-eyed, missing or extra facial features. (2) Hands must have exactly 5 fingers each, correct proportions, no fused/extra/missing digits. (3) Bodies must have correct proportions and limb count. (4) Preserve original composition, framing, clothing, lighting direction, ethnicity and number of people from the draft. (5) Sharp focus on faces, natural depth of field, professional photography, 50mm lens look, no plastic/CGI/3D-render appearance. NEGATIVE: deformed face, distorted face, mutated face, extra fingers, fused fingers, missing fingers, extra limbs, asymmetric eyes, lazy eye, cross-eyed, malformed mouth, bad teeth, uncanny valley, doll-like, plastic skin, cartoon, illustration, anime, painting, blurry, low-res. Scene context: ${opts.prompt}`,
        });
        if (refined.url) {
          console.info("✨ Pollinations → Emergent refine OK");
          return { url: refined.url, provider: "pollinations+emergent-refine" };
        }
        console.warn("⚠️ Emergent refine falhou, retornando rascunho Pollinations:", refined.error);
      }
      return { url: draft.url, provider: "pollinations-draft" };
    }
    errs.push(draft.error || "Pollinations falhou");
  }



  // Edição/fusão com imagem do usuário: tentar Emergent primeiro. Essa é a
  // chave configurada para edição real; evita gastar tempo em provedores sem
  // crédito e garante que a imagem enviada seja usada como referência.
  if (hasRefs && Deno.env.get("EMERGENT_API_KEY")) {
    const r = await callEmergent(normalizedOpts);
    if (r.url) return { url: r.url, provider: "emergent" };
    errs.push(r.error || "Emergent falhou");
    console.warn("⚠️ Emergent falhou:", r.error);
  }


  if (Deno.env.get("LOVABLE_API_KEY")) {
    const r = await callLovableGateway(normalizedOpts);
    if (r.url) return { url: r.url, provider: "lovable" };
    errs.push(r.error || "Lovable falhou");
    console.warn("⚠️ Lovable falhou:", r.error);
  }

  if (Deno.env.get("GEMINI_API_KEY")) {
    const r = await callGeminiDirect(normalizedOpts);
    if (r.url) return { url: r.url, provider: "gemini" };
    errs.push(r.error || "Gemini direto falhou");
    console.warn("⚠️ Gemini direto falhou:", r.error);
  }

  if (Deno.env.get("OPENAI_API_KEY")) {
    const r = await callOpenAIImages(normalizedOpts);
    if (r.url) return { url: r.url, provider: "openai" };
    errs.push(r.error || "OpenAI falhou");
    console.warn("⚠️ OpenAI falhou:", r.error);
  }

  if (!hasRefs) {
    const r3 = await callEmergent(normalizedOpts);
    if (r3.url) return { url: r3.url, provider: "emergent" };
    errs.push(r3.error || "Emergent falhou");
  }

  const hasReferenceImages = Boolean(normalizedOpts.imageUrls?.length);

  // Pollinations is text-only and cannot see uploaded reference images. For
  // edit/template flows, never use it unless the caller explicitly allows a
  // new image, otherwise it creates an unrelated image and breaks the user's
  // expectation that the uploaded file is the base canvas.
  if (!hasReferenceImages || opts.allowTextOnlyFallback) {
    const rPoll = await callPollinations(normalizedOpts);
    if (rPoll.url) {
      console.warn("ℹ️ Usando Pollinations (gratuito) como fallback:", errs.join(" | "));
      return { url: rPoll.url, provider: "pollinations-free" };
    }
    errs.push(rPoll.error || "Pollinations falhou");
  } else {
    errs.push("Fallback Pollinations ignorado porque não preserva imagem de referência");
  }

  const localFallback = buildLocalFusionFallback(normalizedOpts);
  if (localFallback) {
    console.warn("⚠️ Todos os provedores falharam; usando composição local:", errs.join(" | "));
    return { url: localFallback, provider: "local-fallback" };
  }
  return { url: null, provider: "none", error: errs.filter(Boolean).join(" | ") || "Sem provedor disponível" };
}

export function stripDataUrl(url: string): string {
  const m = url.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return m ? m[1] : url;
}
