// Multi-model chat: Emergent API (primario) → OpenRouter (fallback) → Claude FCC (ultimo recurso).
// Fallback automatico: quando Emergent acabar credito, usa OpenRouter.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMERGENT_BASE = "https://integrations.emergentagent.com/llm/chat/completions";

const ZEN_BASE = "https://opencode.ai/zen/v1/chat/completions";
const ZEN_KEY = Deno.env.get("ZEN_API_KEY") || "sk-xxtVUim9LH01AvL5ZYfecVTWXP9IbHLLrowGXrCTlQMwf5fndFqq5bsFeHURbNl8";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const OPENROUTER_FALLBACK_MODELS = [
  "nousresearch/hermes-4-70b",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-26b-a4b-it:free",
];

const FCC_BASE_URL = Deno.env.get("FCC_BASE_URL") || "https://unabashed-vertical-crispness.ngrok-free.dev";
const FCC_AUTH_TOKEN = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
const FCC_MODEL = Deno.env.get("FCC_MODEL") || "claude-3-5-sonnet-20241022";

// NVIDIA NIM API direto (sem ngrok)
const NVIDIA_NIM_API_KEY = Deno.env.get("NVIDIA_NIM_API_KEY") || "";
const NVIDIA_NIM_BASE = "https://integrate.api.nvidia.com/v1";
const NEMOTRON_MODEL = "nvidia/nemotron-3-super-120b-a12b";

// Maps frontend model IDs to Emergent candidate model names (tries each in order)
const MODEL_CANDIDATES: Record<string, string[]> = {
  "big-pickle": ["big-pickle", "deepseek-v4-flash-free", "nemotron-3-ultra-free"],
  "openai/gpt-5.5": ["gpt-5.5", "gpt-5.4", "gpt-4o", "gpt-4o-mini"],
  "openai/gpt-5-mini": ["gpt-5-mini", "gpt-5-nano", "gpt-4o-mini", "gpt-4o"],
  "google/gemini-2.5-pro": ["gemini-2.5-pro", "gemini-2.5-flash", "gpt-4o-mini"],
  "google/gemini-2.5-flash": ["gemini-2.5-flash", "gemini-2.5-pro", "gpt-4o-mini"],
  "anthropic/claude-sonnet-4-20250514": [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "gpt-4o-mini",
  ],
};

const FALLBACK_CANDIDATES = ["gpt-4o-mini"];

// Converte mensagens com data URLs de imagem para formato apropriado por provedor
function convertMessagesForProvider(messages: any[], provider: "openai" | "anthropic"): any[] {
  return messages.map((m) => {
    const content = m.content;
    if (typeof content === "string" && content.startsWith("data:image/")) {
      const match = content.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        if (provider === "anthropic") {
          return {
            role: m.role,
            content: [{ type: "image", source: { type: "base64", media_type: match[1], data: match[2] } }],
          };
        } else {
          // OpenAI format (Emergent, OpenRouter, NVIDIA NIM, etc.)
          return {
            role: m.role,
            content: [{ type: "image_url", image_url: { url: content } }],
          };
        }
      }
    }
    return { role: m.role, content: String(content ?? "") };
  });
}

async function tryEmergent(key: string, model: string, payload: any): Promise<Response> {
  return fetch(EMERGENT_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ ...payload, model }),
  });
}

async function tryZen(messages: any[], system?: string, model?: string): Promise<Response | null> {
  if (!ZEN_KEY) return null;
  const patchedSystem = system
    ? `INSTRUÇÃO CRÍTICA: Responda SEMPRE em português brasileiro. NUNCA responda em inglês. NÃO inclua raciocínio ou análise. Responda apenas com a resposta final.\n\n${system}`
    : undefined;
  const apiMessages = convertMessagesForProvider([
    ...(patchedSystem ? [{ role: "system", content: patchedSystem }] : []),
    ...messages,
  ], "openai");
  const zenModels = model ? [model, "big-pickle", "deepseek-v4-flash-free"] : ["big-pickle", "deepseek-v4-flash-free"];
  for (const candidate of zenModels) {
    try {
      const resp = await fetch(ZEN_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ZEN_KEY}`,
        },
        body: JSON.stringify({ model: candidate, messages: apiMessages, max_tokens: 8192, stream: true }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.warn(`OpenCode Zen ${candidate} falhou: ${resp.status} ${text.slice(0, 200)}`);
        continue;
      }
      // Verifica se o body é SSE (text/event-stream) ou JSON de erro
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const body = await resp.json().catch(() => ({}));
        const err = (body as any)?.error?.message || (body as any)?.error || "";
        if (err) {
          console.warn(`OpenCode Zen ${candidate} retornou erro: ${err}`);
          continue;
        }
      }
      // SSE stream válido — converte para formato OpenAI SSE
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasContent = false;
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
          if (data === "[DONE]") {
            sseChunks.push("data: [DONE]\n\n");
            continue;
          }
          try {
            const json = JSON.parse(data);
            if (json?.error) {
              console.warn(`Zen stream error: ${json.error}`);
              continue;
            }
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) {
              hasContent = true;
              sseChunks.push(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
            }
          } catch {}
        }
      }
      if (hasContent && sseChunks.length > 0) {
        console.log(`OpenCode Zen OK com ${candidate}`);
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
      console.warn(`OpenCode Zen ${candidate} sem conteúdo válido`);
    } catch (e) {
      console.warn(`OpenCode Zen ${candidate} erro:`, (e as Error)?.message);
    }
  }
  return null;
}

async function tryOpenRouter(messages: any[], system?: string): Promise<Response | null> {
  if (!OPENROUTER_KEY) return null;
  const apiMessages = convertMessagesForProvider([
    ...(system ? [{ role: "system", content: String(system) }] : []),
    ...messages,
  ], "openai");
  for (const candidate of OPENROUTER_FALLBACK_MODELS) {
    try {
      const resp = await fetch(OPENROUTER_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": "https://deusfiel.onrender.com",
          "X-Title": "Kenia Garcia Advocacia",
        },
        body: JSON.stringify({ model: candidate, messages: apiMessages, max_tokens: 8192 }),
      });
      if (resp.ok && resp.body) {
        console.log(`OpenRouter fallback OK com ${candidate}`);
        return resp;
      }
      console.warn(`OpenRouter ${candidate} falhou: ${resp.status}`);
    } catch (e) {
      console.warn(`OpenRouter ${candidate} erro:`, (e as Error)?.message);
    }
  }
  return null;
}

async function tryClaudeFCC(messages: any[], system?: string): Promise<Response> {
  // Converte mensagens para formato Anthropic, suportando imagens (base64 data URLs)
  const apiMessages = messages.map((m: any) => {
    const content = m.content;
    if (typeof content === "string" && content.startsWith("data:image/")) {
      // Imagem em base64
      const match = content.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        return {
          role: m.role === "assistant" ? "assistant" : "user",
          content: [{ type: "image", source: { type: "base64", media_type: match[1], data: match[2] } }],
        };
      }
    }
    return {
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(content || ""),
    };
  });
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
      max_tokens: 8192,
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
  const apiMessages = convertMessagesForProvider([
    ...(system ? [{ role: "system", content: String(system) }] : []),
    ...messages,
  ], "openai");
  const resp = await fetch(`${NVIDIA_NIM_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${NVIDIA_NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: NEMOTRON_MODEL,
      messages: apiMessages,
      max_tokens: 8192,
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

    // Rota dedicada: OpenCode Zen (big-pickle, gratuito) - APENAS para modelo "zen"/"big-pickle"
    if (model === "big-pickle" || model === "zen") {
      console.log("Rota direta: OpenCode Zen");
      try {
        const zenResp = await tryZen(messages, system, "big-pickle");
        if (zenResp) return zenResp;
        console.warn("Zen falhou, tentando Emergent...");
      } catch (e) {
        console.warn("Zen erro:", (e as Error)?.message);
      }
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

    // Rota dedicada: Claude FCC via ngrok
    if (model === "claude-fcc") {
      console.log("Rota direta: Claude FCC");
      try {
        const claudeResp = await tryClaudeFCC(messages, system);
        if (claudeResp.ok) return claudeResp;
      } catch (e) {
        console.warn("Claude FCC erro:", (e as Error)?.message);
      }
      const sseErr = `data: ${JSON.stringify({ error: "Claude FCC indisponível" })}\n\ndata: [DONE]\n\n`;
      return new Response(sseErr, {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Demais modelos (gpt, gemini, claude-sonnet) → Emergent PRIMEIRO com candidatos específicos
    const emergentKey = Deno.env.get("EMERGENT_API_KEY") || Deno.env.get("EMERGENT_LLM_KEY") || "";

    const candidates = emergentKey
      ? (MODEL_CANDIDATES[model] || [...(model ? [model] : []), ...FALLBACK_CANDIDATES])
      : [];

    const payload = {
      stream: true,
      messages: [
        ...(system ? [{ role: "system", content: String(system) }] : []),
        ...messages.map((m: any) => ({ role: m.role, content: String(m.content ?? "") })),
      ],
    };

    let lastError = "";
    let lastStatus = 0;

    // 1) Emergent — PRIMEIRO para modelos gateway (gpt, gemini, claude-sonnet)
    if (candidates.length > 0) {
      console.log(`[multi-model-chat] Tentando Emergent para ${model} com candidatos:`, candidates);
      for (const candidate of candidates) {
        const emergentPayload = {
          stream: true,
          messages: convertMessagesForProvider([
            ...(system ? [{ role: "system", content: String(system) }] : []),
            ...messages,
          ], "openai"),
        };
        const upstream = await tryEmergent(emergentKey, candidate, emergentPayload);

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          lastStatus = upstream.status;
          lastError = text || `HTTP ${upstream.status}`;
          if (upstream.status === 400 || upstream.status === 404) {
            console.warn(`Emergent rejeitou modelo ${candidate}, tentando próximo...`);
            continue;
          }
          // 401/402/429 = chave invalida ou credito esgotado → cai para OpenRouter
          console.warn(`Emergent falhou (${upstream.status}), tentando OpenRouter...`);
          break;
        }

        // Success
        console.log(`[multi-model-chat] Emergent OK com ${candidate}`);
        return new Response(upstream.body, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
        });
      }
    }

    // 2) OpenRouter — fallback automatico quando Emergent acabar
    if (OPENROUTER_KEY) {
      const orResp = await tryOpenRouter(messages, system);
      if (orResp && orResp.ok && orResp.body) {
        console.log("[multi-model-chat] OpenRouter fallback OK");
        return new Response(orResp.body, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
        });
      }
      console.warn("OpenRouter falhou, tentando Claude FCC...");
    }

    // 3) Claude FCC — ultimo recurso
    try {
      const claudeResp = await tryClaudeFCC(messages, system);
      if (claudeResp.ok) return claudeResp;
    } catch {}

    // Todos falharam
    let msg = lastError || "Emergent, OpenRouter e Claude FCC falharam.";
    if (lastStatus === 401 || lastStatus === 402) msg = "Credito Emergent esgotado e fallbacks indisponiveis.";
    if (lastStatus === 429) msg = "Limite de requisicoes excedido em todos os provedores.";
    return new Response(JSON.stringify({ error: msg }), {
      status: lastStatus || 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
