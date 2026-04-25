// Edge function: image-combine
// Combina 2-3 imagens usando Nano Banana via Lovable AI Gateway.
// Se os créditos Lovable AI estourarem (402), faz fallback para a Google
// Gemini API direta usando GEMINI_API_KEY.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash-image";
const EMERGENT_MODEL = "gemini-2.5-flash-image-preview";
const EMERGENT_URL = "https://integrations.emergentagent.com/llm/v1/chat/completions";

async function callEmergent(apiKey: string, fullPrompt: string, images: string[]): Promise<string> {
  const content: any[] = [{ type: "text", text: fullPrompt }];
  for (const img of images) {
    content.push({ type: "image_url", image_url: { url: img } });
  }
  const resp = await fetch(EMERGENT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMERGENT_MODEL,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Emergent error ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const url: string | undefined =
    data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (url) return url;
  const c = data?.choices?.[0]?.message?.content;
  if (typeof c === "string" && c.startsWith("data:image")) return c;
  throw new Error("Emergent: nenhuma imagem retornada");
}

function dataUrlToInline(dataUrl: string): { mime_type: string; data: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (m) return { mime_type: m[1], data: m[2] };
  // Assume jpeg if raw base64
  return { mime_type: "image/jpeg", data: dataUrl };
}

async function callGeminiDirect(
  apiKey: string,
  fullPrompt: string,
  images: string[],
): Promise<string> {
  const parts: any[] = [{ text: fullPrompt }];
  for (const img of images) {
    parts.push({ inline_data: dataUrlToInline(img) });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini direct error ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const partsOut = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of partsOut) {
    const inline = p.inline_data || p.inlineData;
    if (inline?.data) {
      const mime = inline.mime_type || inline.mimeType || "image/png";
      return `data:${mime};base64,${inline.data}`;
    }
  }
  throw new Error("Gemini direct: nenhuma imagem retornada");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseImage, referenceImage, referenceImage2, prompt } = await req.json();

    if (!baseImage || typeof baseImage !== "string") {
      return new Response(
        JSON.stringify({ error: "baseImage é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!referenceImage || typeof referenceImage !== "string") {
      return new Response(
        JSON.stringify({ error: "referenceImage é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "prompt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const hasRef2 = typeof referenceImage2 === "string" && referenceImage2.length > 0;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const fullPrompt = hasRef2
      ? `IMAGE 1 is the base subject (preserve identity, face, pose). IMAGE 2 and IMAGE 3 are references for style/background/elements. Instruction: ${prompt}`
      : `IMAGE 1 is the base subject (preserve identity, face, pose). IMAGE 2 is the reference for style/background/element. Instruction: ${prompt}`;

    const images = hasRef2
      ? [baseImage, referenceImage, referenceImage2]
      : [baseImage, referenceImage];

    // Try Lovable AI first if available
    if (LOVABLE_API_KEY) {
      const content: any[] = [{ type: "text", text: fullPrompt }];
      for (const img of images) {
        content.push({ type: "image_url", image_url: { url: img } });
      }

      const resp = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content }],
            modalities: ["image", "text"],
          }),
        },
      );

      if (resp.ok) {
        const data = await resp.json();
        const url: string | undefined =
          data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (url) {
          return new Response(
            JSON.stringify({ imageUrl: url, provider: "lovable-ai" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } else if (resp.status === 402 || resp.status === 429) {
        // Fall through to Gemini direct fallback
        console.log(`Lovable AI ${resp.status}, tentando fallback Gemini direto`);
        if (!GEMINI_API_KEY) {
          const msg = resp.status === 402
            ? "Créditos Lovable AI esgotados. Configure GEMINI_API_KEY como fallback ou adicione saldo."
            : "Limite atingido. Tente novamente em instantes.";
          return new Response(
            JSON.stringify({ error: msg }),
            { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } else {
        const t = await resp.text();
        console.error("Gateway error", resp.status, t);
        // Try fallback if available
        if (!GEMINI_API_KEY) {
          return new Response(
            JSON.stringify({ error: "Erro no gateway Lovable AI" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    // Fallback: Gemini direct
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Nenhuma API key configurada (LOVABLE_API_KEY ou GEMINI_API_KEY)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const url = await callGeminiDirect(GEMINI_API_KEY, fullPrompt, images);
    return new Response(
      JSON.stringify({ imageUrl: url, provider: "gemini-direct" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("image-combine error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
