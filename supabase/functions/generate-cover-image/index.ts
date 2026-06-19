import { generateWithNanoBanana, stripDataUrl } from '../_shared/nano-banana.ts';
import { generateImage } from '../_shared/llm.ts';
import { chatCompletion } from '../_shared/llm.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function elaboratePrompt(userPrompt: string, style?: string): Promise<string> {
  const styleHint = style === "law"
    ? "Contexto: arte para redes sociais de um escritório de advocacia brasileiro (visual elegante, jurídico, humano)."
    : "Respeite estritamente o tema solicitado pelo usuário, sem adicionar contexto não pedido.";
  try {
    const r = await chatCompletion({
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Você é um especialista em prompts para geração de imagens. " +
            "Receba o pedido do usuário e devolva APENAS um prompt em inglês, detalhado, descritivo, " +
            "com composição, iluminação, paleta de cores, estilo artístico e enquadramento. " +
            "NUNCA inclua texto, letras ou marcas d'água na imagem. " +
            "Não acrescente explicações, devolva só o prompt final em uma linha.",
        },
        { role: "user", content: `${styleHint}\n\nPedido do usuário: ${userPrompt}` },
      ],
    });
    if (r.ok) {
      const txt = r.data?.choices?.[0]?.message?.content?.trim();
      if (txt && txt.length > 10) return `${txt}, no text, no letters, no watermarks`;
    }
  } catch (_e) { /* fallback below */ }
  // Fallback: passa o prompt do usuário com instruções mínimas, sem forçar tema.
  const ctx = style === "law"
    ? `Square professional social-media art for a Brazilian law firm. Theme: ${userPrompt}. Elegant, human, no text, no letters, no watermarks.`
    : `${userPrompt}. High quality, detailed, no text, no letters, no watermarks.`;
  return ctx;
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
