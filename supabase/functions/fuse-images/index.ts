import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateWithNanoBanana, stripDataUrl } from '../_shared/nano-banana.ts';
import { chatCompletion } from '../_shared/llm.ts';
import { requireUser } from "../_shared/auth.ts";

const REALISM =
  "ultra realistic photography, 50mm lens, shallow depth of field, natural skin texture, " +
  "real imperfections, aligned eyes, realistic pupils, natural mouth and nose, cinematic lighting, high dynamic range, 4k, sharp focus";

const OUTPUT_QUALITY_LOCK =
  "OUTPUT QUALITY LOCK: generate a clean high-resolution final image with crisp details, sharp edges, legible typography, no compression artifacts, no pixelation, no low-res blur, no upscaling noise. Preserve the requested social-media aspect ratio and safe framing.";

const NEGATIVE =
  "blurry, distorted face, warped face, melted face, asymmetrical eyes, duplicated eyes, distorted pupils, bad teeth, different person, new person, face swap, restyled face, beautified, airbrushed, younger, older, slimmer, heavier, different hair, recolored hair, cartoon, illustration, fake skin, plastic skin, over-smooth, " +
  "extra fingers, mutated, unrealistic proportions, collage, split screen, side-by-side, " +
  "picture-in-picture, frames, borders, text, watermarks, logos";

const FACE_LOCK =
  "FACE LOCK (1:1 identity copy): the face, head shape, hairline, hair color and texture, skin tone, freckles, marks, eye color and spacing, eyebrows, nose, lips, teeth, jawline, ears, neck and expression MUST be a pixel-faithful copy of IMAGE 1. Treat IMAGE 1 as a reference photograph of a real specific person — do NOT generate a similar-looking person, copy the SAME person. Do not beautify, redraw, smooth, stretch, warp, replace, age, de-age or stylize the face. Copy clothing, accessories and body proportions exactly from IMAGE 1.";

const DETAIL_TRANSFER_LOCK =
  "DETAIL TRANSFER LOCK: IMAGE 1 is the ORIGINAL CREATIVE and must remain the base canvas. Preserve IMAGE 1 composition, crop, layout, text, background, lighting, pose, body, hair, clothing and especially every face/identity exactly 1:1. IMAGE 2 is ONLY a reference source for the specific non-facial detail(s) requested by the user (accessory, object, texture, color, prop, logo, material, small style element). Copy ONLY those requested details from IMAGE 2 onto IMAGE 1. Do NOT replace the whole creative, do NOT copy IMAGE 2's face/person/body/background, do NOT blend identities, do NOT modify the original face. If adding or removing accessories, they must sit above the face as removable layers; the original face underneath remains unchanged and returns exactly when the accessory is removed.";

const PERSON_REPLACE_LOCK =
  "PERSON / PHOTO REPLACEMENT LOCK: IMAGE 1 is the ORIGINAL CREATIVE / DESIGN BASE and remains the final canvas. Preserve IMAGE 1 layout, crop, text, typography, colors, graphics, background, composition, camera angle and all non-requested elements exactly. IMAGE 2 is the REPLACEMENT PERSON / SUBJECT. Replace the entire requested person/photo/portrait/man/woman/model area in IMAGE 1 with the person from IMAGE 2. The replaced area must clearly show IMAGE 2's identity/face/head/body/clothing when visible. Remove the old IMAGE 1 person from that area completely. Do NOT keep the old face/body, do NOT average faces, do NOT create a similar new person, do NOT treat this as detail transfer, do NOT change unrelated faces or design elements.";

const TEMPLATE_SYSTEM =
  "You are a photorealistic image generator prompt engineer that must STRICTLY preserve the original visual identity of the two reference images. " +
  "You will receive TWO reference images: IMAGE 1 = the PERSON (subject), IMAGE 2 = the ENVIRONMENT (scene). " +
  "Produce ONE single-line English prompt that recreates a scene combining elements from them with MAXIMUM fidelity. " +
  "Fill EVERY field of the template below with what is actually observable — never leave brackets, never invent traits. " +
  "Output ONLY the filled prompt as a single line (no markdown, no headings, no explanations).\n\n" +
  "TEMPLATE:\n" +
  "SUBJECT (IMAGE 1 - PERSON): gender, age, skin tone, face shape, eye color and shape, eyebrows, nose, lips, hair (color/texture/style), expression, body type, posture. " +
  `CRITICAL: ${FACE_LOCK} ` +
  "CLOTHING & STYLE: colors, fabric, fit, accessories. " +
  "SCENE (IMAGE 2 - ENVIRONMENT): location, lighting, time of day, objects, background elements, mood. " +
  "CAMERA & PHOTO STYLE: " + REALISM + ". " +
  "RULES: do NOT change facial features, do NOT invent new elements, do NOT cartoonize or stylize, keep proportions realistic, preserve identity exactly, keep face natural and undistorted. " +
  "End the prompt with: 'Negative: " + NEGATIVE + "'.";

async function elaborateFusionPrompt(userPrompt: string): Promise<string> {
  const userTheme = (userPrompt || "").trim();
  try {
    const r = await chatCompletion({
      temperature: 0.3,
      messages: [
        { role: "system", content: TEMPLATE_SYSTEM },
        {
          role: "user",
          content:
            `USER DIRECTION (respect exactly, never override identity preservation):\n"""${userTheme || "Place the person from image 1 naturally inside the environment from image 2."}"""`,
        },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 20) return txt;
    }
  } catch (_e) { /* fallback below */ }

  return `Place the person from IMAGE 1 (preserve exact identity, face, skin, hair, clothing, accessories) inside the environment from IMAGE 2 (preserve its lighting, palette, time of day, mood). ${FACE_LOCK} Single seamless photorealistic composition, match perspective and shadows, no collage, no split-screen. ${userTheme ? `User direction: ${userTheme}.` : ""} ${REALISM}. Negative: ${NEGATIVE}`;
}

const DETAIL_TRANSFER_SYSTEM =
  "You are a photorealistic image EDITOR for two-reference edits. You receive TWO images: IMAGE 1 = ORIGINAL CREATIVE / BASE CANVAS, IMAGE 2 = DETAIL REFERENCE ONLY. " +
  "Produce ONE single-line English prompt that edits IMAGE 1 while keeping it as the final base. " +
  `CRITICAL: ${DETAIL_TRANSFER_LOCK} ` +
  "Apply the user's instruction literally: transfer only the named detail(s) from IMAGE 2 into IMAGE 1. If the instruction is vague, preserve IMAGE 1 and copy only small non-facial style/accessory details from IMAGE 2, never the face or full person. " +
  "Preserve all faces from IMAGE 1 pixel-faithfully. Do NOT use IMAGE 2 as a new scene unless the user explicitly asks to change the background; even then keep IMAGE 1's people/faces/pose exactly. " +
  "Output ONLY the filled prompt as a single line. End with: 'Negative: face from IMAGE 2, copied identity from IMAGE 2, changed face, altered face, replaced person, mixed identity, new creative, different layout, different crop, different pose, different background unless requested, accessory fused into skin, accessory imprint on face, " + NEGATIVE + "'.";

async function elaborateDetailTransferPrompt(userPrompt: string): Promise<string> {
  const userTheme = (userPrompt || "").trim() || "Use IMAGE 2 only as a detail reference and apply the relevant small details to IMAGE 1 while preserving IMAGE 1 exactly.";
  try {
    const r = await chatCompletion({
      temperature: 0.2,
      messages: [
        { role: "system", content: DETAIL_TRANSFER_SYSTEM },
        { role: "user", content: `USER TWO-IMAGE EDIT INSTRUCTION (IMAGE 1 stays original/base; IMAGE 2 supplies only requested details):\n"""${userTheme}"""` },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 20) return txt;
    }
  } catch (_e) { /* fallback */ }
  return `Use IMAGE 1 as the exact original creative/base canvas. Preserve IMAGE 1 composition, layout, crop, text, background, lighting, pose, body, hair, clothing and every face/identity 1:1. Use IMAGE 2 ONLY as a detail reference and transfer ONLY this requested detail from IMAGE 2: ${userTheme}. Do not copy IMAGE 2's face/person/body/pose/background. Keep the original face from IMAGE 1 unchanged; accessories must sit on top as removable layers without altering the underlying face. ${DETAIL_TRANSFER_LOCK} ${REALISM}. Negative: face from IMAGE 2, copied identity from IMAGE 2, changed face, altered face, replaced person, mixed identity, new creative, different layout, different crop, accessory fused into skin, ${NEGATIVE}`;
}

const PERSON_REPLACE_SYSTEM =
  "You are a photorealistic image EDITOR specialized in replacing the person/photo inside an existing creative design. You receive TWO images: IMAGE 1 = ORIGINAL CREATIVE / DESIGN BASE, IMAGE 2 = REPLACEMENT PERSON / SUBJECT. " +
  `CRITICAL: ${PERSON_REPLACE_LOCK} ` +
  "Produce ONE single-line English prompt that keeps IMAGE 1 as the final design but swaps the requested person/photo area to IMAGE 2's person. If the user says 'homem', 'mulher', 'pessoa', 'foto', 'modelo', 'retrato', or asks to change one person to another, treat it as a full person/portrait replacement, not as detail transfer. " +
  "Blend naturally with IMAGE 1 lighting and crop while preserving IMAGE 1 text/layout. Output ONLY the prompt as a single line. End with: 'Negative: old person from IMAGE 1 still visible, unchanged person, face not matching IMAGE 2, mixed identity, averaged face, different layout, changed text, changed background unless required by the photo slot, collage, split screen, " + NEGATIVE + "'.";

async function elaboratePersonReplacePrompt(userPrompt: string): Promise<string> {
  const userTheme = (userPrompt || '').trim() || 'Replace the person/photo in IMAGE 1 with the person from IMAGE 2 while preserving the creative design.';
  return [
    'STRICT PERSON / PHOTO REPLACEMENT EDIT. Do not create a new creative and do not transfer only small details.',
    'REFERENCE ORDER IS MANDATORY: IMAGE 1 = ORIGINAL CREATIVE / DESIGN BASE / FINAL CANVAS. IMAGE 2 = REPLACEMENT PERSON / SUBJECT.',
    'Use IMAGE 1 as the exact base canvas. Preserve its layout, crop, text, typography, colors, graphics, background, composition, product areas, camera angle, frames and masks exactly.',
    'Find the person/photo/portrait/man/woman/model area in IMAGE 1 requested by the user. Remove that original IMAGE 1 person from that area completely.',
    "Insert or repaint the person from IMAGE 2 into the same area/slot. The final visible person MUST be recognized as IMAGE 2: same face identity, head shape, eyes, eyebrows, nose, mouth, jawline, skin tone, hair, body proportions, expression and visible clothing.",
    "If the user says 'trocar de pessoa', 'trocar o homem', 'mudar a foto do homem', 'outro homem', 'outra pessoa', 'replace/swap/change person/man/photo', treat it as FULL person/photo replacement, not detail transfer.",
    'Blend naturally into IMAGE 1 lighting, perspective, mask/frame and crop while keeping all unrelated IMAGE 1 elements unchanged. Do not alter other people/faces in IMAGE 1.',
    `USER INSTRUCTION: ${userTheme}.`,
    PERSON_REPLACE_LOCK,
    REALISM,
    `Negative: old person from IMAGE 1 still visible, unchanged person, face not matching IMAGE 2, body not matching IMAGE 2, mixed identity, averaged face, generated similar person, detail-only transfer, different layout, changed text, changed typography, changed background unless required by the photo slot, changed unrelated face, collage, split screen, ${NEGATIVE}`,
  ].join(' ');
}

const EDIT_SINGLE_SYSTEM =
  "You are a photorealistic image EDITOR (not a generator). You receive ONE reference image that is the BASE and a user instruction. " +
  "Treat the reference image as the canvas: re-render the SAME image with ONLY the user's edit applied. " +
  "Preserve composition, framing, perspective, pose, background, lighting and every other detail of the reference. " +
  "Apply the user's instruction LITERALLY and dominantly (color swap, object swap, text change, accessory change) on the requested area; if the user does not name an area, apply it to the main subject. " +
  "DO NOT generate a new scene, DO NOT change the person's identity, DO NOT recompose. " +
  "Output ONLY the filled prompt as a single line. End with: 'Negative: new scene, different composition, different framing, different background, different pose, " + NEGATIVE + "'.";

const TEMPLATE_CLONE_SYSTEM =
  "You are a graphic-design prompt engineer specialized in CLONING marketing/social-media templates. " +
  "You receive ONE reference image (a template/layout: post, flyer, story, thumbnail, ad) and a user instruction with the NEW text/content. " +
  "Produce ONE single-line English prompt that recreates the SAME visual template — preserve layout, grid, typography style, color palette, decorative shapes, frames, badges, brand area, photo placement zones, lighting and overall mood — but REPLACE the text with the user's new copy and REPLACE any photographic subject with the new subject described by the user. " +
  "Keep fonts and font weights visually equivalent to the reference. Keep alignment, hierarchy and spacing identical. Render all new text as crisp, legible, professionally typeset graphics inside the same text blocks of the original. " +
  "Output ONLY the filled prompt as a single line. End with: 'Negative: blurry text, garbled text, misspelled words, distorted letters, different layout, different color palette, different style, watermark, logo of unrelated brand, " + NEGATIVE + "'.";

const BACKGROUND_RE = /\b(fundo|cen[aá]rio|paisagem|ambiente|local|localiza[cç][aã]o|pa[ií]s|cidade|background|scene|scenery|location|country|city|behind|atras|atr[aá]s|paris|torre\s+eiffel|nova\s+york|new\s+york|times\s+square|t[oó]quio|tokyo|shibuya|rio|copacabana|londres|london|roma|rome|deserto|desert|praia|beach|montanha|mountain|floresta|forest|neve|snow)\b/i;

function isBackgroundChange(userTheme: string): boolean {
  const t = normalizeText(userTheme);
  return BACKGROUND_RE.test(t);
}

const EDIT_BACKGROUND_SYSTEM =
  "You are a photorealistic image EDITOR specialized in BACKGROUND / SCENE REPLACEMENT. You receive ONE reference image and a user instruction naming a NEW background/location. " +
  "Produce ONE single-line English prompt that KEEPS the person from the reference (face, hair, skin, clothing, pose, body proportions — 1:1 identity) but REPLACES the background/scene with the new one described by the user. " +
  "Relight the subject to match the new scene's lighting direction, temperature and shadows so it looks like a single seamless photograph. " +
  `CRITICAL: ${FACE_LOCK} ` +
  "DO NOT change the person, DO NOT swap the face, DO NOT modify clothing or pose. DO NOT keep the old background. " +
  "Output ONLY the filled prompt as a single line. End with: 'Negative: same background as reference, unchanged background, kept old scenery, different face, altered face, beautified face, different clothing, different pose, collage, split-screen, " + NEGATIVE + "'.";

async function elaborateBackgroundEditPrompt(userPrompt: string): Promise<string> {
  const userTheme = (userPrompt || "").trim();
  try {
    const r = await chatCompletion({
      temperature: 0.3,
      messages: [
        { role: "system", content: EDIT_BACKGROUND_SYSTEM },
        { role: "user", content: `USER BACKGROUND REPLACEMENT INSTRUCTION (change background/scene, keep person identity 1:1):\n"""${userTheme}"""` },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 20) return txt;
    }
  } catch (_e) { /* fallback */ }
  return `Use the reference image as the person source. Keep the exact same person (face, hair, skin, clothing, pose, body proportions — pixel-faithful identity from the reference). REPLACE the background/scene entirely with: ${userTheme}. Relight the subject to match the new scene's lighting and shadows so it looks like a single seamless photograph, not a cutout. ${FACE_LOCK} ${REALISM}. Negative: same background as reference, unchanged background, kept old scenery, different face, altered face, different clothing, different pose, collage, ${NEGATIVE}`;
}

async function elaborateEditPrompt(userPrompt: string): Promise<string> {
  const userTheme = (userPrompt || "").trim() || "Re-render the same image preserving identity.";
  if (isBackgroundChange(userTheme)) return elaborateBackgroundEditPrompt(userTheme);
  const localizedColor = buildLocalizedColorEditPrompt(userTheme);
  if (localizedColor) return localizedColor;
  try {
    const r = await chatCompletion({
      temperature: 0.2,
      messages: [
        { role: "system", content: EDIT_SINGLE_SYSTEM },
        { role: "user", content: `USER EDIT INSTRUCTION (apply LITERALLY on the reference image as the base, preserve composition and identity):\n"""${userTheme}"""` },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 20) return txt;
    }
  } catch (_e) { /* fallback */ }
  return `Use the reference image as the BASE/canvas and apply this edit LITERALLY: ${userTheme}. Preserve composition, framing, perspective, pose, background and lighting exactly. Apply the requested color/object/text change clearly and dominantly to the relevant area. Do NOT generate a new scene. ${REALISM}. Negative: new scene, different composition, different framing, different background, ${NEGATIVE}`;
}

function normalizeText(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildOutputPresetLock(outputPreset: unknown): string {
  if (!outputPreset || typeof outputPreset !== 'object') return '';
  const preset = outputPreset as { group?: unknown; name?: unknown; w?: unknown; h?: unknown };
  const w = Number(preset.w);
  const h = Number(preset.h);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 256 || h < 256) return '';
  const label = [preset.group, preset.name].filter((v) => typeof v === 'string' && v.trim()).join(' ');
  const isVerticalStory = h > w && Math.abs((w / h) - (9 / 16)) < 0.03;
  return [
    `FINAL CANVAS REQUIREMENT: compose the result for ${Math.round(w)}x${Math.round(h)} pixels${label ? ` (${label})` : ''}, aspect ratio ${w}:${h}.`,
    isVerticalStory
      ? 'Instagram Stories / Reels safe layout: vertical 9:16, main face/person and all important text must stay inside the central safe area; do not crop the head, face, hands, product, logo, or typography.'
      : 'Keep all important face, person, product, logo and typography inside the safe area for the requested format.',
    OUTPUT_QUALITY_LOCK,
  ].join(' ');
}

const COLOR_ALIASES: Array<{ re: RegExp; en: string; strong: string; avoid: string }> = [
  { re: /\b(azul|blue)\b/i, en: 'blue', strong: 'vivid bright pure blue (hex #1E73FF), clearly recognizable as blue', avoid: 'navy, dark blue, midnight blue, black, gray, teal, purple' },
  { re: /\b(vermelh[ao]|red)\b/i, en: 'red', strong: 'vivid pure red (hex #E53935)', avoid: 'orange, pink, brown, dark maroon, black' },
  { re: /\b(preto|preta|black)\b/i, en: 'black', strong: 'deep pure black (hex #0A0A0A)', avoid: 'dark gray, navy, brown' },
  { re: /\b(branco|branca|white)\b/i, en: 'white', strong: 'clean pure white (hex #FFFFFF)', avoid: 'cream, beige, gray' },
  { re: /\b(verde|green)\b/i, en: 'green', strong: 'vivid grass green (hex #2E9E44)', avoid: 'teal, olive, dark green, black' },
  { re: /\b(amarel[ao]|yellow)\b/i, en: 'yellow', strong: 'vivid bright yellow (hex #FFD500)', avoid: 'orange, mustard, gold, brown' },
  { re: /\b(rosa|pink)\b/i, en: 'pink', strong: 'vivid bright pink (hex #FF4FA3)', avoid: 'red, purple, magenta' },
  { re: /\b(roxo|roxa|purple)\b/i, en: 'purple', strong: 'vivid purple (hex #8E44AD)', avoid: 'pink, blue, black' },
  { re: /\b(laranja|orange)\b/i, en: 'orange', strong: 'vivid orange (hex #FF7A1A)', avoid: 'red, yellow, brown' },
  { re: /\b(cinza|gray|grey)\b/i, en: 'gray', strong: 'neutral medium gray (hex #808080)', avoid: 'black, white, blue' },
];

function findColor(text: string, preferAfterPara = false) {
  const haystack = preferAfterPara ? (text.match(/(?:para|por|to|into)\s+(.+)$/i)?.[1] || text) : text;
  return COLOR_ALIASES.find((c) => c.re.test(haystack));
}

function buildLocalizedColorEditPrompt(userTheme: string): string | null {
  const normalized = normalizeText(userTheme);
  const isGarment = /\b(camiseta|camisa|blusa|roupa|uniforme|terno|paleto|vestido|calca|short|jaqueta|shirt|t-?shirt|top|clothing|garment)\b/i.test(normalized);
  const asksColorChange = /\b(troc|muda|alter|change|recolor|cor|color)\b/i.test(normalized);
  if (!isGarment || !asksColorChange) return null;

  const target = findColor(normalized, true) || findColor(normalized, false);
  if (!target) return null;
  const beforeTarget = normalized.split(/\b(?:para|por|to|into)\b/i)[0] || normalized;
  const source = COLOR_ALIASES.find((c) => c.en !== target.en && c.re.test(beforeTarget));
  const sourceText = source ? ` currently ${source.en}` : '';

  return `IMAGE EDIT MODE — use the attached image as the exact base canvas. SCOPE OF EDIT IS STRICTLY THE GARMENT PIXELS ONLY. Do NOT touch, redraw, smooth, beautify, restyle, age, de-age or alter in any way the face, head, hairline, hair color/length/style, eyebrows, eyes, eye color, nose, lips, teeth, jawline, ears, skin tone, freckles, marks, expression, hands or body — these MUST be a 1:1 pixel-faithful copy of the original image (same identical person). Localized garment color replacement: identify the shirt/t-shirt/top/clothing${sourceText} and recolor ONLY that garment to ${target.strong}. The final visible garment color MUST be unmistakably ${target.en.toUpperCase()} — a viewer must instantly say "${target.en}". Do NOT use ${target.avoid}. Use a saturated, bright, daylight version of ${target.en}; avoid muddy, washed-out, or overly dark tones. Preserve the original garment fabric texture, seams, folds, wrinkles, shadows, highlights, prints/logos, shape and fit. Preserve background, lighting, camera angle, crop and perspective exactly. Do not create a new person or new scene. Photorealistic edit, natural fabric color, clean edges. User instruction: ${userTheme}. Negative: ${target.avoid}, unchanged garment color, washed-out color, desaturated color, near-black garment, near-white garment, different clothing style, different person, different face, altered face, restyled face, beautified face, smoothed skin, different hair, recolored hair, different eye color, different background, new scene, ${NEGATIVE}`;
}


async function elaborateTemplatePrompt(userPrompt: string): Promise<string> {
  const userTheme = (userPrompt || "").trim() || "Replace text and photo with the new content provided by the user.";
  try {
    const r = await chatCompletion({
      temperature: 0.3,
      messages: [
        { role: "system", content: TEMPLATE_CLONE_SYSTEM },
        { role: "user", content: `NEW CONTENT FOR THE CLONED TEMPLATE (replace text and photographic subject, KEEP layout/typography/palette identical to the reference):\n"""${userTheme}"""` },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 20) return txt;
    }
  } catch (_e) { /* fallback */ }
  return `Recreate the EXACT same template/layout/typography/color palette/decorative elements as the reference image, but replace the text blocks with: ${userTheme}. Replace any subject photo with the new subject described. Keep alignment, hierarchy, fonts, badges and brand area identical. Render new text crisp and legible. Negative: blurry text, garbled letters, different layout, different palette, ${NEGATIVE}`;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const _auth_res = await requireUser(req);
  if (_auth_res instanceof Response) return _auth_res;

  try {
    const { image1_base64, image2_base64, prompt, mode, output_preset } = await req.json();
    if (!image1_base64) {
      return new Response(JSON.stringify({ ok: false, error: 'Envie ao menos uma imagem.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedPrompt = normalizeText(String(prompt || ''));
    const garmentKeywords = /(roupa|look|outfit|camiseta|camisa|blusa|vestido|jaqueta|casaco|paleto|terno|calca|short|uniforme|figurino|shirt|t-?shirt|dress|jacket|clothing|garment|ensaio)/i;
    const transferKeywords = /(mesma|igual|ingual|transfer|vestir|veste|coloc\w+\s+a\s+roupa|use\s+the\s+clothing|wear|swap|troc\w+\s+roupa|ensaio|fotograf|photoshoot)/i;
    const sceneCloneKeywords = /(clon\w+|replic\w+|reproduz\w+|mesma\s+cena|mesmo\s+cenario|mesmo\s+fundo|copia\w*\s+(a\s+)?cena|copiar\s+(o\s+)?look|look\s+e\s+(a\s+)?cena|cena\s+e\s+(o\s+)?look|same\s+scene|clone\s+the\s+scene)/i;
    const personReplaceKeywords = /(trocar|troca|mudar|muda|alterar|altera|substituir|substitui|replace|swap|change)\s+([ao]s?\s+)?(foto\s+d[ao]|retrato\s+d[ao]|homem|homen|mulher|pessoa|modelo|personagem|sujeito|criativo\s+para\s+outr[ao]|portrait|photo|man|woman|person|model)|\b(outro\s+homem|outro\s+homen|outra\s+mulher|outra\s+pessoa|novo\s+homem|novo\s+homen|nova\s+mulher|nova\s+pessoa|trocar\s+de\s+pessoa|mudar\s+a\s+pessoa|mudar\s+de\s+pessoa|trocar\s+o\s+criativo\s+de\s+pessoa|replace\s+the\s+person|replace\s+the\s+man|swap\s+person|swap\s+the\s+person)\b/i;
    const isSceneClone = mode === 'scene-clone' || sceneCloneKeywords.test(normalizedPrompt);
    const isPersonReplace = !isSceneClone && !!image2_base64 && (mode === 'person-replace' || personReplaceKeywords.test(normalizedPrompt));
    const isDetailTransfer = !isSceneClone && !isPersonReplace && !!image2_base64 && mode === 'detail-transfer';
    const isGarmentTransfer = !isSceneClone && !!image2_base64
      && (mode === 'garment' || (garmentKeywords.test(normalizedPrompt) && transferKeywords.test(normalizedPrompt)));

    // If the user is asking for a garment color change, treat as a single-image EDIT
    // even when a second image was provided — this preserves face/hair identity 1:1.
    const localizedColor = buildLocalizedColorEditPrompt(prompt || '');
    const forceEdit = !!localizedColor && !isGarmentTransfer && !isSceneClone && !isDetailTransfer && !isPersonReplace;
    const isSingle = !isSceneClone && !isDetailTransfer && !isPersonReplace && (!image2_base64 || forceEdit) && !isGarmentTransfer;
    const isTemplate = isSingle && mode === 'template' && !forceEdit;

    let fullPrompt: string;
    const outputLock = buildOutputPresetLock(output_preset);

    if (isSceneClone) {
      const userTheme = (prompt || '').trim();
      const hasPerson = !!image2_base64;
      fullPrompt = [
        'SCENE + LOOK CLONE WITH FACE TRANSPLANT MODE (strict two-reference edit).',
        'IMAGE 1 = MASTER REFERENCE. Treat it as a pixel-faithful blueprint to reproduce.',
        'CLONE EVERYTHING from IMAGE 1: full scene, background, environment, props, lighting direction, color palette, time of day, camera angle, framing, composition, depth of field, mood; AND the complete LOOK — every garment (type, silhouette, cut, neckline, sleeves, length, fabric, texture, color hex, prints, logos, patterns, embroidery), accessories, shoes, hair style, hair color, makeup and pose.',
        hasPerson
          ? "IMAGE 2 = TARGET FACE / IDENTITY. The final person's face MUST be the person from IMAGE 2, not the face from IMAGE 1. Transplant ONLY the facial identity from IMAGE 2 onto the main person's head/body in IMAGE 1: copy IMAGE 2's face shape, eyes, eyebrows, nose, mouth, lips, teeth, cheeks, jawline, ears, skin tone, facial marks, expression and visible hairline exactly. Keep everything else from IMAGE 1 (scene, look, outfit, body, pose, camera angle, lighting and framing) identical. Do NOT average the two faces, do NOT keep IMAGE 1's face, do NOT generate a new face."
          : 'Reproduce IMAGE 1 exactly, keeping the same person and identity.',
        hasPerson
          ? 'Recognition test: a viewer must instantly recognize the SAME setting/outfit/pose/lighting from IMAGE 1 and the SAME facial identity from IMAGE 2.'
          : 'The result MUST be visually indistinguishable from IMAGE 1 in scene and look — a viewer must instantly recognize the SAME setting, SAME outfit, SAME pose, SAME lighting.',
        'OUTPUT: one seamless photorealistic photograph. No collage, no split-screen, no reference thumbnail.',
        userTheme ? `USER NOTE: ${userTheme}.` : '',
        `STYLE: ${REALISM}.`,
        `Negative: face from IMAGE 1, unchanged face, mixed identity, averaged face, new invented face, different face than IMAGE 2, different scene, different background, different location, different lighting, different outfit, different pose, redesigned garment, altered prints, altered logos, missing accessories, ${NEGATIVE}`,
      ].filter(Boolean).join(' ');
    } else if (isDetailTransfer) {
      fullPrompt = await elaborateDetailTransferPrompt(prompt);
    } else if (isPersonReplace) {
      fullPrompt = await elaboratePersonReplacePrompt(prompt);
    } else if (isGarmentTransfer) {
      const userTheme = (prompt || '').trim();
      fullPrompt = [
        'PROFESSIONAL VIRTUAL TRY-ON / GARMENT TRANSFER MODE.',
        'IMAGE 1 = GARMENT REFERENCE (the clothing item to copy). IMAGE 2 = PERSON (target model).',
        'PRIMARY TASK: produce a single photorealistic fashion photograph of the person from IMAGE 2 wearing the EXACT SAME clothing item shown in IMAGE 1.',
        'GARMENT LOCK (1:1 copy of IMAGE 1): copy the exact garment type, silhouette, cut, length, neckline, collar, sleeves, hem, buttons, zippers, pockets, seams, stitching, fabric type and texture, primary color (match hex), secondary colors, prints, graphics, logos, text, patterns, embroidery and every visible detail. The garment on the final image MUST be visually indistinguishable from the garment in IMAGE 1 — a viewer must instantly recognize it as the SAME piece of clothing, not a similar one. Do NOT re-interpret, re-style, simplify, redesign, recolor, restyle prints, remove logos, or change the neckline/sleeves/length.',
        'FIT: naturally drape the garment on the body of the person from IMAGE 2, with realistic folds, wrinkles, shadows and highlights matching the scene lighting and the pose. Adjust size so it fits the target body while preserving the garment design.',
        'IDENTITY LOCK on IMAGE 2 (pixel-faithful): preserve face, head shape, hairline, hair color/length/style, skin tone, freckles, marks, eyes, eyebrows, nose, lips, teeth, jawline, ears, hands, body proportions, pose, background, lighting, camera angle and composition of IMAGE 2 exactly. Do NOT change the person, do NOT swap the face, do NOT beautify, do NOT age or de-age.',
        'OUTPUT: one seamless photorealistic photograph, professional fashion photoshoot quality. No collage, no split-screen, no side-by-side, no reference thumbnail.',
        userTheme ? `USER NOTE: ${userTheme}.` : '',
        `STYLE: ${REALISM}.`,
        `Negative: different garment, similar-but-different garment, redesigned garment, altered garment color, altered garment print, altered logo, missing prints, missing logos, changed neckline, changed sleeves, changed length, generic clothing, plain t-shirt replacing printed shirt, different person, face swap, altered face, beautified face, ${NEGATIVE}`,
      ].filter(Boolean).join(' ');
    } else if (isTemplate) {
      fullPrompt = await elaborateTemplatePrompt(prompt);
    } else if (isSingle) {
      fullPrompt = await elaborateEditPrompt(prompt);
    } else {
      fullPrompt = await elaborateFusionPrompt(prompt);
    }

    if (outputLock) {
      fullPrompt = `${fullPrompt} ${outputLock}`;
    }

    const imageUrls = isSingle ? [image1_base64] : [image1_base64, image2_base64].filter(Boolean);
    const runMode = isSceneClone ? 'scene-clone' : (isPersonReplace ? 'person-replace' : (isDetailTransfer ? 'detail-transfer' : (isGarmentTransfer ? 'garment' : (isTemplate ? 'template' : (isSingle ? 'edit' : 'fusion')))));

    const outputPreset = output_preset && typeof output_preset === 'object'
      ? (() => {
          const raw = output_preset as { group?: unknown; name?: unknown; w?: unknown; h?: unknown };
          const w = Number(raw.w);
          const h = Number(raw.h);
          return Number.isFinite(w) && Number.isFinite(h) && w >= 256 && h >= 256
            ? { group: String(raw.group || ''), name: String(raw.name || ''), w, h }
            : null;
        })()
      : null;

    const result = await generateWithNanoBanana({ prompt: fullPrompt, imageUrls, mode: runMode, outputPreset });

    if (!result.url) {
      return new Response(JSON.stringify({ ok: false, error: result.error || 'Sem imagem gerada' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (result.provider === 'local-fallback') {
      return new Response(JSON.stringify({
        ok: false,
        error: 'A IA de imagem está sem créditos/cota em todos os provedores configurados (Lovable, Gemini, OpenAI, Emergent/Ollama). Não é possível preservar/substituir rosto com uma colagem local — recarregue créditos ou configure uma chave com cota disponível e tente novamente.',
        provider: result.provider,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Salva no Supabase Storage + tabela generated_images ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const sb = createClient(supabaseUrl, supabaseKey);
    const userId = _auth_res.userId;
    let storageUrl = result.url;

    try {
      let imageBytes: Uint8Array;
      let rawB64 = stripDataUrl(result.url);
      const isBase64 = rawB64 !== result.url;
      if (isBase64 || result.url.startsWith('data:')) {
        const b64 = rawB64.replace(/\s/g, '');
        imageBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } else {
        const resp = await fetch(result.url);
        const buf = await resp.arrayBuffer();
        imageBytes = new Uint8Array(buf);
      }
      const path = `${userId}/fusion-${Date.now()}.png`;
      const { error: upErr } = await sb.storage
        .from('creative-assets')
        .upload(path, imageBytes, { contentType: 'image/png', upsert: true });
      if (!upErr) {
        const { data: signed } = await sb.storage
          .from('creative-assets')
          .createSignedUrl(path, 60 * 60 * 24 * 30);
        if (signed?.signedUrl) storageUrl = signed.signedUrl;
        await sb.from('generated_images').insert({
          user_id: userId,
          storage_path: path,
          prompt: prompt || null,
          kind: 'fusion',
          paid: false,
        }).maybeSingle();
      }
    } catch (e) {
      console.warn('fuse-images: storage upload failed', e);
    }

    return new Response(JSON.stringify({ ok: true, image: storageUrl, provider: result.provider, prompt_used: fullPrompt, mode: runMode }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

