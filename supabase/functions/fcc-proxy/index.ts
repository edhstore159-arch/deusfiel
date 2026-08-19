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
    const provider = body.provider || "fcc";
    const userMessages = Array.isArray(body.messages) ? body.messages : [];
    const systemPrompt = body.system || "";
    const messages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...userMessages]
      : userMessages;

    if (provider === "opencode") {
      const zenUrl = Deno.env.get("ZEN_URL") || "https://opencode.ai/zen/v1/chat/completions";
      const zenKey = Deno.env.get("ZEN_API_KEY") || "";
      const zenModel = Deno.env.get("ZEN_MODEL") || "big-pickle";
      const zenRes = await fetch(zenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${zenKey}`,
        },
        body: JSON.stringify({
          model: body.model || zenModel,
          max_tokens: body.max_tokens || 8000,
          messages,
        }),
      });
      const zenData = await zenRes.json().catch(() => null);
      if (!zenRes.ok || zenData?.error) {
        const errMsg = zenData?.error?.message || zenData?.error || `HTTP ${zenRes.status}`;
        return new Response(JSON.stringify({ error: `OpenCode: ${errMsg}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(zenData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (provider === "emergent") {
      const emUrl = Deno.env.get("EMERGENT_URL") || "https://integrations.emergentagent.com/llm/v1/chat/completions";
      const emKey = Deno.env.get("EMERGENT_API_KEY") || "";
      const emModel = body.model || "gpt-4o";
      const emRes = await fetch(emUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${emKey}`,
        },
        body: JSON.stringify({
          model: emModel,
          max_tokens: body.max_tokens || 8000,
          messages,
        }),
      });
      const emData = await emRes.json().catch(() => null);
      if (!emRes.ok || emData?.error) {
        const errMsg = emData?.error?.message || emData?.error || `HTTP ${emRes.status}`;
        return new Response(JSON.stringify({ error: `Emergent: ${errMsg}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(emData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orKey = Deno.env.get("OPENROUTER_API_KEY") || "";
    const orModel = body.model || "nvidia/nemotron-3-super-120b-a12b:free";

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${orKey}`,
      },
      body: JSON.stringify({
        model: orModel,
        max_tokens: body.max_tokens || 8000,
        messages,
      }),
    });

    const orData = await res.json().catch(() => null);
    if (!res.ok || orData?.error) {
      const errMsg = orData?.error?.message || orData?.error || `HTTP ${res.status}`;
      return new Response(JSON.stringify({ error: `OpenRouter: ${errMsg}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(orData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
