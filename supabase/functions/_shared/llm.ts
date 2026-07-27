// Shared LLM helpers with fallback chain: Nemotron (NVIDIA NIM direto) → Claude FCC → Lovable → Gemini → Emergent.

type ChatMessage = { role: string; content: any };

export interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  response_format?: any;
  temperature?: number;
  maxTokens?: number;
  preferFastProvider?: boolean;
}

export interface ImageOptions {
  prompt: string;
  size?: string;
  quality?: string;
}

const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
export const EMERGENT_KEY = Deno.env.get("EMERGENT_API_KEY");
const FCC_BASE_URL = Deno.env.get("FCC_BASE_URL") || "";
const FCC_AUTH_TOKEN = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
const FCC_MODEL = Deno.env.get("FCC_MODEL") || "claude-3-freecc-no-thinking/nvidia_nim/nvidia/nemotron-3-super-120b-a12b";

// NVIDIA NIM direto
const NVIDIA_NIM_API_KEY = Deno.env.get("NVIDIA_NIM_API_KEY") || "";
const NVIDIA_NIM_BASE = "https://integrate.api.nvidia.com/v1";
const NEMOTRON_MODEL = "nvidia/nemotron-3-super-120b-a12b";

// ---------- chat completions ----------

async function chatLovable(opts: ChatOptions) {
  if (!LOVABLE_KEY) return { ok: false as const, status: 0, error: "LOVABLE_API_KEY ausente" };
  try {
    const { model: _, ...body } = opts;
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
    return { ok: true as const, data: await resp.json(), provider: "lovable" };
  } catch (e) {
    return { ok: false as const, status: 0, error: `Lovable erro: ${(e as Error)?.message || e}` };
  }
}

function messagesToGeminiContents(messages: ChatMessage[]) {
  const system: string[] = [];
  const contents: any[] = [];
  for (const m of messages) {
    const text = typeof m.content === "string"
      ? m.content
      : Array.isArray(m.content)
        ? m.content.map((p: any) => p?.text || "").filter(Boolean).join("\n")
        : String(m.content || "");
    if (m.role === "system") { system.push(text); continue; }
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }
  return { system: system.join("\n\n"), contents };
}

async function chatGemini(opts: ChatOptions) {
  if (!GEMINI_KEY) return { ok: false as const, status: 0, error: "GEMINI_API_KEY ausente" };
  try {
    const { system, contents } = messagesToGeminiContents(opts.messages);
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const body: any = { contents };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    if (opts.response_format?.type === "json_object") {
      body.generationConfig = { responseMimeType: "application/json" };
    }
    if (typeof opts.temperature === "number") {
      body.generationConfig = { ...(body.generationConfig || {}), temperature: opts.temperature };
    }
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    return {
      ok: true as const,
      provider: "gemini",
      data: { choices: [{ message: { role: "assistant", content: text } }] },
    };
  } catch (e) {
    return { ok: false as const, status: 0, error: `Gemini erro: ${(e as Error)?.message || e}` };
  }
}

export async function chatEmergent(opts: ChatOptions) {
  if (!EMERGENT_KEY) return { ok: false as const, status: 0, error: "EMERGENT_API_KEY ausente" };
  try {
    const resp = await fetch("https://integrations.emergentagent.com/llm/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${EMERGENT_KEY}` },
      body: JSON.stringify({
        model: opts.model?.startsWith("openai/")
          ? opts.model.slice(6)
          : opts.model || "gpt-4o-mini",
        messages: opts.messages,
        ...(opts.response_format ? { response_format: opts.response_format } : {}),
        ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
      }),
    });
    if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
    return { ok: true as const, data: await resp.json(), provider: "emergent" };
  } catch (e) {
    return { ok: false as const, status: 0, error: `Emergent erro: ${(e as Error)?.message || e}` };
  }
}

async function chatClaudeFCC(opts: ChatOptions) {
  if (!FCC_BASE_URL) return { ok: false as const, status: 0, error: "FCC_BASE_URL ausente" };
  try {
    const systemMsg = opts.messages.find((m) => m.role === "system")?.content || "";
    const apiMessages = opts.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, content: String(m.content || "") }));
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
        model: opts.model || FCC_MODEL,
        max_tokens: opts.maxTokens || 4000,
        stream: false,
        system: systemMsg,
        messages: apiMessages,
      }),
    });
    if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
    const data = await resp.json();
    const textBlock = (data?.content || []).find((b: any) => b.type === "text");
    const text = String(textBlock?.text || "").replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
    return { ok: true as const, data: { choices: [{ message: { role: "assistant", content: text } }] }, provider: "claude-fcc" };
  } catch (e) {
    return { ok: false as const, status: 0, error: `Claude FCC erro: ${(e as Error)?.message || e}` };
  }
}

// NVIDIA NIM direto — sem ngrok, streaming nativo
async function chatNemotronDirect(opts: ChatOptions) {
  if (!NVIDIA_NIM_API_KEY) return { ok: false as const, status: 0, error: "NVIDIA_NIM_API_KEY ausente" };
  try {
    const resp = await fetch(`${NVIDIA_NIM_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVIDIA_NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: NEMOTRON_MODEL,
        messages: opts.messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || ""),
        })),
        max_tokens: opts.maxTokens || 4096,
        stream: false,
        temperature: typeof opts.temperature === "number" ? opts.temperature : 0.7,
      }),
    });
    if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
    const data = await resp.json();
    const text = String(data?.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
    return { ok: true as const, data: { choices: [{ message: { role: "assistant", content: text } }] }, provider: "nemotron" };
  } catch (e) {
    return { ok: false as const, status: 0, error: `Nemotron NIM erro: ${(e as Error)?.message || e}` };
  }
}

export async function chatCompletion(opts: ChatOptions) {
  const requestedModel = opts.model || "";
  const wantsGemini = requestedModel.includes("gemini");
  const wantsEmergent = requestedModel.includes("gpt") || requestedModel.includes("openai");
  const wantsClaude = requestedModel.includes("claude");

  // Se pediu Gemini especificamente, começa por ele
  if (wantsGemini && GEMINI_KEY) {
    const r = await chatGemini(opts);
    if (r.ok) return r;
  }
  // Se pediu GPT/Emergent, começa por Emergent
  if (wantsEmergent) {
    const r = await chatEmergent(opts);
    if (r.ok) return r;
    console.warn("Emergent falhou, tentando fallback completo:", r.error?.slice?.(0, 200));
  }
  // Se pediu Claude, começa por FCC
  if (wantsClaude && FCC_BASE_URL) {
    const r = await chatClaudeFCC(opts);
    if (r.ok) return r;
  }

  // Fallback chain: sempre tenta todos os providers restantes
  if (NVIDIA_NIM_API_KEY) {
    const r = await chatNemotronDirect(opts);
    if (r.ok) return r;
    console.warn("⚠️ Nemotron NIM direto falhou:", r.status, r.error?.slice?.(0, 200));
  }
  if (FCC_BASE_URL) {
    const r = await chatClaudeFCC(opts);
    if (r.ok) return r;
    console.warn("⚠️ Claude FCC falhou:", r.status, r.error?.slice?.(0, 200));
  }
  if (LOVABLE_KEY) {
    const r = await chatLovable(opts);
    if (r.ok) return r;
    console.warn("⚠️ Lovable chat falhou:", r.status, r.error?.slice?.(0, 200));
  }
  if (GEMINI_KEY) {
    const r = await chatGemini(opts);
    if (r.ok) return r;
    console.warn("⚠️ Gemini direto falhou:", r.status, r.error?.slice?.(0, 200));
  }
  if (!wantsEmergent) {
    const r3 = await chatEmergent(opts);
    if (r3.ok) return r3;
  }
  return { ok: false as const, status: 502, error: "Nenhum provider disponível", provider: "none" };
}

// ---------- Pipeline: Nemotron gera → Claude (Emergent) revisa ----------

const REVIEW_SYSTEM_PROMPT = `Você é um REVISOR JURÍDICO DE ALTO NÍVEL brasileiro.

Analise o documento/texto jurídico abaixo e:

1. VERIFIQUE:
   - Se os artigos de lei citados EXISTEM e estão corretos
   - Se as súmulas citadas EXISTEM e estão corretas
   - Se há erros jurídicos ou de lógica
   - Se há texto em inglês (remova)
   - Se falta decisão em algum ponto

2. CORRIJA:
   - Fundamentação fraca → reforce
   - Erros de lógica → corrija
   - Aplicação incorreta da lei → ajuste
   - Artigo inexistente → remova ou substitua pelo correto

3. REGRAS:
   - NÃO reescreva tudo — apenas MELHORE e CORRIJA
   - Se houver erro grave → reescreva apenas a parte afetada
   - Se faltar prova → ajuste decisão com base no ônus da prova (art. 818 CLT / art. 373 CPC)
   - mantenha o formato original

4. SAÍDA:
   - Retorne o texto VERSÃO FINAL corrigida
   - Não inclua explicações fora do documento
   - Se o documento estiver correto, retorne EXATAMENTE igual`;

export interface PipelineResult {
  ok: boolean;
  data?: { choices: [{ message: { role: string; content: string } }] };
  provider: string;
  reviewApplied: boolean;
  error?: string;
  status?: number;
}

export async function chatPipeline(opts: ChatOptions): Promise<PipelineResult> {
  const requestedModel = opts.model || "";
  const wantsNonNemotron = requestedModel.includes("gpt") || requestedModel.includes("gemini") || requestedModel.includes("claude") || requestedModel.includes("openai");

  // Se pediu modelo específico que não é Nemotron, pula direto pro chatCompletion
  if (wantsNonNemotron) {
    console.log("[pipeline] Modelo específico solicitado, usando chatCompletion direto");
    const fallback = await chatCompletion(opts);
    return { ...fallback, reviewApplied: false };
  }

  // Step 1: Nemotron (free) generates — tenta direto via NIM, senão via FCC
  console.log("[pipeline] Step 1: Gerando com Nemotron (free)...");
  let genResult = await chatNemotronDirect(opts);
  if (!genResult.ok) {
    console.log("[pipeline] Nemotron NIM direto falhou, tentando via FCC...");
    genResult = await chatClaudeFCC(opts);
  }
  if (!genResult.ok) {
    // Fallback to full chain
    console.log("[pipeline] Nemotron falhou, usando chatCompletion completo");
    const fallback = await chatCompletion(opts);
    return { ...fallback, reviewApplied: false };
  }

  const generatedText = genResult.data?.choices?.[0]?.message?.content || "";
  console.log("[pipeline] Nemotron gerou", generatedText.length, "chars");

  // Step 2: If Emergent key available, Claude reviews
  if (EMERGENT_KEY) {
    console.log("[pipeline] Step 2: Revisando com Claude (Emergent)...");
    const reviewResult = await chatEmergent({
      messages: [
        { role: "system", content: REVIEW_SYSTEM_PROMPT },
        { role: "user", content: generatedText },
      ],
      temperature: 0.2,
      maxTokens: opts.maxTokens || 4000,
    });

    if (reviewResult.ok) {
      const reviewedText = reviewResult.data?.choices?.[0]?.message?.content || generatedText;
      // Only use reviewed version if it's substantially different and valid
      if (reviewedText.length > generatedText.length * 0.5) {
        console.log("[pipeline] Claude revisou:", reviewedText.length, "chars");
        return {
          ok: true,
          data: { choices: [{ message: { role: "assistant", content: reviewedText } }] },
          provider: "nemotron+claude",
          reviewApplied: true,
        };
      }
    }
    console.warn("[pipeline] Review falhou ou resultado inválido, usando Nemotron direto");
  } else {
    console.log("[pipeline] Emergent não configurado, pulando review");
  }

  return {
    ok: true,
    data: genResult.data,
    provider: "nemotron",
    reviewApplied: false,
  };
}

// ---------- text-to-image ----------

async function imageLovable(opts: ImageOptions) {
  if (!LOVABLE_KEY) return { ok: false as const, error: "LOVABLE_API_KEY ausente" };
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt: opts.prompt,
        quality: opts.quality || "low",
        size: opts.size || "1024x1024",
        stream: false,
      }),
    });
    if (!resp.ok) return { ok: false as const, error: `Lovable ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
    const data = await resp.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return { ok: false as const, error: "Lovable não retornou imagem" };
    return { ok: true as const, b64, provider: "lovable" };
  } catch (e) {
    return { ok: false as const, error: `Lovable erro: ${(e as Error)?.message || e}` };
  }
}

async function imageGemini(opts: ImageOptions) {
  if (!GEMINI_KEY) return { ok: false as const, error: "GEMINI_API_KEY ausente" };
  try {
    const model = "gemini-2.5-flash-image";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    });
    if (!resp.ok) return { ok: false as const, error: `Gemini ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const inline = parts.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
    const b64 = inline?.inlineData?.data || inline?.inline_data?.data;
    if (!b64) return { ok: false as const, error: "Gemini direto não retornou imagem" };
    return { ok: true as const, b64, provider: "gemini" };
  } catch (e) {
    return { ok: false as const, error: `Gemini erro: ${(e as Error)?.message || e}` };
  }
}

async function imageEmergent(opts: ImageOptions) {
  if (!EMERGENT_KEY) return { ok: false as const, error: "EMERGENT_API_KEY ausente" };
  try {
    const resp = await fetch("https://integrations.emergentagent.com/llm/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${EMERGENT_KEY}` },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: opts.prompt,
        size: opts.size || "1024x1024",
        n: 1,
      }),
    });
    if (!resp.ok) return { ok: false as const, error: `Emergent ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
    const data = await resp.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return { ok: false as const, error: "Emergent não retornou imagem" };
    return { ok: true as const, b64, provider: "emergent" };
  } catch (e) {
    return { ok: false as const, error: `Emergent erro: ${(e as Error)?.message || e}` };
  }
}

export async function generateImage(opts: ImageOptions) {
  if (LOVABLE_KEY) {
    const r = await imageLovable(opts);
    if (r.ok) return r;
    console.warn("⚠️ Lovable image falhou, tentando Gemini direto:", r.error);
  }
  if (GEMINI_KEY) {
    const r = await imageGemini(opts);
    if (r.ok) return r;
    console.warn("⚠️ Gemini direto falhou, tentando Emergent:", r.error);
  }
  const r3 = await imageEmergent(opts);
  if (r3.ok) return r3;
  return { ok: false as const, error: r3.error || "Nenhum provider de imagem disponível", provider: "none" };
}
