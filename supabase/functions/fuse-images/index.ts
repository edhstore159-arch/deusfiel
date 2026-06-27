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
  "You are a photorealistic image editor prompt engineer. You receive ONE reference image and a user instruction (often a color change or local edit). " +
  "Produce ONE single-line English prompt that re-renders the SAME image with the user's edit applied — preserve identity, composition, lighting, perspective, background and all other details. " +
  "If the user mentions a color (e.g. 'azul', 'vermelho', 'dourado'), apply that color clearly and dominantly to the requested area (clothing, hair, object, eyes, background — whichever the user named, defaulting to the main subject). " +
  "Output ONLY the filled prompt as a single line. End with: 'Negative: " + NEGATIVE + "'.";

const TEMPLATE_CLONE_SYSTEM =
  "You are a graphic-design prompt engineer specialized in CLONING marketing/social-media templates. " +
  "You receive ONE reference image (a template/layout: post, flyer, story, thumbnail, ad) and a user instruction with the NEW text/content. " +
  "Produce ONE single-line English prompt that recreates the SAME visual template — preserve layout, grid, typography style, color palette, decorative shapes, frames, badges, brand area, photo placement zones, lighting and overall mood — but REPLACE the text with the user's new copy and REPLACE any photographic subject with the new subject described by the user. " +
  "Keep fonts and font weights visually equivalent to the reference. Keep alignment, hierarchy and spacing identical. Render all new text as crisp, legible, professionally typeset graphics inside the same text blocks of the original. " +
  "Output ONLY the filled prompt as a single line. End with: 'Negative: blurry text, garbled text, misspelled words, distorted letters, different layout, different color palette, different style, watermark, logo of unrelated brand, " + NEGATIVE + "'.";

async function elaborateEditPrompt(userPrompt: string): Promise<string> {
  const userTheme = (userPrompt || "").trim() || "Re-render the same image preserving identity.";
  try {
    const r = await chatCompletion({
      temperature: 0.2,
      messages: [
        { role: "system", content: EDIT_SINGLE_SYSTEM },
        { role: "user", content: `USER EDIT INSTRUCTION (apply exactly, preserve identity and composition):\n"""${userTheme}"""` },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 20) return txt;
    }
  } catch (_e) { /* fallback */ }
  return `Edit the reference image as follows: ${userTheme}. Preserve identity, composition, perspective, lighting and background; apply the requested color/edit clearly and dominantly to the relevant area. ${FACE_LOCK} ${REALISM}. Negative: ${NEGATIVE}`;
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
    const { image1_base64, image2_base64, prompt } = await req.json();
    if (!image1_base64) {
      return new Response(JSON.stringify({ ok: false, error: 'Envie ao menos uma imagem.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isSingle = !image2_base64;
    const fullPrompt = isSingle ? await elaborateEditPrompt(prompt) : await elaborateFusionPrompt(prompt);
    const imageUrls = isSingle ? [image1_base64] : [image1_base64, image2_base64];

    const result = await generateWithNanoBanana({ prompt: fullPrompt, imageUrls });

    if (!result.url) {
      return new Response(JSON.stringify({ ok: false, error: result.error || 'Sem imagem gerada' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, image: result.url, provider: result.provider, prompt_used: fullPrompt, mode: isSingle ? 'edit' : 'fusion' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

