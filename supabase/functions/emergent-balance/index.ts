// Emergent balance/spend probe — extracts LiteLLM headers from a cheap call.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const key = Deno.env.get("EMERGENT_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: "EMERGENT_API_KEY ausente" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch("https://integrations.emergentagent.com/llm/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "vertex_ai/gemini-2.5-flash",
        messages: [{ role: "user", content: "ok" }],
        max_tokens: 1,
      }),
    });
    const text = await r.text();
    const h: Record<string, string> = {};
    r.headers.forEach((v, k) => { if (/litellm|budget|spend|remaining|ratelimit/i.test(k)) h[k] = v; });
    const spend = parseFloat(h["x-litellm-key-spend"] || "");
    const maxBudget = parseFloat(h["x-litellm-key-max-budget"] || "");
    let budgetExceeded = false;
    let parsedError: string | null = null;
    if (!r.ok) {
      parsedError = text.slice(0, 400);
      if (/budget|exceeded/i.test(text)) budgetExceeded = true;
    }
    const remaining = !isNaN(spend) && !isNaN(maxBudget) ? Math.max(0, maxBudget - spend) : null;
    return new Response(JSON.stringify({
      ok: true,
      status: r.status,
      spend: isNaN(spend) ? null : spend,
      maxBudget: isNaN(maxBudget) ? null : maxBudget,
      remaining,
      budgetExceeded,
      headers: h,
      error: parsedError,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    clearTimeout(t);
  }
});
