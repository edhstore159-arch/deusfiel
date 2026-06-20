import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { generateWithNanoBanana } from '../_shared/nano-banana.ts';
import { chatCompletion } from '../_shared/llm.ts';

const REALISM =
  "ultra realistic photography, 50mm lens, natural skin texture, real imperfections, " +
  "cinematic lighting, high dynamic range, 4k, sharp focus, crisp facial details even when the face is small or far from camera, " +
  "deep enough depth of field to keep every visible face sharp, realistic micro-texture in eyes, lips and skin";

const NEGATIVE =
  "blurry, distorted face, different person, cartoon, illustration, fake skin, over-smooth, " +
  "out-of-focus face, soft face, smeared facial details, extra fingers, mutated, unrealistic proportions, collage, split screen, side-by-side, " +
  "picture-in-picture, frames, borders, text, watermarks, logos";

const TEMPLATE_SYSTEM =
  "You are a photorealistic image generator prompt engineer that must STRICTLY preserve the original visual identity of the two reference images. " +
  "You will receive TWO reference images: IMAGE 1 = the PERSON (subject), IMAGE 2 = the ENVIRONMENT (scene). " +
  "Produce ONE single-line English prompt that recreates a scene combining elements from them with MAXIMUM fidelity. " +
  "Fill EVERY field of the template below with what is actually observable — never leave brackets, never invent traits. " +
  "Output ONLY the filled prompt as a single line (no markdown, no headings, no explanations).\n\n" +
  "TEMPLATE:\n" +
  "SUBJECT (IMAGE 1 - PERSON): gender, age, skin tone, face shape, eye color and shape, eyebrows, nose, lips, hair (color/texture/style), expression, body type, posture. " +
  "CRITICAL: face MUST remain consistent and sharp — do NOT change identity, do NOT stylize, do NOT beautify, do NOT blur distant faces. " +
  "CLOTHING & STYLE: colors, fabric, fit, accessories. " +
  "SCENE (IMAGE 2 - ENVIRONMENT): location, lighting, time of day, objects, background elements, mood. " +
  "CAMERA & PHOTO STYLE: " + REALISM + ". " +
  "RULES: do NOT change facial features, do NOT invent new elements, do NOT cartoonize or stylize, keep proportions realistic, preserve identity exactly. " +
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

  return `Place the person from IMAGE 1 (preserve exact identity, face, skin, hair, clothing, accessories; every visible face must stay crisp and recognizable even if small or far away) inside the environment from IMAGE 2 (preserve its lighting, palette, time of day, mood). Single seamless photorealistic composition, match perspective and shadows, no collage, no split-screen. ${userTheme ? `User direction: ${userTheme}.` : ""} ${REALISM}. Negative: ${NEGATIVE}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { image1_base64, image2_base64, prompt } = await req.json();
    if (!image1_base64 || !image2_base64) {
      return new Response(JSON.stringify({ ok: false, error: 'Envie as duas imagens.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fullPrompt = await elaborateFusionPrompt(prompt);

    const result = await generateWithNanoBanana({
      prompt: fullPrompt,
      imageUrls: [image1_base64, image2_base64],
    });

    if (!result.url) {
      return new Response(JSON.stringify({ ok: false, error: result.error || 'Sem imagem gerada' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, image: result.url, provider: result.provider, prompt_used: fullPrompt }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
