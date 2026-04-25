// Edge function: image-edit
// Lovable AI Gateway primário; se 402/429, faz fallback para Gemini direto
// usando GEMINI_API_KEY.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash-image";

function dataUrlToInline(dataUrl: string): { mime_type: string; data: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (m) return { mime_type: m[1], data: m[2] };
  return { mime_type: "image/jpeg", data: dataUrl };
}

async function callGeminiDirect(apiKey: string, fullPrompt: string, imageDataUrl: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: fullPrompt },
          { inline_data: dataUrlToInline(imageDataUrl) },
        ],
      }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini direct error ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
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
    const { imageDataUrl, prompt, negativePrompt } = await req.json();

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageDataUrl é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const fullPrompt = negativePrompt && negativePrompt.trim()
      ? `${prompt}\n\nAvoid: ${negativePrompt}`
      : prompt;

    if (LOVABLE_API_KEY) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: fullPrompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          }],
          modalities: ["image", "text"],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const editedUrl: string | undefined =
          data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (editedUrl) {
          return new Response(JSON.stringify({ imageUrl: editedUrl, provider: "lovable-ai" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else if ((response.status === 402 || response.status === 429) && !GEMINI_API_KEY) {
        const msg = response.status === 402
          ? "Créditos Lovable AI esgotados. Configure GEMINI_API_KEY ou adicione saldo."
          : "Limite atingido. Tente novamente em instantes.";
        return new Response(JSON.stringify({ error: msg }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else if (response.status !== 402 && response.status !== 429) {
        const t = await response.text();
        console.error("Gateway error:", response.status, t);
        if (!GEMINI_API_KEY) {
          return new Response(JSON.stringify({ error: "Erro no gateway de IA" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Nenhuma API key configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const editedUrl = await callGeminiDirect(GEMINI_API_KEY, fullPrompt, imageDataUrl);
    return new Response(JSON.stringify({ imageUrl: editedUrl, provider: "gemini-direct" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("image-edit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
