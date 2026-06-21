import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { generateWithNanoBanana } from '../_shared/nano-banana.ts';
import { chatCompletion } from '../_shared/llm.ts';

const REALISM =
  "ultra realistic photography, 50mm lens, shallow depth of field, natural skin texture, " +
  "real imperfections, aligned eyes, realistic pupils, natural mouth and nose, cinematic lighting, high dynamic range, 4k, sharp focus";

const NEGATIVE =
  "blurry, distorted face, warped face, melted face, asymmetrical eyes, duplicated eyes, distorted pupils, bad teeth, different person, cartoon, illustration, fake skin, plastic skin, over-smooth, " +
  "bad hands, deformed hands, abnormal hands, distorted hands, extra fingers, missing fingers, fused fingers, duplicated fingers, broken fingers, bent-backwards fingers, wrong thumb placement, claw hands, rubber fingers, oversized hands, tiny hands, mutated, unrealistic proportions, collage, split screen, side-by-side, " +
  "picture-in-picture, frames, borders, text, watermarks, logos";

const FACE_LOCK =
  "FACE LOCK: preserve the exact face from IMAGE 1; maintain facial geometry, skin tone, eye spacing, pupils, nose, lips, jawline and expression. Do not beautify, redraw, smooth, stretch, warp, replace or stylize the face.";

const HAND_LOCK =
  "HAND LOCK: inspect every visible hand and render it anatomically normal. Each hand must have exactly five fingers: one opposable thumb and four fingers, correct knuckles, natural nail placement, believable palm structure, natural webbing, realistic wrist-to-forearm attachment, and physically possible gestures. Finger lengths must be natural (middle longest, ring/index slightly shorter, pinky shortest, thumb lower and angled). Never create extra fingers, missing fingers, fused fingers, duplicated fingertips, broken joints, claw hands, rubber fingers, displaced hands, shared hands, or hands growing from the wrong body part.";

const TEMPLATE_SYSTEM =
  "You are a photorealistic image generator prompt engineer that must STRICTLY preserve the original visual identity of the two reference images. " +
  "You will receive TWO reference images: IMAGE 1 = the PERSON (subject), IMAGE 2 = the ENVIRONMENT (scene). " +
  "Produce ONE single-line English prompt that recreates a scene combining elements from them with MAXIMUM fidelity. " +
  "Fill EVERY field of the template below with what is actually observable — never leave brackets, never invent traits. " +
  "Output ONLY the filled prompt as a single line (no markdown, no headings, no explanations).\n\n" +
  "TEMPLATE:\n" +
  "SUBJECT (IMAGE 1 - PERSON): gender, age, skin tone, face shape, eye color and shape, eyebrows, nose, lips, hair (color/texture/style), expression, body type, posture. " +
  `CRITICAL: ${FACE_LOCK} ` +
  `CRITICAL HANDS: ${HAND_LOCK} ` +
  "CLOTHING & STYLE: colors, fabric, fit, accessories. " +
  "SCENE (IMAGE 2 - ENVIRONMENT): location, lighting, time of day, objects, background elements, mood. " +
  "CAMERA & PHOTO STYLE: " + REALISM + ". " +
  "RULES: do NOT change facial features, do NOT invent new elements, do NOT cartoonize or stylize, keep proportions realistic, preserve identity exactly, keep face natural and undistorted, repair any visible hand/finger deformation while preserving the person's pose. " +
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

  return `Place the person from IMAGE 1 (preserve exact identity, face, skin, hair, clothing, accessories) inside the environment from IMAGE 2 (preserve its lighting, palette, time of day, mood). ${FACE_LOCK} ${HAND_LOCK} Single seamless photorealistic composition, match perspective and shadows, no collage, no split-screen. ${userTheme ? `User direction: ${userTheme}.` : ""} ${REALISM}. Negative: ${NEGATIVE}`;
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
