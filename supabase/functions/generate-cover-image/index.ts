import { generateWithNanoBanana, stripDataUrl } from '../_shared/nano-banana.ts';
import { generateImage } from '../_shared/llm.ts';
import { chatCompletion } from '../_shared/llm.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REALISM =
  "RAW photo, ultra realistic, photorealistic, full-body shot, entire body visible from head to toe, " +
  "correct human anatomy, natural body proportions, realistic hands and fingers, real skin texture with natural imperfections and skin pores, " +
  "professional photography, photojournalism style, 50mm lens, cinematic lighting, shallow depth of field, sharp focus, 8k";
const NEG = "deformed body, distorted anatomy, bad proportions, extra limbs, extra arms, extra fingers, bad hands, fused fingers, broken hands, " +
  "close-up, portrait only, cropped body, face only, cartoon, cgi, 3d render, illustration, painting, blurry, low quality, " +
  "no text, no letters, no typography, no watermarks, no logos";

// Reescreve o prompt do usuário em inglês descritivo, mantendo FIELMENTE o pedido.
// NÃO injeta tema (advogada, escritório etc) — só adiciona realismo. O atalho "law"
// só é usado se o usuário não descrever um sujeito próprio.
async function elaboratePrompt(userPrompt: string, style?: string): Promise<string> {
  const userTheme = (userPrompt || "").trim();
  const extraContext = style === "law"
    ? "If — and only if — the user theme does not already specify a subject, you may set the scene in a modern Brazilian law-firm context. Never override or contradict the user's theme."
    : "";

  try {
    const r = await chatCompletion({
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are an art director writing photorealistic image prompts. " +
            "Your job is to FAITHFULLY render what the user described — never replace, invert, or invent a new subject. " +
            "Translate the user's theme to English if needed, keep every concrete element they mentioned (people, objects, place, mood, colors, action), " +
            "and only add sensory detail (lighting, framing, lens, materials) that does NOT contradict it. " +
            "ALWAYS compose as a FULL-BODY wide shot when people are present: entire body visible from head to toe, correct human anatomy, " +
            "natural proportions, realistic hands and fingers, 35mm or 50mm lens, cinematic lighting, shallow depth of field, photojournalism style. " +
            "Never frame as close-up, portrait, or face-only unless the user explicitly requested it. " +
            "Output ONE single-line English prompt describing the final image as if it already exists. " +
            "Use realism keywords (RAW photo, photorealistic, ultra realistic, real skin texture, natural imperfections, skin pores, professional photography, cinematic lighting, depth of field) " +
            "and finish with a 'Negative:' section listing: deformed body, bad proportions, extra limbs, bad hands, fused fingers, close-up, portrait, cropped body, cartoon, cgi, render, blurry. " +
            "No explanations, no markdown.",
        },
        {
          role: "user",
          content: `USER THEME (render this faithfully, do not replace it):\n"""${userTheme}"""\n\n${extraContext}`.trim(),
        },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 10) return txt;
    }
  } catch (_e) { /* fallback */ }

  return `${userTheme}. ${REALISM}. Negative: ${NEG}`;
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

    // Text-to-image: try Lovable Gateway gpt-image-2, fallback to Emergent (gpt-image-1).
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
