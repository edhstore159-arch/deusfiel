import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getEvolvedPrompt } from "../_shared/prompts.ts";
import { chatCompletion, chatEmergent } from "../_shared/llm.ts";
import { JUDGE_BASE_PROMPT, AREA_PROMPTS } from "../_shared/judge_prompt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ZEN_BASE = "https://opencode.ai/zen/v1/chat/completions";
const ZEN_KEY = Deno.env.get("ZEN_API_KEY") || "";

// Tenta Emergent como provedor PRIMÁRIO
async function tryEmergentFirst(systemMsg: string, userMsg: string, model: string) {
  const emergentKey = Deno.env.get("EMERGENT_API_KEY");
  if (!emergentKey) {
    console.warn("[judge-ai] EMERGENT_API_KEY não configurada, pulando para fallback");
    return { ok: false as const, error: "EMERGENT_API_KEY ausente" };
  }
  const result = await chatEmergent({
    messages: [
      { role: "system", content: systemMsg },
      { role: "user", content: userMsg },
    ],
    model,
    temperature: 0.3,
    maxTokens: 8192,
    allowEmergent: true,
  });
  if (result.ok) {
    console.log("[judge-ai] Emergent (primário) OK, provider:", result.provider, "model:", result.model);
    return { ok: true as const, text: result.data?.choices?.[0]?.message?.content || "", provider: result.provider, model: result.model };
  }
  console.warn("[judge-ai] Emergent falhou:", result.error);
  return { ok: false as const, error: result.error };
}

async function readSSEText(resp: Response): Promise<string> {
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
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
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        if (json?.error) continue;
        const delta = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content;
        if (delta) text += delta;
      } catch {}
    }
  }
  return text.trim();
}

async function zenChat(system: string, user: string): Promise<{ ok: true; text: string; model: string } | { ok: false; error: string }> {
  if (!ZEN_KEY) return { ok: false, error: "ZEN_API_KEY ausente" };
  const patchedSystem = `INSTRUÇÃO CRÍTICA: Responda SEMPRE em português brasileiro. NUNCA responda em inglês. NÃO inclua raciocínio interno ou análise. Responda apenas com a resposta final.\n\n${system}`;
  const candidates = ["mimo-v2.5-free", "deepseek-v4-flash-free", "big-pickle"];
  for (const candidate of candidates) {
    const controller = new AbortController();
    const zenTimeout = setTimeout(() => controller.abort(), 180000);
    try {
      const resp = await fetch(ZEN_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: ZEN_KEY },
        body: JSON.stringify({
          model: candidate,
          messages: [
            { role: "system", content: patchedSystem },
            { role: "user", content: user },
          ],
          max_tokens: 16000,
          stream: true,
        }),
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) {
        await resp?.text().catch(() => {});
        clearTimeout(zenTimeout);
        console.warn(`[judge-ai] Zen ${candidate} falhou: ${resp?.status}`);
        continue;
      }
      const text = await readSSEText(resp);
      clearTimeout(zenTimeout);
      if (text && /disposit/iu.test(text)) return { ok: true, text, model: candidate };
      console.warn(`[judge-ai] Zen ${candidate} resposta sem DISPOSITIVO (incompleta), tentando próximo`);
    } catch (e) {
      clearTimeout(zenTimeout);
      console.warn(`[judge-ai] Zen ${candidate} erro:`, (e as Error)?.message);
    }
  }
  return { ok: false, error: "Zen indisponível" };
}

// Zen streaming direto ao cliente (formato OpenAI-SSE), primário para sentenças completas.
async function tryStreamZen(
  system: string,
  user: string,
  controller: ReadableStreamDefaultController<any>,
  firstChunkMs = 90000,
): Promise<"ok" | "fallback"> {
  if (!ZEN_KEY) return "fallback";
  const patchedSystem = `INSTRUÇÃO CRÍTICA: Responda SEMPRE em português brasileiro. NUNCA responda em inglês. NÃO inclua raciocínio interno ou análise. Responda apenas com a resposta final.\n\n${system}`;
  const candidates = ["mimo-v2.5-free", "deepseek-v4-flash-free", "big-pickle"];
  for (const candidate of candidates) {
    const ac = new AbortController();
    const firstChunkTimer = setTimeout(() => ac.abort(), firstChunkMs);
    try {
      const resp = await fetch(ZEN_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: ZEN_KEY },
        body: JSON.stringify({
          model: candidate,
          messages: [
            { role: "system", content: patchedSystem },
            { role: "user", content: user },
          ],
          max_tokens: 16000,
          stream: true,
        }),
        signal: ac.signal,
      });
      if (!resp.ok || !resp.body) {
        clearTimeout(firstChunkTimer);
        const raw = await resp?.text().catch(() => "");
        console.warn(`[judge-ai] Zen ${candidate} falhou: ${resp?.status} ${String(raw).slice(0, 150)}`);
        continue;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let emitted = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstChunkTimer) clearTimeout(firstChunkTimer);
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            if (json?.error) {
              console.warn(`[judge-ai] Zen ${candidate} stream error:`, String(json.error).slice(0, 150));
              if (emitted) {
                controller.enqueue(sseDone());
                return "ok";
              }
              return "fallback";
            }
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) {
              emitted = true;
              controller.enqueue(sseChunk(delta));
            }
          } catch {}
        }
      }
      if (emitted) {
        controller.enqueue(sseDone());
        console.log(`[judge-ai] Zen streaming OK (${candidate})`);
        return "ok";
      }
      console.warn(`[judge-ai] Zen ${candidate} sem conteúdo, tentando próximo`);
    } catch (e) {
      if (firstChunkTimer) clearTimeout(firstChunkTimer);
      if (ac.signal.aborted) {
        console.warn(`[judge-ai] Zen ${candidate} sem primeiro chunk a tempo, tentando próximo`);
        continue;
      }
      console.warn(`[judge-ai] Zen ${candidate} erro:`, (e as Error)?.message);
      continue;
    }
  }
  return "fallback";
}

// Converte o stream Anthropic-SSE do FCC em chunks OpenAI-SSE para o frontend.
async function pipeFCCStream(
  resp: Response,
  controller: ReadableStreamDefaultController<any>,
  firstChunkTimer: ReturnType<typeof setTimeout>,
): Promise<{ emitted: boolean; complete: boolean }> {
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let emitted = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith("event:")) continue;
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (!data) continue;
        let json: any;
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        if (!json) continue;
        if (json.type === "error") {
          console.warn("[judge-ai] FCC stream error:", JSON.stringify(json.error || json).slice(0, 300));
          return { emitted, complete: false };
        }
        if (json.type === "content_block_delta" && json.delta?.text) {
          emitted = true;
          if (firstChunkTimer) {
            clearTimeout(firstChunkTimer);
            firstChunkTimer = null as any;
          }
          controller.enqueue(sseChunk(json.delta.text));
        } else if (json.type === "message_stop") {
          controller.enqueue(sseDone());
          return { emitted, complete: true };
        }
      }
    }
  } catch (e) {
    console.warn("[judge-ai] FCC stream read error:", (e as Error)?.message);
    return { emitted, complete: false };
  }
  if (emitted) {
    controller.enqueue(sseDone());
    return { emitted, complete: true };
  }
  return { emitted, complete: false };
}

// Streama a resposta diretamente do FCC, com retry em 429 e timeout só no 1º chunk.
// max_tokens baixo evita o stall >120s do backend (o limite não é respeitado).
async function tryStreamFCC(
  systemMsg: string,
  userMsg: string,
  controller: ReadableStreamDefaultController<any>,
  opts: { firstChunkMs?: number; maxTokens?: number } = {},
): Promise<"ok" | "fallback"> {
  const FCC_BASE_URL = Deno.env.get("FCC_BASE_URL") || "";
  const FCC_AUTH_TOKEN = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
  const FCC_MODEL = Deno.env.get("FCC_MODEL") || "claude-3-freecc-no-thinking/opencode/nemotron-3-ultra-free";
  if (!FCC_BASE_URL) return "fallback";
  const FIRST_CHUNK_MS = opts.firstChunkMs ?? 45000;
  const MAX_TOKENS = opts.maxTokens ?? 500;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ac = new AbortController();
    const firstChunkTimer = setTimeout(() => ac.abort(), FIRST_CHUNK_MS);
    try {
      const resp = await fetch(`${FCC_BASE_URL}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": FCC_AUTH_TOKEN,
          "Authorization": `Bearer ${FCC_AUTH_TOKEN}`,
          "anthropic-version": "2023-06-01",
          "ngrok-skip-browser-warning": "true",
        },
        signal: ac.signal,
        body: JSON.stringify({
          model: FCC_MODEL,
          max_tokens: MAX_TOKENS,
          stream: true,
          system: systemMsg,
          messages: [{ role: "user", content: userMsg }],
        }),
      });
      if (resp.status === 429) {
        clearTimeout(firstChunkTimer);
        console.warn(`[judge-ai] FCC 429 (rate limit), tentativa ${attempt + 1}/3`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      if (!resp.ok || !resp.body) {
        clearTimeout(firstChunkTimer);
        const raw = await resp.text().catch(() => "");
        console.warn(`[judge-ai] FCC ${resp.status}: ${raw.slice(0, 200)}`);
        return "fallback";
      }
      const result = await pipeFCCStream(resp, controller, firstChunkTimer);
      if (result.complete) return "ok";
      return "fallback";
    } catch (e) {
      if (firstChunkTimer) clearTimeout(firstChunkTimer);
      if (ac.signal.aborted) {
        console.warn("[judge-ai] FCC sem primeiro chunk a tempo, fazendo fallback");
        return "fallback";
      }
      console.warn("[judge-ai] FCC stream falhou:", (e as Error)?.message);
      return "fallback";
    }
  }
  return "fallback";
}

function sseChunk(content: string): Uint8Array {
  const data = JSON.stringify({ choices: [{ delta: { content } }] });
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

function sseDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const messages: Array<{ role: string; content: string }> = body.messages || [];
    const model: string = body.model || "claude-fcc";
    const area: string = body.area || "";

    if (!messages.length && !body.case) {
      return new Response(
        JSON.stringify({ error: "messages ou case obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build system prompt
    let systemPrompt = JUDGE_BASE_PROMPT;
    if (area && AREA_PROMPTS[area]) {
      systemPrompt += AREA_PROMPTS[area];
    }

    // Buscar configuração do agente na tabela ai_agents
    let agentConfig: any = null;
    if (area) {
      try {
        const sbAgent = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: agent } = await sbAgent
          .from("ai_agents")
          .select("*")
          .ilike("area", area)
          .eq("active", true)
          .limit(1)
          .single();
        if (agent) {
          agentConfig = agent;
          if (agent.instructions) {
            systemPrompt += `\n\nINSTRUÇÕES ESPECÍFICAS DO AGENTE (${agent.name}):\n${agent.instructions}`;
          }
          if (agent.goal) {
            systemPrompt += `\n\nObjetivo do agente: ${agent.goal}`;
          }
        }
      } catch (e) {
        console.warn("[judge-ai] Falha ao buscar agente:", e);
      }
    }

    try {
      const evolved = await getEvolvedPrompt("judge", area || "*");
      if (evolved && evolved.trim().length > 100) {
        systemPrompt = evolved;
      }
    } catch (e) {
      console.warn("[judge-ai] Falha ao buscar prompt evoluído:", e);
    }

    // Temporal context
    const now = new Date();
    const fmtDate = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "2-digit",
    }).format(now);
    const fmtTime = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);

    systemPrompt += `\n\nCONTEXTO TEMPORAL: Hoje é ${fmtDate}, ${fmtTime}. Use essa referência quando necessário.`;

    // Build messages
    let finalMessages = [...messages];
    if (body.case && !messages.length) {
      finalMessages = [{
        role: "user",
        content: `Abaixo está o enunciado do caso a ser julgado. Elabore a sentença original completa, resolvendo integralmente o caso, seguindo OBRIGATORIAMENTE as seções do fluxo (Relatório, Fundamentação, Análise das Provas, Enfrentamento das Questões Jurídicas, Fundamentação Constitucional e Dispositivo). O tópico de Direito Internacional deve ser incluído apenas se houver elemento de internacionalidade; o tópico de Inteligência Artificial deve ser incluído apenas se fizer parte do caso:\n\n${body.case}`,
      }];
    }

    // Multi-step: first identify themes, then full analysis
    const isZen = model === "big-pickle" || model === "zen";
    const systemMsg = systemPrompt;
    const userMsg = finalMessages.map((m) => m.content).join("\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const isCasePath = !!(body.case && !messages.length);
          let streamed = false;

          if (isCasePath) {
            // Sentença completa: Zen streaming primeiro (rápido + completo), FCC depois.
            console.log("[judge-ai] Caso completo: Zen streaming primário");
            streamed = (await tryStreamZen(systemMsg, userMsg, controller)) === "ok";
            if (!streamed) {
              console.warn("[judge-ai] Zen streaming falhou, tentando FCC...");
              streamed = (await tryStreamFCC(systemMsg, userMsg, controller, { firstChunkMs: 20000, maxTokens: 500 })) === "ok";
            }
          } else {
            // Chat: FCC streaming primeiro (rápido em prompts curtos), Zen depois.
            console.log("[judge-ai] Chat: FCC streaming primário");
            streamed = (await tryStreamFCC(systemMsg, userMsg, controller, { firstChunkMs: 30000, maxTokens: 500 })) === "ok";
            if (!streamed) {
              console.warn("[judge-ai] FCC streaming falhou, tentando Zen streaming...");
              streamed = (await tryStreamZen(systemMsg, userMsg, controller)) === "ok";
            }
          }

          if (streamed) {
            console.log("[judge-ai] Streaming OK");
            controller.close();
            return;
          }

          console.warn("[judge-ai] Streaming indisponível, usando fallback não-streaming...");

          // Cadeia fallback não-streaming: Emergent → Zen → Gemini
          let cloudReply = "";
          let usedProvider = "";

          const emergentResult = await tryEmergentFirst(systemMsg, userMsg, isZen ? "big-pickle" : model);
          if (emergentResult.ok) {
            cloudReply = emergentResult.text;
            usedProvider = `emergent/${emergentResult.model}`;
            console.log("[judge-ai] Emergent fallback OK");
          } else {
            console.warn("[judge-ai] Emergent falhou, tentando Zen...");

            const zenResult = await zenChat(systemMsg, userMsg);
            if (zenResult.ok) {
              cloudReply = zenResult.text;
              usedProvider = `zen/${zenResult.model}`;
              console.log("[judge-ai] Zen fallback OK");
            } else {
              console.warn("[judge-ai] Zen indisponível, tentando Gemini...");

              const cc = await chatCompletion({
                messages: [
                  { role: "system", content: systemMsg },
                  { role: "user", content: userMsg },
                ],
                model: agentConfig?.model || model,
                temperature: 0.3,
                maxTokens: 8192,
                preferFastProvider: true,
              });
              if (cc.ok) {
                cloudReply = cc.data?.choices?.[0]?.message?.content || "";
                usedProvider = `cloud/${cc.provider}`;
                console.log("[judge-ai] Gemini fallback OK");
              } else {
                console.warn("[judge-ai] Gemini falhou:", cc.error);
              }
            }
          }

          const reply = cloudReply.trim()
            ? cloudReply
            : "Erro: todos os provedores falharam (FCC, Emergent, Zen, Gemini).";

          console.log("[judge-ai] Provider fallback:", usedProvider, "model:", model);

          const chunkSize = 20;
          for (let i = 0; i < reply.length; i += chunkSize) {
            controller.enqueue(sseChunk(reply.slice(i, i + chunkSize)));
          }
          controller.enqueue(sseDone());
        } catch (err) {
          console.error("[judge-ai] Erro:", err);
          controller.enqueue(sseChunk(`Erro ao processar: ${(err as Error)?.message || err}`));
          controller.enqueue(sseDone());
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error)?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
