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

    if (provider === "gemini") {
      const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
      if (!geminiKey) {
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const geminiModel = body.model || "gemini-2.5-flash";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
      const systemPrompt = body.system || "";
      const userMessages = Array.isArray(body.messages) ? body.messages : [];
      const contents = userMessages
        .filter((m: any) => m.role !== "system")
        .map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
        }));
      const geminiBody: any = { contents };
      if (systemPrompt) {
        geminiBody.systemInstruction = { parts: [{ text: systemPrompt }] };
      }
      if (body.response_format?.type === "json_object") {
        geminiBody.generationConfig = { responseMimeType: "application/json" };
      }
      if (typeof body.temperature === "number") {
        geminiBody.generationConfig = { ...geminiBody.generationConfig, temperature: body.temperature };
      }
      if (typeof body.max_tokens === "number") {
        geminiBody.generationConfig = { ...geminiBody.generationConfig, maxOutputTokens: body.max_tokens };
      }
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
      const geminiData = await geminiRes.json().catch(() => null);
      if (!geminiRes.ok) {
        const errMsg = geminiData?.error?.message || geminiData?.error || `HTTP ${geminiRes.status}`;
        return new Response(JSON.stringify({ error: `Gemini: ${errMsg}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = geminiData?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
      return new Response(JSON.stringify({
        choices: [{ message: { role: "assistant", content: text } }],
        model: geminiModel,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fccUrl = Deno.env.get("FCC_URL") || "https://fcc-server.onrender.com";
    const fccToken = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
    const fccModel = Deno.env.get("FCC_MODEL") || "anthropic/claude-sonnet-4";

    const rawModel = body.model || fccModel;
    const modelMap: Record<string, string> = {
      "claude-3-5-sonnet-20241022": "anthropic/claude-sonnet-4",
      "claude-3-5-haiku-20241022": "anthropic/claude-haiku-4-5",
      "claude-3-7-sonnet-20250219": "anthropic/claude-3-7-sonnet-20250219",
      "claude-sonnet-4": "anthropic/claude-sonnet-4",
      "claude-haiku-4-5": "anthropic/claude-haiku-4-5",
      "claude-opus-4-5": "anthropic/claude-opus-4-5-20251101",
    };
    const baseName = rawModel.replace(/^anthropic\//, "");
    const fccModelName = modelMap[baseName] || (rawModel.includes("/") ? rawModel : `anthropic/${rawModel}`);

    const res = await fetch(`${fccUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": fccToken,
        "Authorization": `Bearer ${fccToken}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: fccModelName,
        max_tokens: body.max_tokens || 8000,
        system: body.system || "",
        messages: userMessages,
      }),
    });

    const rawText = await res.text();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `FCC HTTP ${res.status}: ${rawText.slice(0, 300)}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let cleanedText = rawText;
    try {
      const fccData = JSON.parse(rawText);
      if (fccData.type === "message" && Array.isArray(fccData.content)) {
        const textParts = fccData.content
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text);
        fccData.content = [{ type: "text", text: textParts.join("") }];
        cleanedText = JSON.stringify(fccData);
      }
    } catch {}

    return new Response(cleanedText, {
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
