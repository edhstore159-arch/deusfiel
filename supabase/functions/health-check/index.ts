// Health-check endpoint: verifica se Ollama e demais providers estão respondendo.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function checkOllama() {
  const url = Deno.env.get("OLLAMA_URL")?.trim().replace(/\/+$/, "").replace(/\/api\/(generate|chat|tags)$/, "");
  const key = Deno.env.get("OLLAMA_API_KEY");
  const model = Deno.env.get("OLLAMA_MODEL") || "qwen3:8b";
  if (!url) return { configured: false, ok: false, error: "OLLAMA_URL ausente" };
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(host) || host.endsWith(".local")) {
      return { configured: true, ok: false, error: "OLLAMA_URL precisa ser pública (ex: ngrok)", url };
    }
  } catch {
    return { configured: true, ok: false, error: "OLLAMA_URL inválida", url };
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(`${url}/api/tags`, {
      signal: controller.signal,
      headers: {
        "ngrok-skip-browser-warning": "true",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
    });
    const text = await r.text();
    if (!r.ok) return { configured: true, ok: false, status: r.status, error: text.slice(0, 200), url, model };
    let models: string[] = [];
    try {
      const j = JSON.parse(text);
      models = (j?.models || []).map((m: any) => m?.name).filter(Boolean);
    } catch { /* noop */ }
    return { configured: true, ok: true, url, model, models, modelAvailable: models.length === 0 || models.includes(model) };
  } catch (e) {
    return { configured: true, ok: false, error: String((e as Error)?.message || e), url, model };
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ollama = await checkOllama();
  const providers = {
    ollama,
    lovable: { configured: !!Deno.env.get("LOVABLE_API_KEY") },
    gemini: { configured: !!Deno.env.get("GEMINI_API_KEY") },
    emergent: { configured: !!Deno.env.get("EMERGENT_API_KEY") },
    openai: { configured: !!Deno.env.get("OPENAI_API_KEY") },
  };
  return new Response(JSON.stringify({ ok: true, providers }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
