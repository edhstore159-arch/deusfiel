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

const COLOR_ALIASES: Array<{ re: RegExp; en: string; strong: string }> = [
  { re: /\b(azul|blue)\b/i, en: 'blue', strong: 'clear saturated royal blue (#005DFF)' },
  { re: /\b(vermelh[ao]|red)\b/i, en: 'red', strong: 'clear red' },
  { re: /\b(preto|preta|black)\b/i, en: 'black', strong: 'deep black' },
  { re: /\b(branco|branca|white)\b/i, en: 'white', strong: 'clean white' },
  { re: /\b(verde|green)\b/i, en: 'green', strong: 'clear green' },
  { re: /\b(amarel[ao]|yellow)\b/i, en: 'yellow', strong: 'clear yellow' },
  { re: /\b(rosa|pink)\b/i, en: 'pink', strong: 'clear pink' },
  { re: /\b(roxo|roxa|purple)\b/i, en: 'purple', strong: 'clear purple' },
  { re: /\b(laranja|orange)\b/i, en: 'orange', strong: 'clear orange' },
  { re: /\b(cinza|gray|grey)\b/i, en: 'gray', strong: 'neutral gray' },
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

  return `IMAGE EDIT MODE — use the attached image as the exact base canvas. Localized garment color replacement: identify the shirt/t-shirt/top/clothing${sourceText} and recolor ONLY that garment to ${target.strong}. The final visible garment color MUST be ${target.en}. Preserve the original garment fabric texture, seams, folds, wrinkles, shadows, highlights, print/logos, shape and fit. Preserve the same person, face, skin, hair, hands, pose, body, background, lighting, camera angle, crop, perspective and all other objects exactly. Do not create a new person, do not create a new scene, do not change the composition. Photorealistic edit, natural fabric color, clean edges. User instruction: ${userTheme}. Negative: unchanged garment color, red shirt if target is blue, new shirt shape, different clothing style, different person, different background, new scene, ${NEGATIVE}`;
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

    const isSingle = !image2_base64;
    const isTemplate = isSingle && mode === 'template';
    const fullPrompt = isTemplate
      ? await elaborateTemplatePrompt(prompt)
      : (isSingle ? await elaborateEditPrompt(prompt) : await elaborateFusionPrompt(prompt));
    const imageUrls = isSingle ? [image1_base64] : [image1_base64, image2_base64];

    const result = await generateWithNanoBanana({ prompt: fullPrompt, imageUrls, mode: isTemplate ? 'template' : (isSingle ? 'edit' : 'fusion') });

    if (!result.url) {
      return new Response(JSON.stringify({ ok: false, error: result.error || 'Sem imagem gerada' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, image: result.url, provider: result.provider, prompt_used: fullPrompt, mode: isTemplate ? 'template' : (isSingle ? 'edit' : 'fusion') }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

