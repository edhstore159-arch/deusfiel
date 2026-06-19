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
            [
              "You are a professional art director specialized in photorealistic AI image generation.",
              "Your task is to faithfully and accurately translate the user's request into a highly detailed, ultra-realistic image prompt.",
              "CRITICAL RULES: NEVER change, replace, simplify, or reinterpret the subject. NEVER invent new elements that were not requested. ALWAYS preserve ALL elements described by the user (people, objects, setting, mood, colors, action). If the input is not in English, translate it to English while preserving exact meaning.",
              "COMPOSITION RULES: When people are present, ALWAYS use a full-body wide shot, entire body visible from head to toe, correct human anatomy, realistic proportions, realistic hands with five fingers per hand, natural posture (no stiff or broken poses). Use 35mm or 50mm lens, cinematic lighting, natural shadows, depth of field, real-world camera perspective.",
              "REALISM ENFORCEMENT: Add only details that enhance realism without changing the request — RAW photo, photorealistic, ultra realistic, real skin texture, natural imperfections, skin pores, professional photography, photojournalism style. Materials must look real (fabric, metal, skin, glass). Avoid artificial or CGI-looking results.",
              "ANTI-DISTORTION RULES: Force stability in anatomy (correct human anatomy, natural body proportions, symmetrical body structure). Force hand quality (realistic hands, five fingers clearly defined, no fused or broken fingers). Avoid model confusion (clear scene description, no ambiguous wording, no conflicting instructions).",
              "FRAMING CONTROL: NEVER generate close-up, portrait, face-only, or cropped body UNLESS the user explicitly requests it.",
              "OUTPUT FORMAT: Generate ONLY ONE single-line prompt. Write in English. Describe the image as if it already exists. Do NOT explain anything. Do NOT use markdown. Do NOT break into multiple lines.",
              "FINAL STRUCTURE: [Scene description with full detail], RAW photo, photorealistic, ultra realistic, real skin texture, natural imperfections, professional photography, cinematic lighting, depth of field, 35mm lens. Negative: deformed body, distorted anatomy, bad proportions, extra limbs, missing fingers, fused fingers, broken hands, unrealistic body, asymmetry, long neck, poorly drawn hands, close-up, portrait, cropped body, face only, cartoon, cgi, render, blurry, low quality.",
            ].join(" "),

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
