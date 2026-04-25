// Edge function: image-generate
// Gera imagem por prompt. Cadeia: Lovable AI → Gemini direto → Emergent.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash-image";
const EMERGENT_MODEL = "gemini/gemini-2.5-flash-image";
const EMERGENT_URL = "https://integrations.emergentagent.com/llm/v1/chat/completions";

async function callGeminiDirect(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!resp.ok) throw new Error(`Gemini direct ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  for (const p of data?.candidates?.[0]?.content?.parts ?? []) {
    const inline = p.inline_data || p.inlineData;
    if (inline?.data) return `data:${inline.mime_type || inline.mimeType || "image/png"};base64,${inline.data}`;
  }
  throw new Error("Gemini direct: sem imagem");
}

async function callEmergent(apiKey: string, prompt: string): Promise<string> {
  const resp = await fetch(EMERGENT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMERGENT_MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!resp.ok) throw new Error(`Emergent ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (url) return url;
  const c = data?.choices?.[0]?.message?.content;
  if (typeof c === "string" && c.startsWith("data:image")) return c;
  throw new Error("Emergent: sem imagem");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const EMERGENT_API_KEY = Deno.env.get("EMERGENT_API_KEY");
    const hasFallback = !!GEMINI_API_KEY || !!EMERGENT_API_KEY;

    if (LOVABLE_API_KEY) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (url) return new Response(JSON.stringify({ imageUrl: url, provider: "lovable-ai" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else if ((resp.status === 402 || resp.status === 429) && !hasFallback) {
        return new Response(JSON.stringify({
          error: resp.status === 402
            ? "Créditos Lovable AI esgotados. Configure GEMINI_API_KEY ou EMERGENT_API_KEY."
            : "Limite atingido. Tente novamente.",
        }), { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        console.error("Lovable AI erro", resp.status, (await resp.text()).slice(0, 200));
      }
    }

    if (GEMINI_API_KEY) {
      try {
        const url = await callGeminiDirect(GEMINI_API_KEY, prompt);
        return new Response(JSON.stringify({ imageUrl: url, provider: "gemini-direct" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        console.error("Gemini falhou:", e);
        if (!EMERGENT_API_KEY) throw e;
      }
    }

    if (EMERGENT_API_KEY) {
      const url = await callEmergent(EMERGENT_API_KEY, prompt);
      return new Response(JSON.stringify({ imageUrl: url, provider: "emergent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Nenhuma API key configurada" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("image-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
