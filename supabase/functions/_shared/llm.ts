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
  "Hyper-realistic human face lock (priority #1): shot on full-frame DSLR (Canon EOS R5 / Sony A7R IV) with 85mm f/1.4 prime lens, ISO 200, photojournalistic portrait, RAW photo, unedited, ultra-detailed photoreal skin with visible pores, fine peach fuzz, subtle subsurface scattering, natural skin imperfections (faint freckles, small moles, fine lines, slight redness), realistic asymmetric eyes (left and right eye not identical) with detailed iris texture, limbal ring, catchlights in the pupils, individual eyelashes, natural eyebrow hairs with stray hairs, anatomically correct symmetric nose with realistic nostrils, natural lips with subtle moisture and visible lip lines, real teeth with slight variation in color and alignment (never perfectly white, never glowing), believable bone structure, natural facial asymmetry, soft Rembrandt or natural window lighting with realistic shadows on the face, sharp tack-focus on the closer eye, shallow depth of field, skin shows real human micro-detail. Final anatomy check: two eyes correctly placed, two ears, one nose, one mouth, normal number of teeth, normal jaw, normal forehead, no melted features, no double pupils, no extra facial parts. Negative face: plastic skin, waxy skin, airbrushed, doll face, porcelain skin, CGI face, 3D render, Unreal Engine, uncanny valley, fake skin, smooth blurred skin, perfectly symmetrical face, glowing teeth, too many teeth, missing teeth, cartoon, anime, illustration, painting, AI-generated look, deformed face, melted face, distorted pupils, cross-eyed, lazy eye (unintentional), extra eyes, fused eyes, third eye, asymmetric eyes (unnatural), warped features, double nose, double mouth, missing ear, deformed ear, mutated face, disfigured, low-res face, blurry face, oversharpened face, beauty filter, instagram filter.";


const HAND_SAFE_PROMPT =
  "Hand safety lock: unless hands are the main subject, compose as a chest-up or waist-up photograph with hands completely outside the frame or naturally hidden behind clothing, a desk, pockets, folders, books, or other objects. No visible fingers when hands are not requested. If any hand is visible, it must pass a strict anatomy check: exactly five fingers per hand (one thumb + four fingers), no extra digits, no missing digits, no fused digits, correct thumb opposition and placement, natural palm structure, correct knuckle count, realistic fingernails, natural finger spacing, proportional finger lengths, and a normal wrist connection.";

const HAND_NEGATIVE_PROMPT =
  "bad hands, malformed hands, deformed hands, mutated hands, distorted hands, broken hands, ugly hands, extra fingers, six fingers, seven fingers, four fingers, three fingers, missing fingers, fused fingers, webbed fingers, duplicated fingers, duplicate fingertips, duplicate thumbs, two thumbs, missing thumb, extra nails, missing nails, wrong thumb placement, wrong knuckle count, impossible joints, bent-backwards fingers, claw hands, rubber fingers, sausage fingers, baguette fingers, long unnatural fingers, tiny hands, oversized hands, detached hands, floating hands, hands growing from wrong place, twisted wrists, broken wrists";

const HANDS_ARE_REQUESTED = /\b(hand|hands|finger|fingers|thumb|gesture|handshake|waving|pointing|holding|grabbing|clapping|typing|writing|eating|feeding|cutting|serving|holding\s+(a\s+)?(fork|spoon|knife|plate|cake)|m[aã]o|m[aã]os|dedo|dedos|polegar|gesto|aperto de m[aã]o|acenando|apontando|segurando|digitando|escrevendo|comendo|alimentando|cortando|servindo|segurando\s+(um\s+|uma\s+)?(garfo|colher|faca|prato|bolo))\b/i;
const EATING_CAKE_RE = /\b(eating|feeding|taking\s+a\s+bite|bite|biting|comendo|alimentando|mordendo|dar\s+uma\s+mordida|cortando|servindo)\b[\s\S]{0,80}\b(cake|birthday\s+cake|bolo|bolo\s+de\s+anivers[áa]rio|slice\s+of\s+cake|fatia\s+de\s+bolo)\b|\b(cake|birthday\s+cake|bolo|bolo\s+de\s+anivers[áa]rio|slice\s+of\s+cake|fatia\s+de\s+bolo)\b[\s\S]{0,80}\b(eating|feeding|taking\s+a\s+bite|bite|biting|comendo|alimentando|mordendo|dar\s+uma\s+mordida|cortando|servindo)\b/i;

export function hasHybridRequest(prompt = "") {
  return /\bcom\s+(cara|rosto|face|olhos|boca|sorriso|express[ãa]o)\s+humana?s?\b/i.test(prompt)
    || /\b(with|having)\s+(a\s+)?human\s+(face|eyes|mouth|smile|expression)\b/i.test(prompt)
    || /\b(antropomorf|anthropomorph|surreal hybrid|h[íi]brido surreal|fruta humanizada|humanized fruit)\b/i.test(prompt);
}

const EVENT_RE_HUMAN = /\b(anivers[áa]rio|birthday|festa|party|casamento|wedding|noivado|engagement|formatura|graduation|batizado|baptism|ch[áa]\s+de\s+beb[êe]|baby\s+shower|comemora[çc][ãa]o|celebration|natal|christmas|ano\s+novo|new\s+year|carnaval|carnival|reveillon|p[áa]scoa|easter|halloween|dia\s+das\s+m[ãa]es|dia\s+dos\s+pais|confraterniza[çc][ãa]o)\b/i;

export function hasHumanSubject(prompt = "") {
  if (/\b(non-human subject lock|non-human object lock|object isolation lock|standalone non-human subject)\b/i.test(prompt)) return false;
  if (hasHybridRequest(prompt)) return true;
  if (EVENT_RE_HUMAN.test(prompt)) return true;
  return /\b(person|people|human|man|woman|child|face|portrait|lawyer|client|brazilian|homem|mulher|pessoa|pessoas|rosto|retrato|advogado|advogada|cliente|crian[cç]a|idos[ao]|jovem|senhor|senhora|m[ãa]e|pai|filh[ao]|viol[êe]ncia|agress[ãa]o|hematoma|ematoma|les[ãa]o|les[õo]es|ferid[ao]|machucad[ao]|corpo|bra[cç]o|perna|pele humana|bruise|injury|wound|assault)\b/i.test(prompt);
}

// Corrige erros comuns de digitação em PT-BR e traduz frutas/objetos para inglês
// para melhorar a fidelidade da geração de imagens (ex.: "macan" → "maçã apple fruit").
const PROMPT_TYPO_MAP: Array<[RegExp, string]> = [
  [/\bcora[cç][ãa]o\b/gi, "coração (red love heart symbol, classic stylized heart shape, romantic icon, NOT a fruit, NOT an anatomical organ unless requested)"],
  [/\bcoracoes\b|\bcora[cç][õo]es\b/gi, "corações (red love heart symbols, classic stylized heart shapes)"],
  [/\bmac[ãa]+n?s?\b/gi, "maçã (apple fruit, red apple, fresh fruit)"],
  [/\bmaca\b/gi, "maçã (apple fruit, red apple, fresh fruit)"],
  [/\bbanan[ao]s?\b/gi, "banana (ripe yellow banana fruit)"],
  [/\blaranj[ao]s?\b/gi, "laranja (orange fruit, citrus)"],
  [/\buv[ao]s?\b/gi, "uva (grapes, bunch of purple grapes)"],
  [/\bmorang[ao]s?\b/gi, "morango (strawberry fruit)"],
  [/\babacax[ií]s?\b/gi, "abacaxi (pineapple fruit)"],
  [/\bmel[ãa]+n?cias?\b/gi, "melancia (watermelon fruit)"],
  [/\bmam[ãa]+n?o?s?\b/gi, "mamão (papaya fruit)"],
  [/\bp[êe]ras?\b/gi, "pera (pear fruit)"],
  [/\bcachorr[ao]s?\b/gi, "cachorro (dog)"],
  [/\bgat[ao]s?\b/gi, "gato (cat)"],
  [/\bcarr[ao]s?\b/gi, "carro (car automobile)"],
  [/\bcas[ao]s?\b/gi, "casa (house, residential home)"],
  [/\bflor(es)?\b/gi, "flor (flower, blooming)"],
  [/\bbaguetes?\b/gi, "baguete (French baguette bread, long crusty loaf of bread, golden crust, bakery bread, NOT a fruit)"],
  [/\bp[ãa]+es?\b/gi, "pão (bread loaf, bakery bread, NOT a fruit)"],
  [/\bcroissants?\b/gi, "croissant (buttery flaky French pastry, NOT a fruit)"],
  [/\bbolos?\b/gi, "bolo (cake, frosted cake, NOT a fruit unless specified)"],
];

function normalizePromptTypos(raw: string): string {
  let out = (raw || "").trim();
  if (!out) return out;
  for (const [re, rep] of PROMPT_TYPO_MAP) out = out.replace(re, rep);
  return out;
}


function withFaceSafety(prompt: string) {
  if (!hasHumanSubject(prompt)) {
    return `${prompt}. Standalone subject lock: render strictly and only what the user described, with correct real-world structure and materials. Do not add unrelated items, do not add fruits or food unless the user explicitly asked for them, do not add people, faces, skin, arms, hands, fingers, body parts, portraits, or anthropomorphic features.`;
  }
  return `${prompt}. ${FACE_SAFE_PROMPT} ${HAND_SAFE_PROMPT} Negative hand anatomy: ${HAND_NEGATIVE_PROMPT}.`;
}

function handInstructionFor(prompt: string) {
  if (EATING_CAKE_RE.test(prompt)) {
    return "Cake-eating interaction lock: render the birthday cake eating scene like a real documentary photo, but protect anatomy by using a medium close-up or waist-up crop with wrists partly hidden by the table edge. Show cake on a plate or fork/spoon near the mouth; avoid close-up fingers. If a hand is visible, show only one natural hand holding a fork or plate with all fingers plausible, exactly five fingers, correct thumb placement, no merged fingers, no cake fused with skin, no extra hands, no duplicated hands.";
  }
  if (HANDS_ARE_REQUESTED.test(prompt)) {
    return "Visible hands were requested: render only necessary hands, fully visible where possible, photorealistic and anatomically normal. Each visible hand must have exactly five fingers: one opposable thumb and four fingers, correct thumb angle, middle finger longest, ring/index slightly shorter, pinky shortest, natural knuckles, natural creases, realistic nails, believable palm, and correct wrist connection. Perform a final finger-count anatomy check before output.";
  }
  return "Hands were not requested: use a chest-up, head-and-shoulders, above-the-wrist crop, or hide hands behind clothing, pockets, folders, desks, books, or frame edges. Do not render loose fingers, partial fingers, accidental hands, or hands at image edges.";
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
  const safePrompt = opts.prompt;
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
  const safePrompt = opts.prompt;
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
  const safePrompt = opts.prompt;
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
  const fixed = normalizePromptTypos(raw);
  const base = fixed
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);

  // Forensic/legal context: bruises, injuries, domestic violence evidence imagery.
  const isForensic = /\b(viol[êe]ncia|agress[ãa]o|agredid[ao]|hematoma|ematoma|machucad[ao]|les[ãa]o|les[õo]es|ferid[ao]|ferimento|cicatriz|soco|chute|tapa|espancad[ao]|abuso|dom[ée]stica|bruise|bruised|injur(y|ies)|wound|assault|battered|forensic|per[íi]cia|laudo)\b/i.test(base);
  if (isForensic) {
    const FORENSIC = "realistic forensic photography for legal evidence (laudo pericial), documentary style, clinical neutral lighting, plain background, visible bruises (hematomas) with realistic purple-blue and yellow-green discoloration, swelling, abrasions, scratches consistent with the described injury, anatomically accurate skin, respectful framing, non-sexualized, no graphic blood spray, suitable as judicial evidence";
    const NEG = "negative: cartoon, illustration, painting, stylized, glamour, fashion editorial, gore exploitation, sexualized, deformed anatomy, extra limbs, text, watermark, logo, low quality, blurry";
    return `${base}. ${FORENSIC}. ${NEG}`;
  }



  // Non-human subjects (fruit, objects, scenery): keep prompt faithful, no portrait lock.
  if (!hasHumanSubject(base)) {
    const isFruit = /\b(fruit|apple|maçã|maca|banana|laranja|orange|uva|grape|morango|strawberry|abacaxi|pineapple|melancia|watermelon|mam[ãa]o|papaya|pera|pear|manga|mango|lim[ãa]o|lemon|p[êe]ssego|peach|cereja|cherry|kiwi)\b/i.test(base);
    const isLandmark = /\b(torre\s+eiffel|eiffel\s+tower|cristo\s+redentor|estatua\s+da\s+liberdade|statue\s+of\s+liberty|big\s+ben|coliseu|colosseum|taj\s+mahal|pir[âa]mide|pyramid|monumento|monument|cathedral|catedral|igreja|church|castelo|castle|ponte|bridge|arranha-c[ée]u|skyscraper|edif[íi]cio|building|pr[ée]dio|arquitetura|architecture|landmark|skyline|cidade|city|paisagem urbana)\b/i.test(base);
    const SUBJECT_WORD = isFruit ? "fruit" : (isLandmark ? "landmark/architectural structure" : "object");
    const FRUIT_STYLE = isFruit
      ? ", whole intact fruit, perfectly ripe, smooth natural skin, anatomically correct natural shape, intact stem, no bites, no cuts, no deformation, studio product photography, soft diffused lighting, clean white background, macro detail"
      : "";
    const LANDMARK_STYLE = isLandmark
      ? ", architectural photography, accurate proportions, true-to-life structure, recognizable silhouette, real-world location, no fantasy elements, no surreal additions"
      : "";
    const OBJECT_LOCK = `SUBJECT LOCK (critical): the subject is a ${SUBJECT_WORD}. Render ONLY the requested ${SUBJECT_WORD} as described, with correct real-world structure, scale and materials. Do not add unrelated items, do not add fruits, food, people, faces, eyes, mouths, arms, hands, fingers, skin, nails, limbs or any human body part. Never fuse the subject with anatomy or with any other object category. Stay strictly faithful to the user's literal request.`;
    const STYLE = `photorealistic photography, high detail, natural lighting, sharp focus, 8k${FRUIT_STYLE}${LANDMARK_STYLE}, isolated standalone subject, clear silhouette, no human presence`;
    const extraNeg = isFruit ? "" : ", fruit, apple, banana, orange, food, produce, fruit basket, random fruit added to scene";
    const NEG = `negative: blurry, low quality, text, watermark, logo, deformed, mutated, disfigured, melted, warped, extra parts, duplicated, asymmetrical, cartoon, illustration, painting, CGI, human hands, fingers, arms, legs, body parts, skin, fingernails, face, eyes, mouth, person holding object, anthropomorphic, object with face, object with limbs, unrelated objects, unrequested items${extraNeg}`;
    return `${base}, ${STYLE}. ${OBJECT_LOCK} ${NEG}`;

  }

  const HAND_DETAIL =
    "anatomically perfect human hand with exactly five fingers per hand (one opposable thumb + four fingers), correct finger count, no extra fingers, no missing fingers, natural finger proportions, individually separated fingers, visible knuckles and natural creases, realistic fingernails, correct thumb placement and angle, natural wrist connection, realistic palm structure";
  const BODY_DETAIL =
    "anatomically correct full human body, realistic proportions (Vitruvian proportions: head ~1/7.5 of body height), natural shoulder width, correct spine curvature, two arms with correct elbow and wrist joints, two legs with correct knee and ankle joints, hands and feet at correct ends of limbs, no extra or missing limbs, no twisted or dislocated joints, natural standing/walking posture, realistic clothing draping with correct fabric folds";
  const isEatingCake = EATING_CAKE_RE.test(base);
  const isMultiPerson = /\b(people|persons|pessoas|crowd|multid[ãa]o|grupo|group|family|fam[íi]lia|couple|casal|tourists|turistas|friends|amigos)\b/i.test(base);
  const isFullBody = isMultiPerson || /\b(full body|corpo inteiro|de corpo inteiro|standing|walking|running|sentad[ao]|de p[ée]|andando|correndo|posando|posing|dan[çc]ando|dancing|jogando|playing|na frente|in front of|na torre|at the tower|no monumento|at the monument|na praia|at the beach|na rua|on the street|na cidade|in the city|landmark|eiffel|cristo redentor|coliseu|colosseum|big ben|taj mahal)\b/i.test(base);
  const subjectClause = isMultiPerson
    ? "multiple realistic human subjects, each with consistent anatomy"
    : "single real human subject";
  const compositionClause = isEatingCake
    ? "documentary birthday cake eating composition: medium close-up at dining table, faces and cake clearly visible, wrists cropped or hidden by table edge, fork/spoon and cake slice used to imply eating, no finger close-up"
    : isFullBody
    ? "wide full-body composition with environment visible, subjects positioned naturally within the scene, complete bodies (head, torso, arms, legs, hands and feet all visible and anatomically correct)"
    : "chest-up composition, hands preferably out of frame";
  const STYLE =
    `${subjectClause}, RAW photo, photorealistic, professional editorial photography, shot on Canon EOS R5 with ${isFullBody ? "35mm f/2.0" : "85mm f/1.4"} lens, ISO 200, natural light, ` +
    "real human skin with visible pores, peach fuzz, subtle imperfections, subsurface scattering, " +
    "correct facial anatomy, two natural asymmetric eyes, realistic iris and pupils with catchlights, individual eyelashes, natural eyebrows, " +
    "symmetric realistic nose, natural lips with fine lines, natural teeth with slight variation, " +
    `${compositionClause}, ` +
    (isFullBody || isEatingCake ? BODY_DETAIL + ", " : "") +
    "if hands appear they must pass strict anatomy: " +
    HAND_DETAIL + ", " +
    "cinematic natural lighting, sharp focus, 8k, unedited, no beauty filter, no AI-generated look";
  const BODY_NEG = isFullBody || isEatingCake
    ? ", deformed body, mutated body, disfigured body, distorted body, malformed body, twisted torso, broken spine, wrong proportions, extra arms, extra legs, missing arms, missing legs, extra limbs, missing limbs, fused limbs, duplicated limbs, floating limbs, detached limbs, disjointed limbs, dislocated joints, impossible pose, broken knees, broken elbows, backwards joints, limbs growing from wrong place, conjoined people, merged people, fused faces, identical clones, bad anatomy, bad proportions, gigantic head, tiny head, long neck, short neck, no neck"
    : "";
  const NEG =
    `negative: blurry, low quality, distorted face, deformed face, warped face, melted face, mutated face, disfigured, facial asymmetry caused by generation error, mismatched eyes, different sized eyes, asymmetric eyes (unnatural), cross-eyed, lazy eye, dead eyes, glassy eyes, empty stare, extra eyes, fused eyes, third eye, double pupils, wrong pupils, double nose, double mouth, bad teeth, too many teeth, glowing teeth, fake skin, plastic skin, waxy skin, porcelain skin, airbrushed, doll face, mannequin, CGI, 3D render, Unreal Engine, uncanny valley, anime, cartoon, illustration, painting, AI art, beauty filter, instagram filter, oversharpened, oversaturated, body parts fused with object, object merged with body${BODY_NEG}, ${HAND_NEGATIVE_PROMPT}, mutated hand, unrealistic, text, watermark, logo`;
  const handsClause = isEatingCake
    ? `${handInstructionFor(base)} ${HAND_DETAIL}. Keep cake, fork, plate and fingers separated with correct contact shadows; never merge cake frosting with hands, mouth, arms, or skin.`
    : isFullBody
    ? `${HAND_DETAIL}. Hands and feet must be fully formed and natural — not melted, not warped, not fused.`
    : `${handInstructionFor(base)} ${HAND_SAFE_PROMPT} ${HAND_DETAIL}.`;
  return `${base}, ${STYLE}. ${handsClause} ${NEG}`;

}



// Pollinations.ai — API pública, gratuita, sem chave, sem créditos.
async function imagePollinations(opts: ImageOptions) {
  try {
    const [w, h] = (opts.size || "1024x1024").split("x").map((n) => parseInt(n, 10) || 1024);
    const seed = Math.floor(Math.random() * 1_000_000);
    const flux = buildFluxPrompt(opts.prompt);
    const model = hasHumanSubject(opts.prompt) ? "flux-realism" : "flux";
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(flux)}?width=${w}&height=${h}&seed=${seed}&nologo=true&enhance=true&model=${model}`;
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

