const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const fccUrl = Deno.env.get("FCC_URL") || "https://unabashed-vertical-crispness.ngrok-free.dev";
    const fccToken = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
    const fccModel = Deno.env.get("FCC_MODEL") || "claude-3-freecc-no-thinking/opencode/nemotron-3-ultra-free";

    const res = await fetch(`${fccUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": fccToken,
        "Authorization": `Bearer ${fccToken}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || fccModel,
        max_tokens: body.max_tokens || 4000,
        system: body.system || "",
        messages: Array.isArray(body.messages) ? body.messages : [],
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `FCC HTTP ${res.status}: ${text.slice(0, 300)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(text, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});