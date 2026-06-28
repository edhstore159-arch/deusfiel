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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { prompt, durationSeconds, aspectRatio, overrideKey, model } = await req.json();
    const key = (typeof overrideKey === "string" && overrideKey.trim().startsWith("sk-emergent"))
      ? overrideKey.trim()
      : Deno.env.get("EMERGENT_API_KEY");
    if (!key) return json({ ok: false, error: "EMERGENT_API_KEY ausente. Informe uma chave Emergent." });
    if (!prompt || typeof prompt !== "string") return json({ ok: false, error: "prompt obrigatório" });

    const seconds = Math.min(8, Math.max(4, Number(durationSeconds) || 6));
    const ratio = aspectRatio === "16:9" ? "16:9" : "9:16";
    const size = sizeFor(ratio);
    const targetModel = (typeof model === "string" && model) || "vertex_ai/veo-3.1-fast";

    const auth = { Authorization: `Bearer ${key}` };

    // 1) create job
    const createRes = await fetch(`${BASE}/llm/videos`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ model: targetModel, prompt, seconds, size }),
    });
    const createText = await createRes.text();
    let created: any = null;
    try { created = JSON.parse(createText); } catch { /* keep text */ }
    if (!createRes.ok) {
      const msg = created?.error?.message || created?.detail || createText.slice(0, 400);
      const budgetExceeded = /budget|exceed|quota|daily_limit/i.test(createText);
      return json({ ok: false, error: msg, budgetExceeded, status: createRes.status });
    }
    const jobId: string | undefined = created?.id;
    if (!jobId) return json({ ok: false, error: "Resposta sem id de job", raw: created ?? createText.slice(0, 400) });

    // 2) poll until completed (max ~5 min)
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
        const budgetExceeded = /budget|exceed|quota|daily_limit/i.test(msg);
        return json({ ok: false, error: msg, budgetExceeded, status: pollRes.status });
      }
      status = String(lastBody?.status || status);
    }
    if (status !== "completed") {
      return json({ ok: false, error: `Job ${status} (timeout ou falha)`, raw: lastBody });
    }

    // 3) download bytes
    const contentRes = await fetch(`${BASE}/llm/videos/${jobId}/content`, { headers: auth });
    if (!contentRes.ok) {
      const errText = await contentRes.text();
      const budgetExceeded = /budget|exceed|quota|daily_limit/i.test(errText);
      return json({ ok: false, error: `Download falhou: ${errText.slice(0, 300)}`, budgetExceeded, status: contentRes.status });
    }
    const buf = new Uint8Array(await contentRes.arrayBuffer());
    if (buf.byteLength < 1024) {
      return json({ ok: false, error: "Vídeo retornado vazio" });
    }
    const b64 = bytesToBase64(buf);
    return json({ ok: true, b64, model: targetModel, bytes: buf.byteLength });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
