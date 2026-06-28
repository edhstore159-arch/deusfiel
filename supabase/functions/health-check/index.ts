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

async function checkEmergentImage() {
  const key = Deno.env.get("EMERGENT_API_KEY");
  if (!key) return { configured: false, ok: false, error: "EMERGENT_API_KEY ausente" };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 25000);
  try {
    const r = await fetch("https://integrations.emergentagent.com/llm/images/generations", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-image-1", prompt: "a red apple, photorealistic", size: "1024x1024", n: 1 }),
    });
    const text = await r.text();
    if (!r.ok) return { configured: true, ok: false, status: r.status, error: text.slice(0, 300) };
    let hasImage = false;
    try { hasImage = !!JSON.parse(text)?.data?.[0]?.b64_json; } catch { /* noop */ }
    return { configured: true, ok: hasImage, status: r.status, hasImage };
  } catch (e) {
    return { configured: true, ok: false, error: String((e as Error)?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

async function checkEmergentEdit() {
  const key = Deno.env.get("EMERGENT_API_KEY");
  if (!key) return { configured: false, ok: false, error: "EMERGENT_API_KEY ausente" };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 35000);
  try {
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", "turn the reference image blue, keep the same simple shape");
    form.append("size", "1024x1024");
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p94AAAAASUVORK5CYII=";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    form.append("image", new Blob([bytes], { type: "image/png" }), "reference.png");
    const r = await fetch("https://integrations.emergentagent.com/llm/images/edits", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const text = await r.text();
    if (!r.ok) return { configured: true, ok: false, status: r.status, error: text.slice(0, 300) };
    let hasImage = false;
    try { hasImage = !!JSON.parse(text)?.data?.[0]?.b64_json || !!JSON.parse(text)?.data?.[0]?.url; } catch { /* noop */ }
    return { configured: true, ok: hasImage, status: r.status, hasImage };
  } catch (e) {
    return { configured: true, ok: false, error: String((e as Error)?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

async function checkOpenAIImage() {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return { configured: false, ok: false, error: "OPENAI_API_KEY ausente" };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 25000);
  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-image-1", prompt: "a red apple, photorealistic", size: "1024x1024", n: 1 }),
    });
    const text = await r.text();
    if (!r.ok) return { configured: true, ok: false, status: r.status, error: text.slice(0, 300) };
    let hasImage = false;
    try { hasImage = !!JSON.parse(text)?.data?.[0]?.b64_json || !!JSON.parse(text)?.data?.[0]?.url; } catch { /* noop */ }
    return { configured: true, ok: hasImage, status: r.status, hasImage };
  } catch (e) {
    return { configured: true, ok: false, error: String((e as Error)?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const deep = url.searchParams.get("deep") === "1";
  const ollama = await checkOllama();
  const emergentImage = deep ? await checkEmergentImage() : { configured: !!Deno.env.get("EMERGENT_API_KEY"), note: "passe ?deep=1 para testar geração real" };
  const emergentEdit = deep ? await checkEmergentEdit() : { configured: !!Deno.env.get("EMERGENT_API_KEY"), note: "passe ?deep=1 para testar edição real" };
  const openaiImage = deep ? await checkOpenAIImage() : { configured: !!Deno.env.get("OPENAI_API_KEY"), note: "passe ?deep=1 para testar geração real" };
  const providers = {
    ollama,
    lovable: { configured: !!Deno.env.get("LOVABLE_API_KEY") },
    gemini: { configured: !!Deno.env.get("GEMINI_API_KEY") },
    emergent: { configured: !!Deno.env.get("EMERGENT_API_KEY") },
    emergentImage,
    emergentEdit,
    openai: { configured: !!Deno.env.get("OPENAI_API_KEY") },
    openaiImage,
  };
  return new Response(JSON.stringify({ ok: true, providers }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
