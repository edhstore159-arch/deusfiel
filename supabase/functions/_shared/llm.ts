// Shared LLM helpers with fallback chain: Ollama (when configured) → Lovable → Google Gemini (direct) → Emergent.

type ChatMessage = { role: string; content: any };

export interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  response_format?: any;
  temperature?: number;
}

export interface ImageOptions {
  prompt: string;
  size?: string;
  quality?: string;
}

const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const EMERGENT_KEY = Deno.env.get("EMERGENT_API_KEY");
const OLLAMA_URL = Deno.env.get("OLLAMA_URL")?.trim().replace(/\/+$/, "").replace(/\/api\/(generate|chat|tags)$/, "");
const OLLAMA_MODEL = Deno.env.get("OLLAMA_MODEL") || "qwen3:8b";
const OLLAMA_API_KEY = Deno.env.get("OLLAMA_API_KEY");

const FACE_SAFE_PROMPT =
  "Face quality lock: natural human face, aligned eyes, normal eyelids, realistic nose and mouth, natural teeth, correct facial symmetry, relaxed expression, realistic skin texture, no warped facial features, no melted face, no duplicated eyes, no distorted pupils, no plastic smoothing.";

const HAND_SAFE_PROMPT =
  "Hand safety lock: unless hands are the main subject, compose as a chest-up or waist-up photograph with hands completely outside the frame or naturally hidden behind clothing, a desk, pockets, folders, books, or other objects. No visible fingers. If any hand is visible, it must be anatomically correct with exactly five natural fingers, correct thumb placement, natural knuckles, realistic nails, and normal wrist connection.";

const HAND_NEGATIVE_PROMPT =
  "bad hands, malformed hands, deformed hands, mutated hands, distorted hands, broken hands, ugly hands, extra fingers, missing fingers, fused fingers, webbed fingers, duplicated fingers, duplicate fingertips, extra nails, missing nails, wrong thumb placement, claw hands, rubber fingers, sausage fingers, baguette fingers, long unnatural fingers, tiny hands, oversized hands, detached hands, floating hands, hands growing from wrong place, twisted wrists, broken wrists";

function hasHumanSubject(prompt = "") {
  return /\b(person|people|human|man|woman|child|face|portrait|lawyer|client|brazilian|homem|mulher|pessoa|pessoas|rosto|retrato|advogado|advogada|cliente|criança)\b/i.test(prompt);
}

function withFaceSafety(prompt: string) {
  return hasHumanSubject(prompt) ? `${prompt}. ${FACE_SAFE_PROMPT} ${HAND_SAFE_PROMPT} Negative hand anatomy: ${HAND_NEGATIVE_PROMPT}.` : prompt;
}

// ---------- chat completions ----------

async function chatLovable(opts: ChatOptions) {
  if (!LOVABLE_KEY) return { ok: false as const, status: 0, error: "LOVABLE_API_KEY ausente" };
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
    body: JSON.stringify({ model: opts.model || "google/gemini-3-flash-preview", ...opts }),
  });
  if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
  return { ok: true as const, data: await resp.json(), provider: "lovable" };
}

function messagesToGeminiContents(messages: ChatMessage[]) {
  const system: string[] = [];
  const contents: any[] = [];
  for (const m of messages) {
    const text = typeof m.content === "string"
      ? m.content
      : Array.isArray(m.content)
        ? m.content.map((p: any) => p?.text || "").filter(Boolean).join("\n")
        : String(m.content || "");
    if (m.role === "system") { system.push(text); continue; }
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }
  return { system: system.join("\n\n"), contents };
}

async function chatGemini(opts: ChatOptions) {
  if (!GEMINI_KEY) return { ok: false as const, status: 0, error: "GEMINI_API_KEY ausente" };
  const { system, contents } = messagesToGeminiContents(opts.messages);
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const body: any = { contents };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (opts.response_format?.type === "json_object") {
    body.generationConfig = { responseMimeType: "application/json" };
  }
  if (typeof opts.temperature === "number") {
    body.generationConfig = { ...(body.generationConfig || {}), temperature: opts.temperature };
  }
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
  // Wrap into OpenAI-compatible shape so callers can read choices[0].message.content
  return {
    ok: true as const,
    provider: "gemini",
    data: { choices: [{ message: { role: "assistant", content: text } }] },
  };
}

async function chatEmergent(opts: ChatOptions) {
  if (!EMERGENT_KEY) return { ok: false as const, status: 0, error: "EMERGENT_API_KEY ausente" };
  const resp = await fetch("https://integrations.emergentagent.com/llm/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${EMERGENT_KEY}` },
    body: JSON.stringify({
      model: opts.model?.startsWith("openai/") || opts.model?.startsWith("google/")
        ? opts.model
        : "gpt-4o-mini",
      messages: opts.messages,
      ...(opts.response_format ? { response_format: opts.response_format } : {}),
      ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
    }),
  });
  if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
  return { ok: true as const, data: await resp.json(), provider: "emergent" };
}

function isUnsupportedOllamaHost(rawUrl: string) {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local");
  } catch {
    return true;
  }
}

async function chatOllama(opts: ChatOptions) {
  if (!OLLAMA_URL) return { ok: false as const, status: 0, error: "OLLAMA_URL ausente" };
  if (isUnsupportedOllamaHost(OLLAMA_URL)) {
    return { ok: false as const, status: 0, error: "OLLAMA_URL precisa ser uma URL pública acessível pelo backend" };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(OLLAMA_API_KEY ? { Authorization: `Bearer ${OLLAMA_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: opts.messages.map((message) => ({ role: message.role, content: String(message.content || "") })),
        stream: false,
        ...(opts.response_format?.type === "json_object" ? { format: "json" } : {}),
        options: { temperature: typeof opts.temperature === "number" ? opts.temperature : 0.7 },
      }),
    });
    const text = await resp.text();
    if (!resp.ok) return { ok: false as const, status: resp.status, error: text };
    const data = JSON.parse(text || "{}");
    const content = data?.message?.content || data?.response || "";
    return {
      ok: true as const,
      provider: "ollama",
      data: { choices: [{ message: { role: "assistant", content } }] },
    };
  } catch (error) {
    return { ok: false as const, status: 0, error: String(error instanceof Error ? error.message : error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function chatCompletion(opts: ChatOptions) {
  // Order: Ollama → Lovable → Gemini (direct) → Emergent
  if (OLLAMA_URL) {
    const r = await chatOllama(opts);
    if (r.ok) return r;
    console.warn("⚠️ Ollama falhou, tentando Lovable/Gemini/Emergent:", r.status, r.error?.slice?.(0, 200));
  }
  if (LOVABLE_KEY) {
    const r = await chatLovable(opts);
    if (r.ok) return r;
    console.warn("⚠️ Lovable chat falhou, tentando Gemini direto:", r.status, r.error?.slice?.(0, 200));
  }
  if (GEMINI_KEY) {
    const r = await chatGemini(opts);
    if (r.ok) return r;
    console.warn("⚠️ Gemini direto falhou, tentando Emergent:", r.status, r.error?.slice?.(0, 200));
  }
  const r3 = await chatEmergent(opts);
  if (r3.ok) return r3;
  return { ok: false as const, status: r3.status || 502, error: r3.error || "Nenhum provider disponível", provider: "none" };
}

// ---------- text-to-image ----------

async function imageLovable(opts: ImageOptions) {
  if (!LOVABLE_KEY) return { ok: false as const, error: "LOVABLE_API_KEY ausente" };
  const safePrompt = withFaceSafety(opts.prompt);
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt: safePrompt,
      quality: opts.quality || (hasHumanSubject(safePrompt) ? "high" : "low"),
      size: opts.size || "1024x1024",
      stream: false,
    }),
  });
  if (!resp.ok) return { ok: false as const, error: `Lovable ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
  const data = await resp.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return { ok: false as const, error: "Lovable não retornou imagem" };
  return { ok: true as const, b64, provider: "lovable" };
}

async function imageGemini(opts: ImageOptions) {
  if (!GEMINI_KEY) return { ok: false as const, error: "GEMINI_API_KEY ausente" };
  const model = "gemini-2.5-flash-image";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const safePrompt = withFaceSafety(opts.prompt);
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: safePrompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!resp.ok) return { ok: false as const, error: `Gemini ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
  const b64 = inline?.inlineData?.data || inline?.inline_data?.data;
  if (!b64) return { ok: false as const, error: "Gemini direto não retornou imagem" };
  return { ok: true as const, b64, provider: "gemini" };
}

async function imageEmergent(opts: ImageOptions) {
  if (!EMERGENT_KEY) return { ok: false as const, error: "EMERGENT_API_KEY ausente" };
  const safePrompt = withFaceSafety(opts.prompt);
  const resp = await fetch("https://integrations.emergentagent.com/llm/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${EMERGENT_KEY}` },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: safePrompt,
      size: opts.size || "1024x1024",
      n: 1,
    }),
  });
  if (!resp.ok) return { ok: false as const, error: `Emergent ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
  const data = await resp.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return { ok: false as const, error: "Emergent não retornou imagem" };
  return { ok: true as const, b64, provider: "emergent" };
}

// Compact Flux-friendly prompt: short, dense English, subject→look→scene→light→style + negative.
function buildFluxPrompt(raw: string): string {
  // Take first ~280 chars of user prompt, strip heavy structure markers.
  const base = raw
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
  const STYLE =
    "photorealistic, professional portrait photography, real skin texture, natural skin pores, " +
    "correct facial anatomy, symmetrical eyes, realistic pupils, natural mouth and nose, " +
    "chest-up composition, hands completely out of frame, no visible hands, no visible fingers, " +
    "cinematic lighting, shallow depth of field, sharp focus, 8k";
  const NEG =
    `negative: blurry, low quality, distorted face, deformed face, warped face, melted face, asymmetrical eyes, bad teeth, fake skin, plastic skin, ${HAND_NEGATIVE_PROMPT}, visible hands, visible fingers, unrealistic, cartoon, oversaturated, text, watermark, logo`;
  return `${base}, ${STYLE}. ${HAND_SAFE_PROMPT}. ${NEG}`;
}

// Pollinations.ai — API pública, gratuita, sem chave, sem créditos.
async function imagePollinations(opts: ImageOptions) {
  try {
    const [w, h] = (opts.size || "1024x1024").split("x").map((n) => parseInt(n, 10) || 1024);
    const seed = Math.floor(Math.random() * 1_000_000);
    const flux = buildFluxPrompt(opts.prompt);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(flux)}?width=${w}&height=${h}&seed=${seed}&nologo=true&enhance=true&model=flux`;
    const resp = await fetch(url);
    if (!resp.ok) return { ok: false as const, error: `Pollinations ${resp.status}` };
    const buf = new Uint8Array(await resp.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { ok: true as const, b64: btoa(bin), provider: "pollinations" };
  } catch (e) {
    return { ok: false as const, error: String((e as Error)?.message || e) };
  }
}

export async function generateImage(opts: ImageOptions) {
  const humanSubject = hasHumanSubject(opts.prompt);
  const faceSafeOpts = { ...opts, prompt: withFaceSafety(opts.prompt), quality: opts.quality || (humanSubject ? "high" : undefined) };
  // Para imagens com pessoas, prioriza modelos com melhor anatomia facial; Pollinations fica só como fallback.
  if (LOVABLE_KEY) {
    const r = await imageLovable(faceSafeOpts);
    if (r.ok) return r;
    console.warn("⚠️ Lovable image falhou:", r.error);
  }
  if (GEMINI_KEY) {
    const r = await imageGemini(faceSafeOpts);
    if (r.ok) return r;
    console.warn("⚠️ Gemini direto falhou:", r.error);
  }
  if (humanSubject && EMERGENT_KEY) {
    const r = await imageEmergent(faceSafeOpts);
    if (r.ok) return r;
    console.warn("⚠️ Emergent image falhou:", r.error);
  }
  const r0 = await imagePollinations(faceSafeOpts);
  if (r0.ok) return r0;
  console.warn("⚠️ Pollinations falhou:", r0.error);
  if (!humanSubject) {
    const r3 = await imageEmergent(faceSafeOpts);
    if (r3.ok) return r3;
    return { ok: false as const, error: r3.error || "Nenhum provider de imagem disponível", provider: "none" };
  }
  const r3 = await imageEmergent(faceSafeOpts);
  if (r3.ok) return r3;
  return { ok: false as const, error: r3.error || "Nenhum provider de imagem disponível", provider: "none" };
}

