// Shared LLM helpers with fallback chain: Zen (OpenCode, gratuito) → Nemotron → OpenRouter → Claude FCC → Lovable → Gemini → Emergent.

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
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const FCC_BASE_URL = Deno.env.get("FCC_BASE_URL") || "";
const FCC_AUTH_TOKEN = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
const FCC_MODEL = Deno.env.get("FCC_MODEL") || "claude-3-freecc-no-thinking/nvidia_nim/nvidia/nemotron-3-super-120b-a12b";

// OpenCode Zen (gratuito, principal)
const ZEN_KEY = Deno.env.get("ZEN_API_KEY") || "";
const ZEN_BASE = "https://opencode.ai/zen/v1/chat/completions";
const ZEN_MODELS = ["big-pickle", "deepseek-v4-flash-free", "nemotron-3-ultra-free"];

// NVIDIA NIM direto
const NVIDIA_NIM_API_KEY = Deno.env.get("NVIDIA_NIM_API_KEY") || "";
const NVIDIA_NIM_BASE = "https://integrate.api.nvidia.com/v1";
const NEMOTRON_MODEL = "nvidia/nemotron-3-super-120b-a12b";

// ---------- chat completions ----------

async function chatZen(opts: ChatOptions) {
  if (!ZEN_KEY) return { ok: false as const, status: 0, error: "ZEN_API_KEY ausente" };
  for (const model of ZEN_MODELS) {
    try {
      // Injeta instrução anti-inglês e anti-CoT no system prompt
      const patchedMessages = opts.messages.map((m) => {
        if (m.role === "system") {
          return { ...m, content: `INSTRUÇÃO CRÍTICA: Responda SEMPRE em português brasileiro. NUNCA responda em inglês. NÃO inclua raciocínio, análise, passos de pensamento. Responda apenas com a resposta final.\n\n${m.content}` };
        }
        return m;
      });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch(ZEN_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ZEN_KEY}` },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: patchedMessages,
          ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
          max_tokens: opts.maxTokens || 4096,
          reasoning_effort: "low",
        }),
      });
      clearTimeout(timeout);
      if (!resp.ok) continue;
      const data = await resp.json();
      const text = String(data?.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
      if (!text || text.length < 5) continue;
      return { ok: true as const, data: { choices: [{ message: { role: "assistant", content: text } }] }, provider: `zen/${model}` };
    } catch (e) {
      console.warn(`Zen ${model} erro:`, (e as Error)?.message);
    }
  }
  return { ok: false as const, status: 502, error: "Zen: todos os modelos falharam" };
}

async function chatLovable(opts: ChatOptions) {
  if (!LOVABLE_KEY) return { ok: false as const, status: 0, error: "LOVABLE_API_KEY ausente" };
  try {
    const { model: _, ...body } = opts;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    clearTimeout(timeout);
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

export async function chatGemini(opts: ChatOptions) {
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    clearTimeout(timeout);
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch("https://integrations.emergentagent.com/llm/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${EMERGENT_KEY}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: opts.model?.startsWith("openai/")
          ? opts.model.slice(6)
          : opts.model || "gpt-4o-mini",
        messages: opts.messages,
        ...(opts.response_format ? { response_format: opts.response_format } : {}),
        ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
      }),
    });
    clearTimeout(timeout);
    if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
    return { ok: true as const, data: await resp.json(), provider: "emergent" };
  } catch (e) {
    return { ok: false as const, status: 0, error: `Emergent erro: ${(e as Error)?.message || e}` };
  }
}

export async function chatOpenRouter(opts: ChatOptions) {
  if (!OPENROUTER_KEY) return { ok: false as const, status: 0, error: "OPENROUTER_API_KEY ausente" };
  
  async function tryOpenRouter(model: string, maxTokens: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      // Inject anti-CoT instruction into system message
      const patchedMessages = opts.messages.map((m) => {
        if (m.role === "system") {
          return { ...m, content: `INSTRUÇÃO CRÍGICA: Responda APENAS com a resposta final destinada ao cliente. NÃO inclua raciocínio, análise, passos de pensamento, "Okay", "Let me", "The user", "According", ou qualquer texto interno. A resposta deve parecer uma mensagem natural de WhatsApp de uma secretária jurídica.\n\n${m.content}` };
        }
        return m;
      });
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": "https://deusfiel.onrender.com",
          "X-Title": "Kenia Garcia Advocacia",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: patchedMessages,
          ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
          max_tokens: maxTokens,
        }),
      });
      clearTimeout(timeout);
      if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
      const raw = await resp.json();
      const rawText = String(raw?.choices?.[0]?.message?.content || "").trim();
      // Strip thinking tags and chain-of-thought leaking
      let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
      // Aggressively strip CoT patterns from free models
      const cotPatterns = [
        /^(Okay|But|So|Now|Right|Well|Hmm|Wait|Let me|I need|I should|First|The user|According|Looking|Based|Checking|Under|Following|After|Before|Since|Because|If the|When the|For example|However|Actually|Also|Moreover|Furthermore|In this case|In the|On the|At the|My response|My answer|The response|The answer|The correct)[\s\S]{0,200}?(?:Olá|Bom dia|Boa tarde|Boa noite|Olá!|Oi!|Sou a|Como posso|Gostaria|Preciso|Entendo|Imagino|Entendi|Claro|Certo|Perfeito|Naturalmente|Vou|Gostaria|Vamos|Que tal|Por gentileza|Me diga|Pode me|Qual é|Como funciona|Quanto|Quando|Onde|Por que)[\s\S]*/i,
        /^(Okay|But|So|Now|Right|Well|Hmm|Wait|Let me|I need|I should|First|The user|According|Looking|Based|Checking|Under|Following|After|Before|Since|Because)[\s\S]*/i,
      ];
      for (const pat of cotPatterns) {
        const m = cleaned.match(pat);
        if (m && m[0].length > 50) {
          // Try to extract the actual response after the CoT
          const afterCoT = cleaned.slice(m[0].length).trim();
          if (afterCoT.length > 20) cleaned = afterCoT;
          else cleaned = cleaned.replace(pat, "").trim();
        }
      }
      // If still looks like CoT, try to find first natural Portuguese sentence
      if (/^(Okay|But|So|Now|Right|Well|Wait|Let me|I need|The user|According|Looking|Based)/i.test(cleaned)) {
        const sentences = cleaned.split(/(?<=[.!?])\s+/);
        const naturalStart = sentences.findIndex((s: string) => !/^(Okay|But|So|Now|Right|Well|Wait|Let me|I need|I should|First|The user|According|Looking|Based|Checking|Under|Following|After|Before|Since|Because|If the|When the|For example|However|Actually|Also|Moreover|Furthermore|In this case|My response|The response|The correct|So the|But the|Okay the|Now the)/i.test(s));
        if (naturalStart > 0) cleaned = sentences.slice(naturalStart).join(" ").trim();
        else if (naturalStart === -1 && sentences.length > 1) cleaned = sentences.slice(-1)[0].trim();
      }
      if (!cleaned) cleaned = rawText;
      return { ok: true as const, data: { choices: [{ message: { role: "assistant", content: cleaned } }] }, provider: `openrouter/${model}` };
    } catch (e) {
      clearTimeout(timeout);
      return { ok: false as const, status: 0, error: `OpenRouter erro: ${(e as Error)?.message || e}` };
    }
  }
  
  const requested = opts.maxTokens || 2000;
  // Race: Hermes (barato) + Nemotron free simultaneamente
  const racePromises = [
    tryOpenRouter("nousresearch/hermes-4-70b", requested),
    tryOpenRouter("nvidia/nemotron-3-super-120b-a12b:free", requested),
  ];
  const results = await Promise.allSettled(racePromises);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value?.ok) return r.value;
  }
  // Último recurso: Gemini paid
  const fallback = await tryOpenRouter("google/gemini-3-flash-preview", requested);
  if (fallback.ok) return fallback;
  return { ok: false as const, status: 402, error: "OpenRouter: todos os modelos falharam" };
}

async function chatClaudeFCC(opts: ChatOptions) {
  if (!FCC_BASE_URL) return { ok: false as const, status: 0, error: "FCC_BASE_URL ausente" };
  try {
    const systemMsg = opts.messages.find((m) => m.role === "system")?.content || "";
    const apiMessages = opts.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" as const : "user" as const, content: String(m.content || "") }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const resp = await fetch(`${FCC_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": FCC_AUTH_TOKEN,
        "Authorization": `Bearer ${FCC_AUTH_TOKEN}`,
        "anthropic-version": "2023-06-01",
        "ngrok-skip-browser-warning": "true",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: opts.model || FCC_MODEL,
        max_tokens: opts.maxTokens || 4000,
        stream: false,
        system: systemMsg,
        messages: apiMessages,
      }),
    });
    clearTimeout(timeout);
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(`${NVIDIA_NIM_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVIDIA_NIM_API_KEY}`,
      },
      signal: controller.signal,
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
    clearTimeout(timeout);
    if (!resp.ok) return { ok: false as const, status: resp.status, error: await resp.text() };
    const data = await resp.json();
    const text = String(data?.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
    if (!text || text.length < 10 || text.includes("<unk>") || (text.match(/<unk>/g) || []).length > 2) {
      return { ok: false as const, status: 0, error: "Nemotron retornou output inválido (lixo/unk)" };
    }
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
  const wantsHermes = requestedModel.includes("hermes");

  // Se pediu modelo específico, tenta só ele
  if (wantsHermes && OPENROUTER_KEY) {
    const r = await chatOpenRouter(opts);
    if (r.ok) return r;
  }
  if (wantsGemini && GEMINI_KEY) {
    const r = await chatGemini(opts);
    if (r.ok) return r;
  }
  if (wantsEmergent) {
    const r = await chatEmergent(opts);
    if (r.ok) return r;
  }
  if (wantsClaude) {
    if (EMERGENT_KEY) {
      const r = await chatEmergent(opts);
      if (r.ok) return r;
    }
    if (FCC_BASE_URL) {
      const r = await chatClaudeFCC(opts);
      if (r.ok) return r;
    }
  }

  // OTIMIZAÇÃO: Race providers em paralelo (15s max)
  // Tier 1: Zen (gratuito, rápido) — tenta sozinho primeiro
  if (ZEN_KEY) {
    const r = await chatZen(opts);
    if (r.ok) return r;
  }

  // Tier 2: Race Emergent + Nemotron NIM + OpenRouter simultaneamente
  const tier2: Promise<any>[] = [];
  if (EMERGENT_KEY) tier2.push(chatEmergent(opts));
  if (NVIDIA_NIM_API_KEY) tier2.push(chatNemotronDirect(opts));
  if (OPENROUTER_KEY) {
    // Só Hermes (barato, bom em PT-BR) — paga modelos lentos
    tier2.push(chatOpenRouter({ ...opts, model: "nousresearch/hermes-4-70b" }));
  }
  if (tier2.length > 0) {
    const winner = await Promise.race(tier2);
    if (winner.ok) {
      // Cancela os perdedores
      tier2.forEach((p) => p.catch(() => {}));
      return winner;
    }
    // Se race perdeu, espera todos e pega o primeiro OK
    const results = await Promise.allSettled(tier2);
    for (const r of results) {
      if (r.status === "fulfilled" && r.value?.ok) return r.value;
    }
  }

  // Tier 3: Race FCC + Lovable + Gemini (mais lentos)
  const tier3: Promise<any>[] = [];
  if (FCC_BASE_URL) tier3.push(chatClaudeFCC(opts));
  if (LOVABLE_KEY) tier3.push(chatLovable(opts));
  if (GEMINI_KEY) tier3.push(chatGemini(opts));
  if (tier3.length > 0) {
    const results = await Promise.allSettled(tier3);
    for (const r of results) {
      if (r.status === "fulfilled" && r.value?.ok) return r.value;
    }
  }

  return { ok: false as const, status: 502, error: "Nenhum provider disponível (Zen/Emergent/OpenRouter/FCC/Nemotron/Lovable/Gemini)", provider: "none" };
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

  // Step 1: Zen (free) generates → tenta Nemotron → FCC
  console.log("[pipeline] Step 1: Gerando com Zen (free)...");
  let genResult = await chatZen(opts);
  if (!genResult.ok) {
    console.log("[pipeline] Zen falhou, tentando Nemotron NIM...");
    genResult = await chatNemotronDirect(opts);
  }
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
        quality: opts.quality || "high",
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
        model: "gpt-image-2",
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
