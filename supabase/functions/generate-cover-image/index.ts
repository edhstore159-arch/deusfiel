import { generateWithNanoBanana, stripDataUrl } from '../_shared/nano-banana.ts';
import { generateImage } from '../_shared/llm.ts';
import { chatCompletion } from '../_shared/llm.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function elaboratePrompt(userPrompt: string, style?: string): Promise<string> {
  const styleHint = style === "law"
    ? "Contexto: post fotográfico realista para redes sociais de um escritório de advocacia brasileiro."
    : "Respeite estritamente o tema solicitado pelo usuário. Gere uma imagem FOTORREALISTA para redes sociais.";
  const REALISM =
    "photorealistic, ultra-realistic, shot on Canon EOS R5 with 50mm f/1.4 lens, " +
    "natural lighting, shallow depth of field, high detail skin texture, realistic human anatomy, " +
    "candid documentary style, 8k, professional color grading, sharp focus";
  const NEG = "no text, no letters, no typography, no watermarks, no logos, no cartoon, no illustration, no 3d render, no cgi, no painting";
  try {
    const r = await chatCompletion({
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Você é um diretor de arte especialista em prompts de fotografia para redes sociais. " +
            "Receba o pedido do usuário e devolva APENAS um prompt em inglês, em UMA linha, " +
            "descrevendo uma FOTOGRAFIA REALISTA (não ilustração, não 3D, não cartoon). " +
            "Inclua: sujeito, cenário, ação, lente/câmera, iluminação, paleta, mood, enquadramento e estilo fotográfico. " +
            "Pessoas devem ter anatomia, pele e expressões realistas. " +
            "NUNCA inclua texto, letras, logos ou marcas d'água. " +
            "Devolva só o prompt final, sem explicações.",
        },
        { role: "user", content: `${styleHint}\n\nPedido do usuário: ${userPrompt}` },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 10) return `${txt}, ${REALISM}, ${NEG}`;
    }
  } catch (_e) { /* fallback below */ }
  const base = style === "law"
    ? `Realistic editorial photograph for a Brazilian law firm social media. Theme: ${userPrompt}. Elegant, human, professional environment.`
    : `Realistic editorial social-media photograph. Theme: ${userPrompt}.`;
  return `${base} ${REALISM}, ${NEG}`;
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
