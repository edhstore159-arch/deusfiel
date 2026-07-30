import { generateWithNanoBanana, stripDataUrl } from '../_shared/nano-banana.ts';
import { generateImage } from '../_shared/llm.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { prompt, reference_image_base64, logo_base64, provider } = body || {};
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPrompt = `Arte quadrada profissional e fotorrealista para redes sociais de um escritório de advocacia brasileiro elegante. Tema: ${prompt}. Estilo: composição cinematográfica com iluminação dramática de rembrandt, profundidade de campo rasa, paleta de cores escura com dourados e azuis profundos, texturas de madeira nobre e couro, elementos jurídicos sutis (balança, livros, coluna clássica), sem texto, sem letras, sem marcas d'água. Qualidade: 8K, hiper-realista.`;

    const toDataUrl = (b64: string) =>
      b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;

    // With reference image and/or logo: Gemini Nano Banana
    if (reference_image_base64 || logo_base64) {
      const imageUrls: string[] = [];
      const promptParts: string[] = [fullPrompt];

      if (reference_image_base64) {
        imageUrls.push(toDataUrl(reference_image_base64));
        promptParts.push("Use a primeira imagem enviada como referência visual principal. Preserve o rosto e a identidade da pessoa fotografada, recriando-a em um novo cenário profissional de escritório de advocacia (iluminação de estúdio, fundo de escritório elegante).");
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

    async function tryPollinations(p: string) {
      try {
        const pollPrompt = encodeURIComponent(p);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);
        const pollResp = await fetch(`https://image.pollinations.ai/prompt/${pollPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`, {
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);
        if (pollResp.ok) {
          const arrBuf = await pollResp.arrayBuffer();
          if (arrBuf.byteLength > 5000) {
            const b64 = btoa(String.fromCharCode(...new Uint8Array(arrBuf)));
            return b64;
          }
        }
      } catch {}
      return null;
    }

    let img: { ok: boolean; b64?: string; provider?: string; error?: string } = { ok: false };
    if (provider === "pollinations") {
      const b64 = await tryPollinations(fullPrompt);
      if (b64) {
        return new Response(JSON.stringify({ b64_json: b64, image_data_url: `data:image/png;base64,${b64}`, provider: "pollinations" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      img = await generateImage({ prompt: fullPrompt, size: "1024x1024", quality: "high" });
    }
    if (!img.ok) {
      const b64 = await tryPollinations(fullPrompt);
      if (b64) {
        return new Response(JSON.stringify({ b64_json: b64, image_data_url: `data:image/png;base64,${b64}`, provider: "pollinations" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
