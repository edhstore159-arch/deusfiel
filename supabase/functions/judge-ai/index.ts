import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getEvolvedPrompt } from "../_shared/prompts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCC_BASE_URL = Deno.env.get("FCC_BASE_URL") || "https://unabashed-vertical-crispness.ngrok-free.dev";
const FCC_AUTH_TOKEN = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
const FCC_MODEL = Deno.env.get("FCC_MODEL") || "claude-3-freecc-no-thinking/nvidia_nim/nvidia/nemotron-3-super-120b-a12b";

const JUDGE_BASE_PROMPT = `IDENTIDADE
Você é um Juiz Virtual Brasileiro especializado em análise técnico-jurídica.
Simula a atuação de um magistrado brasileiro, produzindo decisões fundamentadas.

REGRAS GLOBAIS
- Nunca invente provas, fatos, documentos ou jurisprudência.
- Sempre diferencie: Fato comprovado | Indício | Hipótese | Suposição.
- Nunca favoreça qualquer das partes.
- Linguagem formal, impessoal, técnica.

COMUNICAÇÃO AO CLIENTE:
- Clareza: Explique termos jurídicos de forma simples quando necessário
- Empatia: Reconheça a situação emocional das partes
- Próximos Passos: Sempre indique qual é o próximo passo processual
- Tratamento de Objeções: Antecipe impugnações e fundamente por que são improcedentes
- Personalização: Refira-se a detalhes específicos do caso`;

const AREA_PROMPTS: Record<string, string> = {
  penal: "Especialização em Direito Penal: CP, CPP, dosimetria, causas de aumento/redução, Súmulas STF/STJ.",
  civel: "Especialização em Direito Cível: CC, CPC, contratos, responsabilidade civil, obrigação.",
  trabalhista: "Especialização em Direito Trabalhista: CLT, TST, Súmulas, rescisão, horas extras.",
  familia: "Especialização em Direito de Família: divórcio, guarda, pensão, inventário, união estável.",
  previdenciario: "Especialização em Direito Previdenciário: INSS, aposentadoria, BPC/LOAS, benefícios.",
  tributario: "Especialização em Direito Tributário: CTN, tributos, execução fiscal, mandado de segurança.",
  administrativo: "Especialização em Direito Administrativo: licitações, improbidade, responsabilidade.",
  constitucional: "Especialização em Direito Constitucional: CF/88, direitos fundamentais, ADI, ADC.",
  consumidor: "Especialização em Direito do Consumidor: CDC, práticas abusivas, inversão do ônus.",
  ambiental: "Especialização em Direito Ambiental: Lei 6.938/81, ICMBio, passivo ambiental.",
};

function sseChunk(content: string): Uint8Array {
  const data = JSON.stringify({ choices: [{ delta: { content } }] });
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

function sseDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

async function streamClaudeFCC(
  messages: Array<{ role: string; content: string }>,
  system: string,
  controller: ReadableStreamDefaultController,
) {
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
      max_tokens: 2000,
      stream: false,
      system,
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || ""),
      })),
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`FCC ${resp.status}: ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  const textBlock = (data?.content || []).find((b: any) => b.type === "text");
  const reply = String(textBlock?.text || "").trim();

  // Send as SSE chunks
  const chunkSize = 20;
  for (let i = 0; i < reply.length; i += chunkSize) {
    controller.enqueue(sseChunk(reply.slice(i, i + chunkSize)));
  }
  controller.enqueue(sseDone());
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

    // Build system prompt with evolved prompt from DB
    let systemPrompt = JUDGE_BASE_PROMPT;
    if (area && AREA_PROMPTS[area]) {
      systemPrompt += `\n\n${AREA_PROMPTS[area]}`;
    }

    try {
      const evolved = await getEvolvedPrompt("judge", area || "*");
      if (evolved && evolved.trim().length > 100) {
        systemPrompt = evolved;
        console.log("[judge-ai] Usando prompt evoluído do treinamento");
      }
    } catch (e) {
      console.warn("[judge-ai] Falha ao buscar prompt evoluído:", e);
    }

    // Add temporal context
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

    // Build messages array
    let finalMessages = [...messages];

    // Handle { case: "..." } format from Dstboard/AdminCases
    if (body.case && !messages.length) {
      finalMessages = [{
        role: "user",
        content: `Analise o seguinte caso jurídico e produza um parecer técnico fundamentado:\n\n${body.case}`,
      }];
    }

    // Stream response via SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamClaudeFCC(finalMessages, systemPrompt, controller);
        } catch (err) {
          console.error("[judge-ai] Claude FCC falhou:", err);
          // Fallback: send error as SSE
          controller.enqueue(sseChunk(`Erro ao conectar com Claude: ${(err as Error)?.message || err}`));
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
