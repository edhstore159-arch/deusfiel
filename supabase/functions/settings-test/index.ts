// settings-test: verifica status real das chaves usadas pelo backend e testa
// chamadas reais (chat + imagem) através do Lovable AI Gateway.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const secretsStatus = () => ({
  lovable: !!Deno.env.get("LOVABLE_API_KEY"),
  openai: !!Deno.env.get("OPENAI_API_KEY"),
  emergent: !!Deno.env.get("EMERGENT_API_KEY"),
  gemini: !!Deno.env.get("GEMINI_API_KEY"),
});

async function testChat() {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { ok: false, error: "LOVABLE_API_KEY ausente no backend." };
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "settings-test",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: "Diga apenas: ok" }],
        max_tokens: 10,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: `Gateway ${r.status}: ${data?.error?.message || JSON.stringify(data).slice(0, 200)}` };
    const text = data?.choices?.[0]?.message?.content ?? "";
    return { ok: true, model: data?.model || "google/gemini-2.5-flash-lite", reply: String(text).slice(0, 120) };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) };
  }
}

async function testImage() {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { ok: false, error: "LOVABLE_API_KEY ausente no backend." };
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "settings-test",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: "gere uma pequena imagem de teste: círculo dourado" }],
        modalities: ["image", "text"],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: `Gateway ${r.status}: ${data?.error?.message || JSON.stringify(data).slice(0, 200)}` };
    const images = data?.choices?.[0]?.message?.images;
    const hasImage = Array.isArray(images) && images.length > 0 && !!images[0]?.image_url?.url;
    if (!hasImage) return { ok: false, error: "Gateway respondeu sem imagem." };
    return { ok: true, model: data?.model || "google/gemini-2.5-flash-image" };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || (req.method === "POST" ? await req.json().catch(() => ({})).then((b: any) => b?.action) : null);

  if (!action || action === "status") {
    return json({ ok: true, secrets: secretsStatus() });
  }
  if (action === "text" || action === "chat") {
    const r = await testChat();
    return json({ ...r, secrets: secretsStatus() });
  }
  if (action === "image") {
    const r = await testImage();
    return json({ ...r, secrets: secretsStatus() });
  }
  return json({ ok: false, error: `ação desconhecida: ${action}` }, 400);
});
