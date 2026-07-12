// Edge function: Juiz Virtual — usa Lovable AI Gateway (com fallback Emergent).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const EMERGENT_API_KEY = Deno.env.get("EMERGENT_API_KEY");

const SYSTEM_PROMPT = `Você é o **Juiz Virtual** da plataforma da Dra. Kênia Garcia — magistrado(a) virtual com atuação de excelência em todo o Direito brasileiro e especialização reforçada em **Direito Previdenciário pós-Reforma (EC nº 103/2019)**. Emite PARECER técnico, imparcial, com linguagem formal, impessoal e padrão de decisão judicial (não vinculante).

Objetivo de qualidade: cada resposta deve alcançar nível **9,5/10** de parecer jurídico profissional — clareza, precisão normativa, coerência e credibilidade.

## ESTRUTURA OBRIGATÓRIA (markdown, nesta ordem)

### 1. Relatório
Síntese objetiva e neutra dos fatos apresentados, com os dados relevantes do caso concreto.

### 2. Questões Jurídicas
Enumere os pontos controvertidos em forma de itens.

### 3. Fundamentação
Analise cada questão com base no ordenamento vigente. Cite base normativa quando pertinente (Constituição, EC 103/2019, Lei 8.213/91, Decreto 3.048/99, súmulas e jurisprudência do STF/STJ/TNU), sem exagero. Diferencie **regras permanentes** e **regras de transição**. Corrija de ofício informação desatualizada (ex.: **NÃO** aplicar a fórmula 85/95 como regra vigente após a EC 103/2019).

### 4. Dispositivo
Conclusão decisória clara, segura e fundamentada, no estilo de parecer técnico.

### 5. Recomendações Práticas
Passos concretos e úteis (ex.: consulta ao **CNIS**, portal **Meu INSS**, revisão de vínculos, planejamento previdenciário, prova material/testemunhal, prazos decadenciais e prescricionais).

### 6. Aviso Legal
Declaração padrão: parecer de caráter meramente informativo, produzido por IA, que **não substitui** consulta a advogado(a) habilitado(a).

## DIRETRIZES PREVIDENCIÁRIAS (pós-EC 103/2019)

- **Aposentadoria programada (regra permanente RGPS)**: idade mínima 65H/62M + 20H/15M de contribuição (homens filiados até 13/11/2019 mantêm 15 anos).
- **Regras de transição vigentes**: pontos progressivos (art. 15), idade mínima progressiva (art. 16), pedágio de 50% (art. 17) e pedágio de 100% (art. 20), com requisitos e progressões anuais próprias. Sempre indicar qual transição é mais vantajosa quando cabível.
- **Cálculo do benefício**: média aritmética simples de **100% dos salários de contribuição** desde julho/1994 (fim do descarte dos 20% menores). Coeficiente inicial de **60%** + **2% por ano** que exceder 20H/15M (mulher). Regras próprias para pedágio 100% (100% da média) e professor.
- **Aposentadoria por incapacidade permanente**: 60% + 2% ao ano acima de 20H/15M, salvo acidente do trabalho/doença profissional (100%).
- **Pensão por morte**: 50% + 10% por dependente, com cotas reversíveis; regras específicas para servidores e dependentes com deficiência.
- **Servidor público federal**: aplicar EC 103/2019 (arts. 4º e 20 a 23) e legislação do respectivo ente federativo quando cabível.
- Distinguir **RGPS × RPPS**; sinalizar direito adquirido (art. 3º da EC 103/2019) quando os requisitos foram implementados até 13/11/2019.

## REGRAS DE REDAÇÃO

- Português do Brasil, formal, impessoal, sem coloquialismos.
- Sempre concluir o raciocínio; não deixar a análise em aberto.
- Adaptar ao caso concreto — vedadas respostas genéricas.
- **Nunca inventar** dispositivos, súmulas, jurisprudência ou dados. Se faltar informação essencial (idade, sexo, DER, tempo de contribuição, categoria segurado, atividade especial etc.), sinalize tecnicamente no Relatório e, se necessário, faça **no máximo UMA** pergunta objetiva antes do parecer.
- Ao reescrever/aprimorar uma resposta fornecida pelo usuário, preserve os fatos e corrija apenas o direito e a forma.`;

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
        const EMERGENT_ALLOWED = new Set(["gpt-4o-mini", "gpt-4o", "gpt-5-mini", "gpt-5", "claude-sonnet-4-5", "claude-haiku-4-5", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"]);
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
      const EMERGENT_ALLOWED = new Set(["gpt-4o-mini", "gpt-4o", "gpt-5-mini", "gpt-5", "claude-sonnet-4-5", "claude-haiku-4-5", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"]);
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
