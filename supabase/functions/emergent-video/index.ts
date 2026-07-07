// Emergent video generation proxy.
// Uses OpenAI-compatible Videos API exposed by Emergent at:
//   POST   /llm/videos                    -> create job
//   GET    /llm/videos/{id}               -> poll status
//   GET    /llm/videos/{id}/content       -> download bytes
//
// Accepts a prompt + optional duration/aspect/model and an optional override key.
// Polls until completion (max ~5min) then returns the video as base64 data URL.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://integrations.emergentagent.com";

const sizeFor = (ratio: string) => (ratio === "16:9" ? "1280x720" : "720x1280");

const bytesToBase64 = (bytes: Uint8Array) => {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
};

// ===== Replicate fallback (Kling v2.1 master — top realism) =====
async function replicateFallback(prompt: string, ratio: "9:16" | "16:9", seconds: number) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const replicateKey = Deno.env.get("REPLICATE_API_KEY");
  if (!lovableKey || !replicateKey) {
    return { ok: false, error: "Replicate connector não configurado" };
  }
  const GW = "https://connector-gateway.lovable.dev/replicate/v1";
  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": replicateKey,
    "Content-Type": "application/json",
  };
  const duration = seconds >= 8 ? 10 : 5;
  const createRes = await fetch(`${GW}/models/kwaivgi/kling-v2.1-master/predictions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ input: { prompt, aspect_ratio: ratio, duration, negative_prompt: "blurry, low quality, deformed, extra fingers, watermark, text overlay" } }),
  });
  const createText = await createRes.text();
  let pred: any; try { pred = JSON.parse(createText); } catch { pred = null; }
  if (!createRes.ok || !pred?.id) {
    return { ok: false, error: `Replicate falhou: ${pred?.detail || createText.slice(0, 300)}` };
  }
  const deadline = Date.now() + 15 * 60 * 1000;
  let status = String(pred.status || "starting");
  let last: any = pred;
  let i = 0;
  while (status !== "succeeded" && status !== "failed" && status !== "canceled" && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, i++ < 5 ? 3000 : 10000));
    const r = await fetch(`${GW}/predictions/${pred.id}`, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": replicateKey } });
    const t = await r.text();
    try { last = JSON.parse(t); } catch { last = t; }
    status = String(last?.status || status);
  }
  if (status !== "succeeded") return { ok: false, error: `Replicate ${status}: ${last?.error || ""}` };
  const out = Array.isArray(last.output) ? last.output[0] : last.output;
  if (!out || typeof out !== "string") return { ok: false, error: "Replicate sem output" };
  const dl = await fetch(out);
  if (!dl.ok) return { ok: false, error: "Falha ao baixar vídeo do Replicate" };
  const buf = new Uint8Array(await dl.arrayBuffer());
  const b64 = bytesToBase64(buf);
  return { ok: true, b64, model: "kwaivgi/kling-v2.1-master", bytes: buf.byteLength, provider: "replicate" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { prompt, durationSeconds, aspectRatio, overrideKey, model, provider } = await req.json();
    if (!prompt || typeof prompt !== "string") return json({ ok: false, error: "prompt obrigatório" });
    const seconds = Math.min(10, Math.max(4, Number(durationSeconds) || 6));
    const ratio = aspectRatio === "16:9" ? "16:9" : "9:16";

    // Direct Replicate route
    if (provider === "replicate") {
      const r = await replicateFallback(prompt, ratio as any, seconds);
      return json(r);
    }

    const key = (typeof overrideKey === "string" && overrideKey.trim().startsWith("sk-emergent"))
      ? overrideKey.trim()
      : Deno.env.get("EMERGENT_API_KEY");
    if (!key) {
      const r = await replicateFallback(prompt, ratio as any, seconds);
      return json(r);
    }

    const size = sizeFor(ratio);
    const targetModel = (typeof model === "string" && model) || "vertex_ai/veo-3.1-fast";
    const auth = { Authorization: `Bearer ${key}` };

    const createRes = await fetch(`${BASE}/llm/videos`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ model: targetModel, prompt, seconds: Math.min(8, seconds), size }),
    });
    const createText = await createRes.text();
    let created: any = null; try { created = JSON.parse(createText); } catch {}
    const budgetExceeded = /budget|exceed|quota|daily.?(limit|spend)/i.test(createText);

    if (!createRes.ok) {
      if (budgetExceeded) {
        const r = await replicateFallback(prompt, ratio as any, seconds);
        if (r.ok) return json({ ...r, fallbackReason: "emergent_budget_exceeded" });
        return json({ ok: false, error: `Emergent sem cota e Replicate falhou: ${r.error}`, budgetExceeded: true, status: createRes.status });
      }
      const msg = created?.error?.message || created?.detail || createText.slice(0, 400);
      return json({ ok: false, error: msg, budgetExceeded, status: createRes.status });
    }
    const jobId: string | undefined = created?.id;
    if (!jobId) return json({ ok: false, error: "Resposta sem id de job", raw: created ?? createText.slice(0, 400) });

    const deadline = Date.now() + 5 * 60 * 1000;
    let status = String(created?.status || "processing");
    let lastBody: any = created;
    while (status !== "completed" && status !== "failed" && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollRes = await fetch(`${BASE}/llm/videos/${jobId}`, { headers: auth });
      const pollText = await pollRes.text();
      try { lastBody = JSON.parse(pollText); } catch { lastBody = pollText; }
      if (lastBody?.error) {
        const msg = lastBody.error.message || JSON.stringify(lastBody.error);
        const be = /budget|exceed|quota|daily.?(limit|spend)/i.test(msg);
        if (be) {
          const r = await replicateFallback(prompt, ratio as any, seconds);
          if (r.ok) return json({ ...r, fallbackReason: "emergent_budget_exceeded" });
        }
        return json({ ok: false, error: msg, budgetExceeded: be, status: pollRes.status });
      }
      status = String(lastBody?.status || status);
    }
    if (status !== "completed") return json({ ok: false, error: `Job ${status} (timeout)`, raw: lastBody });

    const contentRes = await fetch(`${BASE}/llm/videos/${jobId}/content`, { headers: auth });
    if (!contentRes.ok) {
      const errText = await contentRes.text();
      return json({ ok: false, error: `Download falhou: ${errText.slice(0, 300)}`, status: contentRes.status });
    }
    const buf = new Uint8Array(await contentRes.arrayBuffer());
    if (buf.byteLength < 1024) return json({ ok: false, error: "Vídeo retornado vazio" });
    return json({ ok: true, b64: bytesToBase64(buf), model: targetModel, bytes: buf.byteLength, provider: "emergent" });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
