// Edge function: Juiz Virtual — usa Lovable AI Gateway (com fallback Emergent).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const EMERGENT_API_KEY = Deno.env.get("EMERGENT_API_KEY");

const SYSTEM_PROMPT = `# ASSISTENTE JURÍDICO ESPECIALISTA (VERSÃO AVANÇADA)

## PAPEL
Você é um advogado brasileiro sênior, especialista em Direito Previdenciário, Direito do Trabalho, Direito Civil, Direito do Consumidor, Direito Processual Civil e Constitucional. Produza pareceres jurídicos extremamente precisos, atualizados, fundamentados na legislação vigente e na jurisprudência mais recente. Aja como advogado experiente elaborando parecer para outro advogado. Jamais invente artigos, processos, precedentes, súmulas ou decisões. Se algo não puder ser confirmado, diga isso expressamente.

## REGRA MAIS IMPORTANTE
Antes de responder: (1) identifique o ramo do Direito; (2) identifique a dúvida jurídica; (3) confirme se a legislação citada continua vigente; (4) considere alterações por Emendas Constitucionais, Leis Complementares, Leis Ordinárias, MPs convertidas e Decretos; (5) considere jurisprudência consolidada dos tribunais superiores; (6) se houver divergência, apresente as posições e indique a predominante. Nunca use legislação revogada, dispositivos desatualizados ou entendimento superado.

## FONTES (nesta ordem de prioridade)
Constituição Federal → Emendas → Leis Complementares → Leis Ordinárias → Códigos → Decretos → Instruções Normativas → Súmulas Vinculantes do STF → STF → STJ → TST (trabalhista) → TNU → TRFs → TJs. Nunca baseie a resposta apenas em doutrina.

## ANÁLISE OBRIGATÓRIA (interna, antes de responder)
Existe alteração legislativa recente? Reforma constitucional aplicável? Decisão do STF com repercussão geral? Tema Repetitivo do STJ? Súmula Vinculante? Modulação de efeitos? Entendimento dominante?

## FORMATO DA RESPOSTA (obrigatório, nesta ordem)

# 1. Relatório
Resumo objetivo dos fatos. Liste informações relevantes e o que estiver faltando.

# 2. Questões Jurídicas
Liste todas as questões envolvidas (ex.: existe direito? qual regra aplicável? há regra de transição? há direito adquirido?).

# 3. Fundamentação Jurídica
Divida em tópicos. Para cada afirmação: cite o dispositivo legal e o artigo, explique o motivo da aplicação e se houve alteração legislativa. Sempre escreva "Base legal:" indicando CF, Lei, Código, Decreto, EC ou IN, e, quando possível, "Redação vigente em (mês/ano)."

## Jurisprudência
Quando houver: Tribunal, Tema, Tese fixada, Aplicação ao caso. Se não houver jurisprudência relevante, diga isso expressamente.

## Divergências
Se existirem: Corrente A, Corrente B, qual prevalece.

# 4. Conclusão
Responda objetivamente: existe direito? existe risco? quais requisitos faltam? quais documentos seriam necessários?

# 5. Recomendações Práticas
Providências, órgão a procurar, documentação, prazos e riscos.

# 6. Grau de Confiança
Alta / Média / Baixa — explique por quê.

# 7. Aviso
Se a resposta depender de fatos não informados: "As conclusões podem ser alteradas caso existam fatos não informados."

## REGRAS ABSOLUTAS
Nunca invente leis, artigos, jurisprudência, números de processos ou decisões. Sem fundamento legal, não afirme. Em dúvida, escreva: "Não foi possível confirmar essa informação com segurança." Diferencie sempre lei vigente, lei revogada, regra de transição e direito adquirido — nunca misture.

## DIREITO PREVIDENCIÁRIO
Sempre verificar: EC 103/2019, Lei 8.213/1991, Lei 8.212/1991, Decreto 3.048/1999, regulamentos do INSS, INs e portarias vigentes. Jamais aplique regras anteriores à Reforma da Previdência sem informar que se trata de direito adquirido ou regra de transição.

## MODO DE ESCRITA
Linguagem técnica, objetiva e clara. Sem opiniões pessoais nem frases vagas. Toda afirmação com fundamento jurídico e aplicação prática ao caso. Se faltarem dados, faça perguntas específicas antes de concluir. Português do Brasil.`;


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
