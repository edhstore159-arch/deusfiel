import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { generateWithNanoBanana } from '../_shared/nano-banana.ts';
import { chatCompletion } from '../_shared/llm.ts';

const REALISM =
  "ultra realistic photography, 50mm lens, shallow depth of field, natural skin texture, " +
  "real imperfections, aligned eyes, realistic pupils, natural mouth and nose, cinematic lighting, high dynamic range, 4k, sharp focus";

const NEGATIVE =
  "blurry, distorted face, warped face, melted face, asymmetrical eyes, duplicated eyes, distorted pupils, bad teeth, different person, new person, face swap, restyled face, beautified, airbrushed, younger, older, slimmer, heavier, different hair, recolored hair, cartoon, illustration, fake skin, plastic skin, over-smooth, " +
  "extra fingers, mutated, unrealistic proportions, collage, split screen, side-by-side, " +
  "picture-in-picture, frames, borders, text, watermarks, logos";

const FACE_LOCK =
  "FACE LOCK (1:1 identity copy): the face, head shape, hairline, hair color and texture, skin tone, freckles, marks, eye color and spacing, eyebrows, nose, lips, teeth, jawline, ears, neck and expression MUST be a pixel-faithful copy of IMAGE 1. Treat IMAGE 1 as a reference photograph of a real specific person — do NOT generate a similar-looking person, copy the SAME person. Do not beautify, redraw, smooth, stretch, warp, replace, age, de-age or stylize the face. Copy clothing, accessories and body proportions exactly from IMAGE 1.";

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

async function elaborateEditPrompt(userPrompt: string): Promise<string> {
  const userTheme = (userPrompt || "").trim() || "Re-render the same image preserving identity.";
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

  try {
    const { image1_base64, image2_base64, prompt, mode } = await req.json();
    if (!image1_base64) {
      return new Response(JSON.stringify({ ok: false, error: 'Envie ao menos uma imagem.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedPrompt = String(prompt || '').toLowerCase();
    const garmentKeywords = /(roupa|look|outfit|camiseta|camisa|blusa|vestido|jaqueta|casaco|paleto|terno|calca|short|uniforme|figurino|shirt|t-?shirt|dress|jacket|clothing|garment|ensaio)/i;
    const transferKeywords = /(mesma|igual|ingual|transfer|vestir|veste|coloc\w+\s+a\s+roupa|use\s+the\s+clothing|wear|swap|troc\w+\s+roupa|ensaio|fotograf|photoshoot)/i;
    const sceneCloneKeywords = /(clon\w+|replic\w+|reproduz\w+|mesma\s+cena|mesmo\s+cenario|mesmo\s+fundo|copia\w*\s+(a\s+)?cena|copiar\s+(o\s+)?look|look\s+e\s+(a\s+)?cena|cena\s+e\s+(o\s+)?look|same\s+scene|clone\s+the\s+scene)/i;
    const isSceneClone = mode === 'scene-clone' || sceneCloneKeywords.test(normalizedPrompt);
    const isGarmentTransfer = !isSceneClone && !!image2_base64
      && (mode === 'garment' || (garmentKeywords.test(normalizedPrompt) && transferKeywords.test(normalizedPrompt)));

    // If the user is asking for a garment color change, treat as a single-image EDIT
    // even when a second image was provided — this preserves face/hair identity 1:1.
    const localizedColor = buildLocalizedColorEditPrompt(prompt || '');
    const forceEdit = !!localizedColor && !isGarmentTransfer && !isSceneClone;
    const isSingle = !isSceneClone && (!image2_base64 || forceEdit) && !isGarmentTransfer;
    const isTemplate = isSingle && mode === 'template' && !forceEdit;

    let fullPrompt: string;
    if (isSceneClone) {
      const userTheme = (prompt || '').trim();
      const hasPerson = !!image2_base64;
      fullPrompt = [
        'SCENE + LOOK CLONE WITH FACE TRANSPLANT MODE (strict two-reference image edit).',
        'IMAGE 1 = MASTER REFERENCE / BASE CANVAS. Treat it as a pixel-faithful blueprint to reproduce, BUT its visible face/head identity is NOT allowed to remain when IMAGE 2 is provided.',
        'CLONE FROM IMAGE 1: full scene, background, environment, props, lighting direction, color palette, time of day, camera angle, framing, composition, depth of field, mood; AND the complete LOOK — every garment (type, silhouette, cut, neckline, sleeves, length, fabric, texture, color hex, prints, logos, patterns, embroidery), accessories, shoes, body pose, hand pose and body placement. Do NOT clone the face from IMAGE 1 when IMAGE 2 exists.',
        hasPerson
          ? "IMAGE 2 = TARGET FACE / IDENTITY SOURCE. The final main person's face MUST be recognizably the person from IMAGE 2, not the person from IMAGE 1. Replace the entire visible facial identity area from IMAGE 1 with IMAGE 2: copy IMAGE 2's face shape, forehead, eyes, eyebrows, nose, mouth, lips, teeth, cheeks, jawline, ears if visible, skin tone, facial marks, expression and visible hairline exactly. Adapt only perspective and lighting so the transplanted face fits the pose from IMAGE 1. Keep everything else from IMAGE 1 (scene, outfit, body, pose, camera angle, lighting, framing and background) identical. Do NOT average the two faces, do NOT keep IMAGE 1's face, do NOT invent a new face."
          : 'Reproduce IMAGE 1 exactly, keeping the same person and identity.',
        hasPerson
          ? 'NON-NEGOTIABLE CHECK BEFORE OUTPUT: if the generated face still looks like IMAGE 1 or like a blend, the result is wrong. Regenerate until the face identity matches IMAGE 2 while the scene/look still matches IMAGE 1.'
          : '',
        hasPerson
          ? 'Recognition test: a viewer must instantly recognize the SAME setting/outfit/pose/lighting from IMAGE 1 and the SAME facial identity from IMAGE 2.'
          : 'The result MUST be visually indistinguishable from IMAGE 1 in scene and look — a viewer must instantly recognize the SAME setting, SAME outfit, SAME pose, SAME lighting.',
        'OUTPUT: one seamless photorealistic photograph. No collage, no split-screen, no reference thumbnail.',
        userTheme ? `USER NOTE: ${userTheme}.` : '',
        `STYLE: ${REALISM}.`,
        `Negative: face from IMAGE 1, unchanged face, mixed identity, averaged face, new invented face, different face than IMAGE 2, different scene, different background, different location, different lighting, different outfit, different pose, redesigned garment, altered prints, altered logos, missing accessories, ${NEGATIVE}`,
      ].filter(Boolean).join(' ');
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

    const imageUrls = isSingle ? [image1_base64] : [image1_base64, image2_base64].filter(Boolean);
    const runMode = isSceneClone ? 'scene-clone' : (isGarmentTransfer ? 'garment' : (isTemplate ? 'template' : (isSingle ? 'edit' : 'fusion')));

    let result = await generateWithNanoBanana({ prompt: fullPrompt, imageUrls, mode: runMode });

    if (isSceneClone && image2_base64 && result.url) {
      const faceRepairPrompt = [
        'FACE IDENTITY REPAIR PASS — strict two-reference edit.',
        'IMAGE 1 = the generated scene clone result and MUST remain the exact base canvas: preserve its background, outfit, pose, body, lighting, camera angle, crop, colors and all non-face pixels.',
        'IMAGE 2 = the only correct facial identity source. Replace ONLY the visible face/head identity in IMAGE 1 with the person from IMAGE 2.',
        "The final face MUST match IMAGE 2: face shape, eyes, eyebrows, nose, mouth, lips, jawline, cheeks, skin tone, marks, expression and visible hairline. Do not keep the face currently visible in IMAGE 1.",
        'Do not alter clothes, hands, body pose, background, scene, framing, perspective or lighting except to naturally relight the transplanted face.',
        'If the face still resembles IMAGE 1, the edit is wrong. Output one seamless photorealistic image.',
        `Negative: face from IMAGE 1, unchanged face, mixed identity, averaged face, new invented face, altered outfit, altered background, altered pose, ${NEGATIVE}`,
      ].join(' ');
      const repaired = await generateWithNanoBanana({
        prompt: faceRepairPrompt,
        imageUrls: [result.url, image2_base64],
        mode: 'scene-clone',
      });
      if (repaired.url) {
        result = { ...repaired, provider: `${result.provider}+face-repair-${repaired.provider}` };
      }
    }

    if (!result.url) {
      return new Response(JSON.stringify({ ok: false, error: result.error || 'Sem imagem gerada' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (result.provider === 'local-fallback' && isSingle) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'A IA de edição não está disponível agora. A chave Emergent está válida, mas o provedor está bloqueando por limite/cota diária; a imagem não foi alterada.',
        provider: result.provider,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, image: result.url, provider: result.provider, prompt_used: fullPrompt, mode: runMode }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

