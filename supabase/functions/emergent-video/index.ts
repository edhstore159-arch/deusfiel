// Emergent video generation proxy. Accepts a prompt and an optional override key.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { prompt, durationSeconds, aspectRatio, overrideKey, model } = await req.json();
    const key = (typeof overrideKey === "string" && overrideKey.trim().startsWith("sk-emergent"))
      ? overrideKey.trim()
      : Deno.env.get("EMERGENT_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ ok: false, error: "EMERGENT_API_KEY ausente. Informe uma chave Emergent." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "prompt obrigatório" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seconds = Math.min(8, Math.max(4, Number(durationSeconds) || 6));
    const ratio = aspectRatio === "16:9" ? "16:9" : "9:16";
    const targetModel = (typeof model === "string" && model) || "vertex_ai/veo-3.0-generate-001";

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 180000);
    const r = await fetch("https://integrations.emergentagent.com/llm/video/generations", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: targetModel,
        prompt,
        duration_seconds: seconds,
        aspect_ratio: ratio,
      }),
    });
    clearTimeout(t);
    const text = await r.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* keep text */ }

    if (!r.ok) {
      const msg = parsed?.error?.message || parsed?.message || text.slice(0, 400);
      const budgetExceeded = /budget|exceeded|quota/i.test(text);
      return new Response(JSON.stringify({ ok: false, error: msg, budgetExceeded, status: r.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try common shapes: { data: [{ url }] }, { url }, { video: { url } }
    const url = parsed?.data?.[0]?.url
      || parsed?.url
      || parsed?.video?.url
      || parsed?.output?.[0]?.url
      || null;
    const b64 = parsed?.data?.[0]?.b64_video || parsed?.b64_video || null;
    if (!url && !b64) {
      return new Response(JSON.stringify({ ok: false, error: "Resposta sem URL de vídeo", raw: parsed ?? text.slice(0, 400) }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, url, b64, model: targetModel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
