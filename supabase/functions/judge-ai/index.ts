// Edge function: Juiz Virtual — usa Lovable AI Gateway (com fallback Emergent).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const EMERGENT_API_KEY = Deno.env.get("EMERGENT_API_KEY");

const SYSTEM_PROMPT = `Você é o **Juiz Virtual**, um agente jurídico imparcial da plataforma da Dra. Kênia Garcia.

Sua função é emitir um PARECER técnico, fundamentado e didático, como se fosse uma decisão judicial preliminar (não vinculante), analisando o caso apresentado pelo usuário.

## COMO RESPONDER (obrigatório)

Estruture SEMPRE a resposta nas seções abaixo, nesta ordem e com estes títulos em markdown:

### 1. Relatório
Resuma os fatos apresentados pelo usuário de forma objetiva e neutra.

### 2. Questões controvertidas
Liste os pontos jurídicos em disputa.

### 3. Fundamentação
Analise cada questão à luz do direito brasileiro aplicável. Cite artigos de lei, súmulas e jurisprudência relevante (STF, STJ, TST, TJs) quando pertinente.

### 4. Dispositivo (parecer)
Apresente sua conclusão fundamentada.

### 5. Recomendações práticas
Próximos passos concretos.

### 6. Aviso legal
Deixe claro que é um parecer orientativo produzido por IA.

## REGRAS
- Português do Brasil, tom profissional e didático.
- Sempre concluir o raciocínio.
- No máximo UMA pergunta objetiva antes de emitir o parecer, se faltarem dados essenciais.
- Nunca invente jurisprudência.`;

function jsonError(message: string, status = 200, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callLovable(messages: unknown[], model: string) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });
}

async function callEmergent(messages: unknown[], model: string) {
  return fetch("https://integrations.emergentagent.com/llm/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${EMERGENT_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    const caseText = typeof body?.case === "string" ? body.case.trim() : "";
    const requestedModel = typeof body?.model === "string" ? body.model : "";

    if (!messages && !caseText) {
      return jsonError("Envie 'case' (texto do caso) ou 'messages' (histórico).", 400);
    }

    const chatMessages = messages ?? [{ role: "user", content: caseText }];
    const fullMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...chatMessages];

    // Roteamento por família: Claude sempre vai pela chave Emergent.
    const isClaude = /^claude/i.test(requestedModel);

    // Provider 1: Lovable AI Gateway (para modelos não-Claude)
    if (LOVABLE_API_KEY && !isClaude) {
      const LOVABLE_ALLOWED = new Set([
        "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "google/gemini-2.5-pro",
        "openai/gpt-5-mini", "openai/gpt-5-nano", "openai/gpt-5",
      ]);
      const lovableModel = LOVABLE_ALLOWED.has(requestedModel) ? requestedModel : "google/gemini-2.5-flash";
      const upstream = await callLovable(fullMessages, lovableModel);
      if (upstream.ok) {
        return new Response(upstream.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Judge-Provider": "lovable", "X-Judge-Model": lovableModel },
        });
      }
      const errText = await upstream.text().catch(() => "");
      console.error(`judge-ai lovable failed: ${upstream.status} ${errText}`);
      // Se for 402/429 e houver Emergent, tenta fallback
      if ((upstream.status === 402 || upstream.status === 429) && EMERGENT_API_KEY) {
        const EMERGENT_ALLOWED = new Set(["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"]);
        const emergentModel = EMERGENT_ALLOWED.has(requestedModel) ? requestedModel : "gpt-4o-mini";
        const up2 = await callEmergent(fullMessages, emergentModel);
        if (up2.ok) {
          return new Response(up2.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Judge-Provider": "emergent", "X-Judge-Model": emergentModel },
          });
        }
        const errText2 = await up2.text().catch(() => "");
        console.error(`judge-ai emergent fallback failed: ${up2.status} ${errText2}`);
      }
      const friendly = upstream.status === 402
        ? "Créditos da IA esgotados. Adicione créditos no workspace da Lovable para continuar usando o Juiz Virtual."
        : upstream.status === 429
        ? "Limite de requisições atingido. Tente novamente em instantes."
        : "Falha no gateway de IA.";
      return jsonError(friendly, 200, { provider: "lovable", status: upstream.status });
    }

    // Provider 2 (sem Lovable): Emergent
    if (EMERGENT_API_KEY) {
      const EMERGENT_ALLOWED = new Set(["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"]);
      const emergentModel = EMERGENT_ALLOWED.has(requestedModel) ? requestedModel : "gpt-4o-mini";
      const upstream = await callEmergent(fullMessages, emergentModel);
      if (upstream.ok) {
        return new Response(upstream.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Judge-Provider": "emergent", "X-Judge-Model": emergentModel },
        });
      }
      const errText = await upstream.text().catch(() => "");
      console.error(`judge-ai emergent failed: ${upstream.status} ${errText}`);
      const friendly = upstream.status === 402
        ? "Créditos da chave Emergent esgotados."
        : upstream.status === 429
        ? "Limite de requisições atingido. Tente novamente em instantes."
        : "Falha no gateway de IA.";
      return jsonError(friendly, 200, { provider: "emergent", status: upstream.status });
    }

    return jsonError("Nenhum provedor de IA configurado (LOVABLE_API_KEY ou EMERGENT_API_KEY).", 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 200);
  }
});
