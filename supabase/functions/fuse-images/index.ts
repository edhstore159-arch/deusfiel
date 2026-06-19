import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { generateWithNanoBanana } from '../_shared/nano-banana.ts';
import { chatCompletion } from '../_shared/llm.ts';

const REALISM =
  "RAW photo, ultra realistic, photorealistic, real skin texture with natural imperfections and skin pores, " +
  "professional photography, photojournalism style, 35mm or 50mm lens, cinematic lighting, shallow depth of field, sharp focus, 8k";

const NEGATIVE =
  "deformed body, distorted anatomy, bad proportions, extra limbs, extra arms, extra fingers, bad hands, fused fingers, broken hands, " +
  "close-up, portrait only, cropped body, face only, duplicated subjects, collage, split screen, side-by-side, picture-in-picture, " +
  "frames, borders, cartoon, cgi, 3d render, illustration, painting, blurry, low quality, " +
  "no text, no letters, no typography, no watermarks, no logos";

const BASE_FUSION_INTENT =
  "Merge the two reference images into ONE single seamless photorealistic scene as if it were a real photograph. " +
  "Treat image 1 as the MAIN SUBJECT (preserve identity, face, body proportions, clothing and colors). " +
  "Treat image 2 as the SCENE/CONTEXT (use its environment, lighting mood, palette and atmosphere). " +
  "Place the main subject naturally inside the scene, matching perspective, scale, lighting direction and shadows. " +
  "Compose as a FULL-BODY wide shot: entire body visible from head to toe, no cropping, correct human anatomy, " +
  "natural proportions, realistic hands and fingers. Storytelling composition, environment clearly visible.";

async function elaborateFusionPrompt(userPrompt: string): Promise<string> {
  const userTheme = (userPrompt || "").trim();
  try {
    const r = await chatCompletion({
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are an art director writing prompts for an image-editing model that fuses TWO reference images into ONE photo. " +
            "Faithfully keep the user's intent — never invent a new subject or override their request. " +
            "Translate to English if needed and output ONE single-line descriptive prompt of the final photo (as if it already exists). " +
            "Always state explicitly: keep the subject from image 1, use the environment from image 2, blend lighting and perspective, " +
            "single seamless composition (no collage / no split-screen). Add realism keywords and a short 'Negative:' section. " +
            "No markdown, no explanations.",
        },
        {
          role: "user",
          content:
            `USER REQUEST (respect this exactly):\n"""${userTheme || "Combine the two images into one harmonious photorealistic scene."}"""\n\n` +
            `BASELINE INTENT:\n${BASE_FUSION_INTENT}`,
        },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 20) return txt;
    }
  } catch (_e) { /* fallback below */ }

  // Determinístico, sem LLM:
  return `${BASE_FUSION_INTENT} ${userTheme ? `User direction: ${userTheme}.` : ""} ${REALISM}. Negative: ${NEGATIVE}`;
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
