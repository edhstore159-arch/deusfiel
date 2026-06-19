import { generateWithNanoBanana, stripDataUrl } from '../_shared/nano-banana.ts';
import { generateImage } from '../_shared/llm.ts';
import { chatCompletion } from '../_shared/llm.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Layered descriptive template (no "orders" — pure description).
const LAYERED_TEMPLATE = (tema: string) => `[MAIN SUBJECT]
${tema}

[APPEARANCE]
well-groomed, elegant, confident expression, natural skin texture, realistic human anatomy

[SCENE]
contextual modern environment matching the theme, tidy and professional

[LIGHTING]
soft natural light, cinematic lighting, balanced highlights, studio-quality

[FRAMING]
medium shot, sharp focus on the subject, blurred background (bokeh, depth of field)

[STYLE]
photorealistic, ultra realistic, professional photography, 8k, real skin texture, premium advertising aesthetic, big-brand ad look, vibrant colors, high contrast

[REINFORCEMENT]
${tema}, ${tema}, photorealistic, ultra realistic, real skin texture, professional photography, cinematic lighting, depth of field

[NEGATIVE]
deformed face, wrong hands, low quality, artificial look, extra elements, text, letters, typography, watermark, logo, cartoon, 3d render, cgi, illustration`;

const REALISM =
  "photorealistic, ultra-realistic, real skin texture, professional photography, cinematic lighting, " +
  "depth of field, vibrant colors, high contrast, sharp focus, 8k, premium advertising aesthetic";
const NEG = "no text, no letters, no typography, no watermarks, no logos, no deformed faces, no wrong hands, no cartoon, no 3d render, no cgi, no illustration, no artificial look";

async function elaboratePrompt(userPrompt: string, style?: string): Promise<string> {
  const styleHint = style === "law"
    ? "Context: realistic photographic social-media post for a Brazilian law firm. Subject: a professional female lawyer (30-40), elegant black blazer and white shirt, modern law office, law books in background."
    : "Strictly describe the user's theme as if the final image already exists.";
  const layered = LAYERED_TEMPLATE(userPrompt);
  try {
    const r = await chatCompletion({
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You are an art director writing photorealistic image prompts. " +
            "DESCRIBE the final image — never give orders to the model. " +
            "Return ONE single-line English prompt using layered structure (subject, appearance, scene, lighting, framing, style) " +
            "with repeated key concepts for emphasis, strong realism keywords (photorealistic, ultra realistic, real skin texture, " +
            "professional photography, cinematic lighting, depth of field), and a negative section. No explanations.",
        },
        { role: "user", content: `${styleHint}\n\n${layered}` },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 10) return `${txt}, ${REALISM}. Negative: ${NEG}`;
    }
  } catch (_e) { /* fallback below */ }
  return `${layered}\n\n${REALISM}. Negative: ${NEG}`;
}




Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { prompt, reference_image_base64, logo_base64, style } = body || {};
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPrompt = await elaboratePrompt(prompt, style);

    const toDataUrl = (b64: string) =>
      b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;

    // With reference image and/or logo: Gemini Nano Banana
    if (reference_image_base64 || logo_base64) {
      const imageUrls: string[] = [];
      const promptParts: string[] = [fullPrompt];

      if (reference_image_base64) {
        imageUrls.push(toDataUrl(reference_image_base64));
        promptParts.push("Use a primeira imagem enviada como referência visual principal (mantenha tema, cores e elementos).");
      }
      if (logo_base64) {
        imageUrls.push(toDataUrl(logo_base64));
        promptParts.push("Incorpore o logo enviado (última imagem) de forma discreta e elegante em um dos cantos da arte, preservando suas cores e proporções originais, sem distorcer.");
      }

      const result = await generateWithNanoBanana({
        prompt: promptParts.join("\n\n"),
        imageUrls,
      });

      if (!result.url) {
        return new Response(JSON.stringify({ error: result.error || "Sem imagem gerada" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ b64_json: stripDataUrl(result.url), image_data_url: result.url, provider: result.provider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Text-to-image: Emergent first, then free/provider fallbacks.
    const img = await generateImage({ prompt: fullPrompt, size: "1024x1024", quality: "low" });
    if (!img.ok) {
      // Local SVG fallback so the client never sees a 502 / blank screen.
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><circle cx="512" cy="420" r="160" fill="rgba(255,255,255,0.08)"/><rect x="312" y="640" width="400" height="14" rx="7" fill="rgba(255,255,255,0.35)"/><rect x="372" y="680" width="280" height="10" rx="5" fill="rgba(255,255,255,0.22)"/></svg>`;
      const b64 = btoa(unescape(encodeURIComponent(svg)));
      return new Response(JSON.stringify({
        image_data_url: `data:image/svg+xml;base64,${b64}`,
        provider: "local-fallback",
        warning: img.error,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ b64_json: img.b64, image_data_url: `data:image/png;base64,${img.b64}`, provider: img.provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
