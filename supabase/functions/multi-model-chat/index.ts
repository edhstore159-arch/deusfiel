// Multi-model chat: Nemotron (NVIDIA NIM direto), Claude FCC (via ngrok), Emergent API.
// Suporta Nemotron, ChatGPT, Gemini e Claude via Emergent. Ollama é chamado direto pelo cliente.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMERGENT_BASE = "https://integrations.emergentagent.com/llm/chat/completions";

const FCC_BASE_URL = Deno.env.get("FCC_BASE_URL") || "https://unabashed-vertical-crispness.ngrok-free.dev";
const FCC_AUTH_TOKEN = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
const FCC_MODEL = Deno.env.get("FCC_MODEL") || "claude-3-freecc-no-thinking/nvidia_nim/nvidia/nemotron-3-super-120b-a12b";

// NVIDIA NIM API direto (sem ngrok)
const NVIDIA_NIM_API_KEY = Deno.env.get("NVIDIA_NIM_API_KEY") || "";
const NVIDIA_NIM_BASE = "https://integrate.api.nvidia.com/v1";
const NEMOTRON_MODEL = "nvidia/nemotron-3-super-120b-a12b";

// Maps frontend model IDs to Emergent candidate model names (tries each in order)
const MODEL_CANDIDATES: Record<string, string[]> = {
  "openai/gpt-5.5": ["openai/gpt-5.5", "gpt-5.5", "gpt-4o-mini"],
  "openai/gpt-5-mini": ["openai/gpt-5-mini", "gpt-5-mini", "gpt-4o-mini"],
  "google/gemini-2.5-pro": ["google/gemini-2.5-pro", "gemini-2.5-pro", "gpt-4o-mini"],
  "google/gemini-2.5-flash": ["google/gemini-2.5-flash", "gemini-2.5-flash", "gpt-4o-mini"],
  "anthropic/claude-sonnet-4-20250514": [
    "anthropic/claude-sonnet-4-20250514",
    "claude-sonnet-4-20250514",
    "claude-sonnet-4-5",
    "claude-sonnet-4-5-20250929",
    "claude-haiku-4-5",
    "gpt-4o-mini",
  ],
};

const FALLBACK_CANDIDATES = ["gpt-4o-mini"];

async function tryEmergent(key: string, model: string, payload: any): Promise<Response> {
  return fetch(EMERGENT_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ ...payload, model }),
  });
}

async function tryClaudeFCC(messages: any[], system?: string): Promise<Response> {
  const apiMessages = messages.map((m: any) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || ""),
  }));
  const resp = await fetch(`${FCC_BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": FCC_AUTH_TOKEN,
      "Authorization": `Bearer ${FCC_AUTH_TOKEN}`,
      "anthropic-version": "2023-06-01",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({
      model: FCC_MODEL,
      max_tokens: 4000,
      stream: true,
      system: system || "",
      messages: apiMessages,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return new Response(JSON.stringify({ error: `Claude FCC ${resp.status}: ${text.slice(0, 200)}` }), {
      status: resp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // Stream Anthropic SSE → converter para OpenAI SSE
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  const sseChunks: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        // Anthropic streaming: content_block_delta com text
        if (json.type === "content_block_delta" && json.delta?.text) {
          fullText += json.delta.text;
          sseChunks.push(`data: ${JSON.stringify({ choices: [{ delta: { content: json.delta.text } }] })}\n\n`);
        }
      } catch {}
    }
  }
  // Retorna como SSE stream
  if (sseChunks.length > 0) {
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of sseChunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
    });
  }
  // Fallback: se não conseguiu streamar, retorna texto completo
  const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: fullText || "Resposta vazia do Claude FCC" } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(sseData, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}

// NVIDIA NIM API direto — streaming nativo, sem ngrok
async function tryNemotronDirect(messages: any[], system?: string): Promise<Response> {
  if (!NVIDIA_NIM_API_KEY) {
    return new Response(JSON.stringify({ error: "NVIDIA_NIM_API_KEY não configurada. Adicione como secret no Supabase." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const apiMessages = [
    ...(system ? [{ role: "system", content: String(system) }] : []),
    ...messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || ""),
    })),
  ];
  const resp = await fetch(`${NVIDIA_NIM_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${NVIDIA_NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: NEMOTRON_MODEL,
      messages: apiMessages,
      max_tokens: 4096,
      stream: true,
      temperature: 0.7,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return new Response(JSON.stringify({ error: `Nemotron NIM ${resp.status}: ${text.slice(0, 200)}` }), {
      status: resp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // NVIDIA NIM usa formato OpenAI SSE — streaming direto
  return new Response(resp.body, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, model, system } = await req.json();
    if (!Array.isArray(messages) || !messages.length) {
      return new Response(JSON.stringify({ error: "messages obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rota dedicada: Nemotron via NVIDIA NIM direto (sem ngrok)
    if (model === "nemotron") {
      console.log("Rota direta: Nemotron via NVIDIA NIM");
      try {
        const nemotronResp = await tryNemotronDirect(messages, system);
        if (nemotronResp.ok) return nemotronResp;
        const errBody = await nemotronResp.text().catch(() => "");
        console.warn("Nemotron NIM falhou, tentando Claude FCC como fallback...");
        try {
          const claudeResp = await tryClaudeFCC(messages, system);
          if (claudeResp.ok) return claudeResp;
        } catch {}
        const sseErr = `data: ${JSON.stringify({ error: `Nemotron ${nemotronResp.status}: ${errBody.slice(0, 200)}` })}\n\ndata: [DONE]\n\n`;
        return new Response(sseErr, {
          status: nemotronResp.status === 200 ? 500 : nemotronResp.status,
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      } catch (e) {
        const msg = String((e as Error)?.message || e);
        const sseErr = `data: ${JSON.stringify({ error: `Nemotron falhou: ${msg}` })}\n\ndata: [DONE]\n\n`;
        return new Response(sseErr, {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
    }

    // Rota dedicada: Claude FCC via ngrok (não precisa de Emergent)
    if (model === "claude-fcc") {
      console.log("Rota direta: Claude FCC via ngrok");
      try {
        const claudeResp = await tryClaudeFCC(messages, system);
        if (claudeResp.ok) return claudeResp;
        // Encapsula erro do FCC num envelope SSE pro cliente mostrar
        const errBody = await claudeResp.text().catch(() => "");
        const sseErr = `data: ${JSON.stringify({ error: `Claude FCC ${claudeResp.status}: ${errBody.slice(0, 200)}` })}\n\ndata: [DONE]\n\n`;
        return new Response(sseErr, {
          status: claudeResp.status === 200 ? 500 : claudeResp.status,
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      } catch (e) {
        const msg = String((e as Error)?.message || e);
        const sseErr = `data: ${JSON.stringify({ error: `Claude FCC falhou: ${msg}` })}\n\ndata: [DONE]\n\n`;
        return new Response(sseErr, {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
    }

    const emergentKey = Deno.env.get("EMERGENT_API_KEY") || Deno.env.get("EMERGENT_LLM_KEY") || "";
    if (!emergentKey) {
      return new Response(JSON.stringify({ error: "Chave EMERGENT_API_KEY ausente nas secrets." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidates = MODEL_CANDIDATES[model] || [...(model ? [model] : []), ...FALLBACK_CANDIDATES];

    const payload = {
      stream: true,
      messages: [
        ...(system ? [{ role: "system", content: String(system) }] : []),
        ...messages.map((m: any) => ({ role: m.role, content: String(m.content ?? "") })),
      ],
    };

    let lastError = "";
    let lastStatus = 0;

    for (const candidate of candidates) {
      const upstream = await tryEmergent(emergentKey, candidate, payload);

      if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => "");
        lastStatus = upstream.status;
        lastError = text || `HTTP ${upstream.status}`;
        // If 400/404 (model not found), try next candidate
        if (upstream.status === 400 || upstream.status === 404) {
          console.warn(`Emergent rejeitou modelo ${candidate}, tentando próximo...`);
          continue;
        }
        // Budget exceeded or other errors — try Claude FCC fallback
        console.warn(`Emergent falhou (${upstream.status}), tentando Claude FCC...`);
        try {
          const claudeResp = await tryClaudeFCC(messages, system);
          if (claudeResp.ok) return claudeResp;
          console.warn("Claude FCC também falhou:", await claudeResp.text().catch(() => ""));
        } catch (claudeErr) {
          console.warn("Claude FCC erro:", claudeErr);
        }
        // Return the original Emergent error
        let msg = lastError;
        if (upstream.status === 429) msg = "Limite de requisições excedido. Tente em instantes.";
        if (upstream.status === 401) msg = "Chave de API inválida. Verifique EMERGENT_API_KEY.";
        return new Response(JSON.stringify({ error: msg }), {
          status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Success — stream the response
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // All Emergent candidates exhausted — try Claude FCC as last resort
    console.warn("Todos os modelos Emergent falharam, tentando Claude FCC como último recurso...");
    try {
      const claudeResp = await tryClaudeFCC(messages, system);
      if (claudeResp.ok) return claudeResp;
    } catch (claudeErr) {
      console.warn("Claude FCC último recurso falhou:", claudeErr);
    }

    return new Response(JSON.stringify({ error: `Emergent e Claude FCC falharam. Último erro Emergent: ${lastError.slice(0, 200)}` }), {
      status: lastStatus || 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
