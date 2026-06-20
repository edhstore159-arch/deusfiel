import { generateWithNanoBanana, stripDataUrl } from '../_shared/nano-banana.ts';
import { generateImage } from '../_shared/llm.ts';
import { chatCompletion } from '../_shared/llm.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REALISM =
  "RAW photo, ultra realistic photograph captured on a professional DSLR camera, photojournalism / documentary photography style, " +
  "85mm or 50mm lens, shallow depth of field with softly blurred background, sharp focus on the subject's face, " +
  "natural soft lighting (preferably window light), realistic soft shadows, balanced contrast (no exaggerated HDR), " +
  "natural color grading (no Instagram filter, no oversaturation), " +
  "real skin texture with visible pores and natural imperfections, slight stubble where appropriate, authentic emotional expression, " +
  "natural catchlights in the eyes, real fabric folds and wrinkles in clothing, natural ISO with no artificial denoising, " +
  "everyday real environment with natural imperfections (objects slightly out of place, real textures, light dust, wear)";

const NEG =
  "digital art, illustration, painting, cartoon, anime, 3d render, CGI, plastic skin, perfect skin, airbrushed, beauty filter, " +
  "stock photo aesthetic, AI-looking, oversaturated, exaggerated HDR, artificial studio lighting, overprocessed, " +
  "deformed body, distorted anatomy, bad proportions, extra limbs, extra fingers, fused fingers, broken hands, " +
  "close-up only, face only, cropped body, blurry, low quality, watermark, logo, text, typography";

// Reescreve o prompt do usuário em inglês descritivo, mantendo FIELMENTE o pedido.
async function elaboratePrompt(userPrompt: string, style?: string): Promise<string> {
  const userTheme = (userPrompt || "").trim();
  const extraContext = style === "law"
    ? "If — and only if — the user theme does not already specify a subject, you may set the scene in a modern Brazilian law-firm context. Never override or contradict the user's theme."
    : "";

  try {
    const r = await chatCompletion({
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: [
            "You are a director of photography and a specialist in hyper-realistic image prompts (Nano Banana style).",
            "Your task is to convert the user's scene description into ONE single-line English prompt that produces an EXTREMELY realistic photograph — as if captured by a professional DSLR camera, NOT digital art, NOT illustration, NOT 3D render.",
            "STRICT FIDELITY: Never change, replace, simplify or reinterpret the subject. Never invent elements not requested. Preserve ALL elements described by the user (people, objects, setting, mood, action). Translate non-English input to English while keeping exact meaning.",
            "ALWAYS FILL THESE FIELDS in the output prompt:",
            "- SCENE: describe the scene faithfully from the user theme.",
            "- CHARACTER: realistic appearance, natural skin imperfections, light stubble when appropriate, authentic emotional expression (concern, tiredness, reflection, joy — whatever fits). Never perfect or artificial faces. Brazilian appearance unless the user says otherwise.",
            "- ENVIRONMENT: real environment (simple home, office, street, etc.) with natural elements and imperfections (objects slightly out of place, real texture, light dust, wear).",
            "- LIGHTING: realistic cinematic lighting — soft natural window light, soft realistic shadows, balanced contrast, no exaggerated HDR.",
            "- CAMERA: 50mm or 85mm lens, shallow depth of field (slightly blurred background), focus on the face, DSLR photography style, natural ISO, no artificial noise.",
            "- STYLE: documentary photography, ultra realistic, natural colors (no oversaturation), no Instagram filter, no AI look.",
            "- DETAILS: real skin texture (pores, small imperfections), eyes with natural light reflections, real fabric folds, nothing plastic or CGI.",
            "FORBIDDEN: digital art, cartoon, 3D render, perfect skin, exaggerated artificial lighting, stock-photo aesthetic.",
            "GOAL: the image must look like a REAL photograph of a true, emotional, everyday situation.",
            "OUTPUT FORMAT: ONE single-line English prompt. No markdown, no bullet points, no explanations. End with: '--style raw --no artificial --no smooth skin --no CGI --photorealism high'.",
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

  return `${userTheme}. ${REALISM}. Negative: ${NEG}. --style raw --no artificial --no smooth skin --no CGI --photorealism high`;
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
