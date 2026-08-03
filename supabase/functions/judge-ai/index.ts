import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getEvolvedPrompt } from "../_shared/prompts.ts";
import { chatCompletion } from "../_shared/llm.ts";
import { JUDGE_BASE_PROMPT, AREA_PROMPTS } from "../_shared/judge_prompt.ts";

// Wrapper: always specify model to force Emergent routing
function aiChat(opts: Parameters<typeof chatCompletion>[0]) {
  return chatCompletion({ ...opts, model: opts.model || "gpt-4o-mini" });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ZEN_BASE = "https://opencode.ai/zen/v1/chat/completions";
const ZEN_KEY = Deno.env.get("ZEN_API_KEY") || "";

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

async function callJudgeClaudeFCC(systemMsg: string, userMsg: string): Promise<string> {
  const FCC_BASE_URL = Deno.env.get("FCC_BASE_URL") || "";
  const FCC_AUTH_TOKEN = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
  const FCC_MODEL = Deno.env.get("FCC_MODEL") || "claude-3-freecc-no-thinking/opencode/nemotron-3-ultra-free";
  if (!FCC_BASE_URL) throw new Error("FCC_BASE_URL não configurado");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
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
      signal: controller.signal,
      body: JSON.stringify({
        model: FCC_MODEL,
        max_tokens: 8192,
        stream: false,
        system: systemMsg,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    const raw = await resp.text();
    if (!resp.ok) throw new Error(`FCC ${resp.status}: ${raw.slice(0, 300)}`);
    const data = JSON.parse(raw || "{}");
    const textBlock = (data?.content || []).find((b: any) => b.type === "text");
    const reply = String(textBlock?.text || "").replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
    if (!reply) throw new Error("FCC retornou resposta vazia");
    return reply;
  } finally {
    clearTimeout(timeout);
  }
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
        content: `Abaixo está o enunciado do caso a ser julgado. Elabore a sentença original completa, resolvendo integralmente o caso, seguindo OBRIGATORIAMENTE todas as seções do fluxo (Relatório, Fundamentação, Provas, Questões Jurídicas, Fundamentação Constitucional, Direito Internacional, Inteligência Artificial e Dispositivo):\n\n${body.case}`,
      }];
    }

    // Multi-step: first identify themes, then full analysis
    const isZen = model === "big-pickle" || model === "zen";
    const systemMsg = systemPrompt;
    const userMsg = finalMessages.map((m) => m.content).join("\n\n");

    // Hard timeout global de 25s para o judge-ai inteiro
    const JUDGE_TIMEOUT_MS = 25000;
    const judgeDeadline = Date.now() + JUDGE_TIMEOUT_MS;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let pipelineResult;

          if (isZen) {
            // Etapa 1: Identificar temas jurídicos (timeout reduzido)
            const themesRemaining = judgeDeadline - Date.now();
            if (themesRemaining < 5000) {
              // Sem tempo para 2 etapas, pula direto para análise completa
              pipelineResult = await chatCompletion({
                messages: [
                  { role: "system", content: systemMsg },
                  { role: "user", content: userMsg },
                ],
                model: "big-pickle",
                temperature: 0.3,
                maxTokens: 8192,
              });
            } else {
              const themesResult = await chatCompletion({
                messages: [
                  { role: "system", content: `${systemMsg}\n\nIMPORTANTE: NÃO escreva a sentença ainda. Apenas execute a ETAPA 1 (LEVANTAMENTO): identifique as partes, os fatos, os pedidos e as questões jurídicas controvertidas do caso abaixo (máximo 20 itens).` },
                  { role: "user", content: userMsg },
                ],
                model: "big-pickle",
                temperature: 0.1,
                maxTokens: 2000,
              });

              const themes = themesResult.ok
                ? (themesResult.data?.choices?.[0]?.message?.content || "")
                : "";

              // Etapa 2: Análise completa com temas identificados
              const fullPrompt = themes
                ? `${systemMsg}\n\nLEVANTAMENTO IDENTIFICADO NA ETAPA ANTERIOR:\n${themes}\n\nAgora elabore a sentença COMPLETA do caso, seguindo TODAS as seções do fluxo (Relatório, Fundamentação, Provas, Questões Jurídicas, Fundamentação Constitucional, Direito Internacional, Inteligência Artificial e Dispositivo). Use SOMENTE artigos que existem de fato na legislação vigente.`
                : systemMsg;

              pipelineResult = await chatCompletion({
                messages: [
                  { role: "system", content: fullPrompt },
                  { role: "user", content: userMsg },
                ],
                model: "big-pickle",
                temperature: 0.3,
                maxTokens: 8192,
              });
            }
          } else {
            // Cadeia cloud-first:
            // 1) Claude FCC (primário) → 2) OpenCode Zen (nuvem, gratuito) → 3) chatCompletion (Gemini, sem Emergent por padrão)
            let cloudReply = "";
            let usedProvider = "";
            try {
              const fccReply = await callJudgeClaudeFCC(systemMsg, userMsg);
              cloudReply = fccReply;
              usedProvider = "claude-fcc";
            } catch (fccErr) {
              console.warn("[judge-ai] FCC falhou, tentando Zen/Gemini:", (fccErr as Error)?.message);
            }
            if (!cloudReply.trim()) {
              const zenResult = await zenChat(systemMsg, userMsg);
              if (zenResult.ok) {
                cloudReply = zenResult.text;
                usedProvider = `zen/${zenResult.model}`;
              } else {
                console.warn("[judge-ai] Zen indisponível, tentando Gemini:", zenResult.error);
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
                } else {
                  console.warn("[judge-ai] Gemini falhou:", cc.error);
                }
              }
            }
            if (cloudReply.trim()) {
              pipelineResult = {
                ok: true as const,
                data: { choices: [{ message: { content: cloudReply } }] },
                provider: usedProvider,
                model,
              };
            } else {
              // Todos falharam
              pipelineResult = {
                ok: false as const,
                error: "Todos os provedores de IA falharam. Tente novamente em instantes.",
                provider: "none",
              };
            }
          }

          const reply = pipelineResult.ok
            ? (pipelineResult.data?.choices?.[0]?.message?.content || "Sem resposta.")
            : `Erro: ${pipelineResult.error}`;

          console.log("[judge-ai] Provider:", pipelineResult.provider, "model:", model);

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
