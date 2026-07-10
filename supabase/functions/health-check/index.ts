import { requireAdmin } from "../_shared/auth.ts";
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
    const r = await fetch("https://integrations.emergentagent.com/llm/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "vertex_ai/gemini-2.5-flash-image",
        modalities: ["image", "text"],
        messages: [{ role: "user", content: "Generate a red apple image, photorealistic." }],
      }),
    });
    const text = await r.text();
    if (!r.ok) return { configured: true, ok: false, status: r.status, error: text.slice(0, 300) };
    let hasImage = false;
    try {
      const msg = JSON.parse(text)?.choices?.[0]?.message;
      hasImage = !!msg?.images?.[0]?.image_url?.url || /data:image\//.test(String(msg?.content || ""));
    } catch { /* noop */ }
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
    const r = await fetch("https://integrations.emergentagent.com/llm/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "vertex_ai/gemini-2.5-flash-image",
        modalities: ["image", "text"],
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Turn the reference image blue, keep the same simple shape. Return one image only." },
            { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAABLElEQVR4nO3RQREAIAzAMIZ/zyAjjzUKetd5J9LVAds1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgH8/hAf+bYtS1AAAAAElFTkSuQmCC" } },
          ],
        }],
      }),
    });
    const text = await r.text();
    if (!r.ok) return { configured: true, ok: false, status: r.status, error: text.slice(0, 300) };
    let hasImage = false;
    try {
      const msg = JSON.parse(text)?.choices?.[0]?.message;
      hasImage = !!msg?.images?.[0]?.image_url?.url || /data:image\//.test(String(msg?.content || ""));
    } catch { /* noop */ }
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
  const _auth_res = await requireAdmin(req);
  if (_auth_res instanceof Response) return _auth_res;
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
