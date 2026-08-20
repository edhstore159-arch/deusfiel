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

    if (provider === "ollama") {
      const ollamaUrl = Deno.env.get("OLLAMA_URL") || "https://unabashed-vertical-crispness.ngrok-free.dev";
      const ollamaModel = body.model || "qwen2.5:3b-instruct";
      const ollamaRes = await fetch(`${ollamaUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          model: ollamaModel,
          max_tokens: body.max_tokens || 8000,
          messages,
        }),
      });
      const ollamaData = await ollamaRes.json().catch(() => null);
      if (!ollamaRes.ok || ollamaData?.error) {
        const errMsg = ollamaData?.error?.message || ollamaData?.error || `HTTP ${ollamaRes.status}`;
        return new Response(JSON.stringify({ error: `Ollama: ${errMsg}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(ollamaData), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fccUrl = Deno.env.get("FCC_URL") || "https://fcc-server.onrender.com";
    const fccToken = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
    const fccModel = Deno.env.get("FCC_MODEL") || "nvidia_nim/nvidia/nemotron-3-super-120b-a12b";

    const res = await fetch(`${fccUrl}/v1/messages?beta=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": fccToken,
        "Authorization": `Bearer ${fccToken}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || fccModel,
        max_tokens: body.max_tokens || 8000,
        system: body.system || "",
        messages: userMessages,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `FCC HTTP ${res.status}: ${text.slice(0, 300)}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(text, {
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
