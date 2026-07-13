// Shared helper: call Gemini Nano Banana (image generation/editing)
// Fallback order: Lovable AI Gateway → Google Gemini (direct) → Emergent universal LLM.
// Returns a data URL (e.g. "data:image/png;base64,...") or null on failure.

type Content =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface NanoBananaOptions {
  prompt: string;
  imageUrls?: string[]; // data URLs or http(s) URLs
  mode?: "edit" | "fusion" | "template" | "generate" | "scene-clone" | "garment" | "detail-transfer" | "person-replace";
  allowTextOnlyFallback?: boolean; // Pollinations cannot read image references; keep false for edit/template flows.
  preferProvider?: "auto" | "pollinations" | "emergent";
  outputPreset?: { group?: string; name?: string; w: number; h: number } | null;
}

const FACE_PRESERVATION_LOCK =
  "ABSOLUTE FACE LOCK (HIGHEST PRIORITY): the face of every person in the reference image is IMMUTABLE and MUST be reproduced pixel-faithful to the original. Preserve exactly — with zero drift — the identity, bone structure, facial geometry, eye shape/color/spacing, pupils, eyebrows shape and position, nose bridge/tip/nostrils, mouth shape, lip thickness and color, teeth, jawline, chin, cheekbones, ear shape, forehead, hairline, natural skin tone, freckles, moles, scars, wrinkles and micro-texture. Do NOT redraw, beautify, smooth, slim, widen, age, de-age, stylize, symmetrize, swap, blend, average, or reinterpret the face. If unsure, copy the original face 1:1. The generated face MUST pass a face-recognition match against the original photo. Head pose and expression stay the same unless explicitly asked.";

const HYPERREAL_LOCK =
  "Hyperrealistic scene lock: render as an unretouched professional DSLR photograph (Canon EOS R5, 50mm f/1.8 prime lens, ISO 200, natural daylight or soft key light). Real human skin with visible pores, fine hair, micro imperfections, natural subsurface scattering, realistic specular highlights in the eyes, individual eyelashes, asymmetric natural features. Physically-based lighting with correct global illumination, contact shadows, ambient occlusion, realistic reflections and refractions. True-to-life color science, natural white balance, subtle film grain, cinematic depth of field, 8k photographic detail. Materials look real (fabric weave visible, metal has micro-scratches, glass has real refraction, hair has individual strands). Absolutely NOT illustration, NOT 3D render, NOT CGI, NOT painting, NOT digital art, NOT anime, NOT cartoon, NOT stylized, NOT airbrushed, NOT plastic skin, NOT waxy skin, NOT doll-like, NOT AI-look.";

const REAL_SCALE_LOCK =
  "Real-world scale and proportions lock: render every person and object at true anatomical proportions matching a real photograph. Human head-to-body ratio approximately 1:7.5, adult height ~1.70m used as the scale reference for the whole scene. Background people MUST be smaller than foreground people in strict linear perspective (correct depth diminution: figures further from the camera appear proportionally smaller according to distance, never the same size as foreground subjects, never giant, never doll-sized). Consistent single vanishing point, consistent eye-line across figures standing on the same ground plane, feet actually touching the ground, natural cast shadows anchoring each subject to the floor. Objects (cars, doors, chairs, phones, cups) sized correctly relative to nearby humans. No floating figures, no oversized heads, no shrunken bodies, no mismatched scales, no cut-out/collage look, no duplicate limbs, no giants in the crowd.";

const ACCESSORY_LOCK =
  "Accessory rule: accessories (glasses, hats, earrings, necklaces, masks, scarves, jewelry, headphones, etc.) are the ONLY things that may be added, changed or removed. They sit ON TOP of the face as separate surface layers — they NEVER modify the underlying face. When an accessory is added, the face geometry underneath stays 100% identical to the original. When an accessory is removed, the face returns EXACTLY to the original (same skin, same eyes, same shape) — do not invent new features to fill the removed area, reveal the original face beneath it. Do not alter hair, skin tone, or face proportions to 'fit' the accessory.";

const SCENE_REALISM_LOCK =
  "Scene realism lock: build a plausible real-world environment with real materials, correct perspective, believable props, natural crowd behavior, and coherent lighting between subject and background (the light on the person MUST match the light of the scene — same direction, same color temperature, same intensity, same shadow softness). No floating subjects, no mismatched color grading, no obvious composite/cutout edges, no halos around the person, no repeated background elements, no impossible geometry.";

const SCENE_CLONE_FACE_SWAP_LOCK =
  "Scene clone face-transplant lock: REFERENCE ORDER IS MANDATORY. IMAGE 1 is ONLY the master scene/look blueprint: copy its background, location, lighting, camera angle, crop, pose, body placement, outfit, accessories and overall composition. IMAGE 2 is ONLY the target facial identity. The final main person's face/head identity MUST be recognized as the person from IMAGE 2, not the person from IMAGE 1. Replace the visible face from IMAGE 1 with IMAGE 2's facial identity: eyes, eyebrows, nose, mouth, lips, jawline, cheeks, skin tone, facial marks, expression, head shape and visible hairline. Do NOT keep, average, blend, beautify, redraw or reinterpret the face from IMAGE 1. Recognition test: scene/outfit/pose must read as IMAGE 1; face/identity must read as IMAGE 2.";

const GARMENT_TRANSFER_LOCK =
  "Virtual try-on reference lock: IMAGE 1 supplies the clothing only; IMAGE 2 supplies the person identity. Preserve the face/body/background of IMAGE 2 while copying the garment from IMAGE 1 exactly.";

const DETAIL_TRANSFER_LOCK =
  "Detail-transfer edit lock: IMAGE 1 is the ORIGINAL CREATIVE and the exact base canvas. Preserve IMAGE 1's composition, layout, crop, camera angle, background, text, subject, clothing, body, pose, hair, and especially every face/identity 1:1. IMAGE 2 is ONLY a secondary visual reference for the specific detail(s) requested by the user (for example an accessory, texture, color, small object, logo, prop, or style detail). Transfer ONLY those requested non-facial details from IMAGE 2 onto IMAGE 1. Do NOT replace the whole creative, do NOT copy IMAGE 2's face/person/body/pose/background unless the user explicitly asks for that non-facial area, do NOT average or blend identities. If the requested detail is an accessory on a face, place it as a removable surface layer while keeping the original IMAGE 1 face underneath unchanged.";

const PERSON_REPLACE_LOCK =
  "Person/photo replacement lock: IMAGE 1 is the ORIGINAL CREATIVE / design base and final canvas. Preserve IMAGE 1's full layout, composition, crop, text, typography, colors, background, graphic elements, camera perspective, product/object placement and overall creative design. IMAGE 2 is ONLY the replacement person/subject identity. Replace the entire requested person/photo/portrait/man/woman/model area in IMAGE 1 with the person from IMAGE 2. The final replaced person MUST be recognized as IMAGE 2: preserve IMAGE 2's face, identity, skin tone, hair, head shape, body proportions, clothing if visible and natural expression. Remove the old IMAGE 1 person/face/body from that area completely. Do NOT keep the old person, do NOT average/blend identities, do NOT create a similar new person, do NOT treat this as detail transfer. Do NOT alter unrelated faces in IMAGE 1, do NOT change text/layout/background unless required to blend the replacement naturally. Make it one seamless photorealistic edit, not a collage.";

function userExplicitlyRequestsFaceChange(prompt: string): boolean {
  const p = (prompt || "").toLowerCase();
  return /(trocar|troca|mudar|muda|alterar|altera|modificar|modifica|substituir|substitui|refazer|refaz|redesenhar|redesenha|editar|edita)\s+([oa]s?\s+)?(rosto|face|cara|olhos?|nariz|boca|l[aá]bios?|queixo|mand[ií]bula|sobrancelhas?|pele|feature|identidade|homem|homen|mulher|pessoa|modelo|personagem|retrato|foto)|face\s*swap|trocar\s+de\s+pessoa|nova\s+pessoa|mudar\s+a\s+identidade|change\s+(the\s+)?face|swap\s+face|replace\s+(the\s+)?(person|man|woman|model|portrait|photo)/i.test(p);
}

function withFacePreservation(prompt: string, mode?: NanoBananaOptions["mode"]) {
  const userWantsFaceEdit = userExplicitlyRequestsFaceChange(prompt);
  const modeLock = mode === "scene-clone"
    ? SCENE_CLONE_FACE_SWAP_LOCK
    : (mode === "garment"
      ? GARMENT_TRANSFER_LOCK
      : (mode === "person-replace"
        ? PERSON_REPLACE_LOCK
        : (mode === "detail-transfer"
          ? DETAIL_TRANSFER_LOCK
          : (userWantsFaceEdit ? "" : FACE_PRESERVATION_LOCK))));
  const identityNegative = mode === "scene-clone"
    ? "face from IMAGE 1, unchanged original face, mixed identity, averaged face, new invented face, face not matching IMAGE 2,"
    : (mode === "person-replace"
      ? "old person from IMAGE 1 kept in the replaced area, face not matching IMAGE 2, mixed identity, averaged identity, duplicate person, collage person,"
      : (mode === "detail-transfer"
        ? "face from IMAGE 2, copied identity from IMAGE 2, replaced face, mixed identity, averaged identity, changed IMAGE 1 face, modified original creative face,"
        : (userWantsFaceEdit
          ? ""
          : "changed identity, different person, modified face, redrawn face, beautified face, smoothed face, slimmed face, altered eye shape, altered nose, altered mouth, altered jawline, symmetrized face, aged face, de-aged face, face-lift, plastic surgery look,")));
  const explicitFaceNote = userWantsFaceEdit
    ? "\nUser explicitly requested a face/identity change — apply ONLY the face change the user described; keep every other element (scene, pose, outfit, background, lighting) untouched."
    : "";
  return `${prompt}${explicitFaceNote}\n\n${HYPERREAL_LOCK}\n${SCENE_REALISM_LOCK}\n${REAL_SCALE_LOCK}\n${modeLock}\n${ACCESSORY_LOCK}\nNegative: illustration, painting, 3d render, cgi, cartoon, anime, stylized, digital art, airbrushed, plastic skin, waxy skin, doll-like, uncanny, distorted face, warped face, melted face, asymmetrical eyes, duplicated eyes, distorted pupils, fake teeth, over-smoothed skin, ${identityNegative} accessory fused into skin, accessory imprint left on face after removal, invented features under removed accessory, deformed hands, extra fingers, wrong proportions, wrong scale, background people same size as foreground, giant background figures, tiny foreground figures, floating figures, oversized head, tiny head, mismatched perspective, inconsistent eye level, mismatched lighting between subject and background, cutout halo, composite edge, blurry, low quality, watermark.`;
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
  return null;
}

function referenceLabel(mode: NanoBananaOptions["mode"] | undefined, index: number) {
  if (mode === "scene-clone") {
    return index === 0
      ? "REFERENCE IMAGE 1: master scene/look/body/pose/camera blueprint."
      : "REFERENCE IMAGE 2: target facial identity to transplant onto the person in IMAGE 1.";
  }
  if (mode === "garment") {
    return index === 0
      ? "REFERENCE IMAGE 1: exact garment/clothing reference."
      : "REFERENCE IMAGE 2: target person/model whose identity must be preserved.";
  }
  if (mode === "detail-transfer") {
    return index === 0
      ? "REFERENCE IMAGE 1: ORIGINAL CREATIVE / base canvas. Preserve this image 1:1 except the requested detail edit."
      : "REFERENCE IMAGE 2: secondary detail reference only. Copy only the user-requested non-facial detail(s), never the face/identity/person.";
  }
  if (mode === "person-replace") {
    return index === 0
      ? "REFERENCE IMAGE 1: ORIGINAL CREATIVE / design base. Preserve layout, text, background and composition. Replace only the requested person/photo area."
      : "REFERENCE IMAGE 2: replacement person/subject identity. The replaced person in IMAGE 1 must become this person.";
  }
  return `REFERENCE IMAGE ${index + 1}`;
}

function buildContent({ prompt, imageUrls, mode }: NanoBananaOptions): Content[] {
  const parts: Content[] = [{ type: "text", text: prompt }];
  const images = imageUrls || [];
  for (let i = 0; i < images.length; i += 1) {
    parts.push({ type: "text", text: referenceLabel(mode, i) });
    parts.push({ type: "image_url", image_url: { url: images[i] } });
  }
  return parts;
}

function outputAspect(opts: NanoBananaOptions): { w: number; h: number } | null {
  const preset = opts.outputPreset;
  if (!preset) return null;
  const w = Number(preset.w);
  const h = Number(preset.h);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 256 || h < 256) return null;
  return { w, h };
}

function openAiImageSize(opts: NanoBananaOptions): "1024x1024" | "1024x1536" | "1536x1024" {
  const aspect = outputAspect(opts);
  if (!aspect) return "1024x1024";
  if (aspect.h / aspect.w >= 1.2) return "1024x1536";
  if (aspect.w / aspect.h >= 1.2) return "1536x1024";
  return "1024x1024";
}

function pollinationsSize(opts: NanoBananaOptions): { width: number; height: number } {
  const aspect = outputAspect(opts);
  if (!aspect) return { width: 1280, height: 1280 };
  if (aspect.h / aspect.w >= 1.2) return { width: 1080, height: 1920 };
  if (aspect.w / aspect.h >= 1.2) return { width: 1600, height: 900 };
  return { width: 1280, height: 1280 };
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
  const safeOpts = { ...opts, prompt: withFacePreservation(opts.prompt, opts.mode) };
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
  const parts: any[] = [{ text: withFacePreservation(opts.prompt, opts.mode) }];
  for (let i = 0; i < (opts.imageUrls || []).length; i += 1) {
    const u = opts.imageUrls?.[i] || "";
    parts.push({ text: referenceLabel(opts.mode, i) });
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

async function callOpenAIImages(opts: NanoBananaOptions): Promise<{ url: string | null; error?: string }> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return { url: null, error: "OPENAI_API_KEY ausente" };

  const prompt = withFacePreservation(opts.prompt, opts.mode);
  const imageUrls = (opts.imageUrls || []).filter(Boolean);
  try {
    if (imageUrls.length > 0) {
      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("prompt", prompt);
      form.append("size", openAiImageSize(opts));
      form.append("quality", "high");
      for (const u of imageUrls.slice(0, 4)) {
        const converted = dataUrlToBlob(u);
        if (!converted) continue;
        form.append(imageUrls.length > 1 ? "image[]" : "image", converted.blob, converted.filename);
      }
      if (!form.has("image") && !form.has("image[]")) return { url: null, error: "OpenAI: imagem de referência inválida" };

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
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: openAiImageSize(opts), quality: "high", n: 1 }),
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
    : (opts.mode === "scene-clone"
      ? "STRICT TWO-IMAGE EDIT MODE: use IMAGE 1 as the base scene/look/body and replace the visible facial identity with IMAGE 2. Do not ignore IMAGE 2.\n\n"
      : (opts.mode === "person-replace"
        ? "STRICT PERSON REPLACEMENT MODE: IMAGE 1 is the original creative/design and final base canvas. IMAGE 2 is the replacement person. Replace the requested person/photo area in IMAGE 1 with IMAGE 2's person/face/body; remove the old IMAGE 1 person from that area; preserve IMAGE 1 text/layout/background and all unrelated faces. Do not treat this as detail transfer.\n\n"
        : (opts.mode === "detail-transfer"
          ? "STRICT DETAIL TRANSFER MODE: IMAGE 1 is the original creative and final base canvas. IMAGE 2 is only a detail reference. Transfer only requested non-facial details from IMAGE 2; never copy IMAGE 2 face/person/body/background. Keep every IMAGE 1 face and identity pixel-faithful.\n\n"
          : "")));
  const safeOpts = { ...opts, prompt: editPrefix + withFacePreservation(opts.prompt, opts.mode) };
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
      const url = extractImageFromMessage(data?.choices?.[0]?.message);
      if (url) return { url };
      lastError = `Emergent[${model}] sem imagem`;
    } catch (e) {
      lastError = `Emergent[${model}] erro: ${(e as Error)?.message || e}`;
    }
  }

  try {
    if (imageUrls.length > 0) {
      const files = imageUrls.slice(0, 4).map((u) => dataUrlToBytes(u)).filter(Boolean) as Array<{ bytes: Uint8Array; mime: string; filename: string }>;
      if (files.length) {
        const multipart = buildMultipartBody(
          { model: "gpt-image-1", prompt: safeOpts.prompt, size: openAiImageSize(safeOpts) },
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
        body: JSON.stringify({ model: "gpt-image-1", prompt: safeOpts.prompt, size: openAiImageSize(safeOpts), n: 1 }),
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
    const prompt = withFacePreservation(opts.prompt, opts.mode).slice(0, 1800);
    const seed = Math.floor(Math.random() * 1e9);
    const size = pollinationsSize(opts);
    // Try highest quality models first (flux-pro, flux-realism), fall back to flux.
    const candidates = ["flux-pro", "flux-realism", "flux"];
    let resp: Response | null = null;
    for (const model of candidates) {
      const u =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
        `?width=${size.width}&height=${size.height}&nologo=true&enhance=true&model=${model}&seed=${seed}`;
      const r = await fetch(u);
      if (r.ok) { resp = r; break; }
    }
    if (!resp) return { url: null, error: `Pollinations indisponível` };
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
  const hasRefs = Boolean(opts.imageUrls?.length);
  const pref = opts.preferProvider || "auto";
  const refEditModes = ["edit", "fusion", "template", "scene-clone", "garment", "detail-transfer", "person-replace"];
  let triedEmergent = false;

  // Modo Pollinations puro (gratuito, sem refinar com Emergent).
  if (pref === "pollinations" && !hasRefs) {
    const draft = await callPollinations(opts);
    if (draft.url) return { url: draft.url, provider: "pollinations" };
    return { url: null, provider: "none", error: draft.error || "Pollinations falhou" };
  }

  // ===== Fluxo padrão: Pollinations PRIMEIRO (rascunho gratuito),
  // depois Emergent para refinar/corrigir imperfeições usando o rascunho como referência.
  // Só aplica quando não há imagens de referência do usuário (geração pura).
  if (!hasRefs) {
    const draft = await callPollinations(opts);
    if (draft.url) {
      if (pref !== "pollinations" && Deno.env.get("EMERGENT_API_KEY")) {
        const refined = await callEmergent({
          ...opts,
          imageUrls: [draft.url],
          prompt: `Transform this draft into a HYPER-REALISTIC unretouched DSLR photograph. Fix all imperfections: anatomy, hands (exactly 5 fingers), eyes (natural pupils, individual eyelashes), facial symmetry, teeth, ears, skin (real pores, micro imperfections, subsurface scattering), realistic fabric textures, accurate physical lighting and shadows, true-to-life color science, film grain. Remove ANY illustration/CGI/3D/cartoon/airbrushed/plastic look. Preserve composition, framing, subject and scene. Original prompt: ${opts.prompt}`,
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



  const shouldTryEmergentFirst = Boolean(
    Deno.env.get("EMERGENT_API_KEY") &&
    hasRefs &&
    (pref === "emergent" || refEditModes.includes(String(opts.mode || "")))
  );

  if (shouldTryEmergentFirst) {
    triedEmergent = true;
    const r = await callEmergent(opts);
    if (r.url) return { url: r.url, provider: "emergent" };
    errs.push(r.error || "Emergent falhou");
    console.warn("⚠️ Emergent prioritário falhou:", r.error);
  }

  if (Deno.env.get("LOVABLE_API_KEY")) {
    const r = await callLovableGateway(opts);
    if (r.url) return { url: r.url, provider: "lovable" };
    errs.push(r.error || "Lovable falhou");
    console.warn("⚠️ Lovable falhou:", r.error);
  }

  if (Deno.env.get("GEMINI_API_KEY")) {
    const r = await callGeminiDirect(opts);
    if (r.url) return { url: r.url, provider: "gemini" };
    errs.push(r.error || "Gemini direto falhou");
    console.warn("⚠️ Gemini direto falhou:", r.error);
  }

  if (Deno.env.get("OPENAI_API_KEY")) {
    const r = await callOpenAIImages(opts);
    if (r.url) return { url: r.url, provider: "openai" };
    errs.push(r.error || "OpenAI falhou");
    console.warn("⚠️ OpenAI falhou:", r.error);
  }

  if (!triedEmergent) {
    const r3 = await callEmergent(opts);
    if (r3.url) return { url: r3.url, provider: "emergent" };
    errs.push(r3.error || "Emergent falhou");
  }

  const hasReferenceImages = Boolean(opts.imageUrls?.length);

  // Pollinations is text-only and cannot see uploaded reference images. For
  // edit/template flows, never use it unless the caller explicitly allows a
  // new image, otherwise it creates an unrelated image and breaks the user's
  // expectation that the uploaded file is the base canvas.
  if (!hasReferenceImages || opts.allowTextOnlyFallback) {
    const rPoll = await callPollinations(opts);
    if (rPoll.url) {
      console.warn("ℹ️ Usando Pollinations (gratuito) como fallback:", errs.join(" | "));
      return { url: rPoll.url, provider: "pollinations-free" };
    }
    errs.push(rPoll.error || "Pollinations falhou");
  } else {
    errs.push("Fallback Pollinations ignorado porque não preserva imagem de referência");
  }

  const canUseLocalFallback = opts.mode !== "scene-clone" && opts.mode !== "garment" && opts.mode !== "template" && opts.mode !== "edit" && opts.mode !== "detail-transfer" && opts.mode !== "person-replace";
  const localFallback = canUseLocalFallback ? buildLocalFusionFallback(opts) : null;
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
