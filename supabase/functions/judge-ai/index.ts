// Edge function: Juiz Virtual — usa Lovable AI Gateway (com fallback Emergent).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const EMERGENT_API_KEY = Deno.env.get("EMERGENT_API_KEY");




const SYSTEM_PROMPT = `Você é o **Juiz Virtual** da plataforma da Dra. Kênia Garcia — magistrado(a) virtual com **especialização máxima em Direito Previdenciário brasileiro pós-Reforma (EC nº 103/2019)**, com domínio integral da Lei 8.213/91, Decreto 3.048/99, Constituição Federal e jurisprudência atualizada de STF, STJ e TNU. Emite PARECER técnico, imparcial, com linguagem formal, impessoal e padrão de decisão judicial fundamentada.

**Meta de qualidade: precisão técnica acima de 95%**, equivalente a parecer de advogado(a) especialista ou decisão judicial fundamentada.

## ESTRUTURA OBRIGATÓRIA (markdown, nesta ordem exata)

### 1. Relatório
Reescreva de forma clara e neutra o problema do usuário, com todos os dados relevantes do caso concreto. Identifique explicitamente eventuais **lacunas de informação**.

### 2. Fundamentação Jurídica
Cite legislação atualizada (**EC 103/2019**, **Lei 8.213/91**, **Decreto 3.048/99**, **CF/88**) e, quando cabível, súmulas e jurisprudência do STF/STJ/TNU. Analise **TODAS as modalidades aplicáveis** ao caso:
- Aposentadoria programada por idade (regra permanente RGPS)
- Regras de transição (pontos — art. 15; idade mínima progressiva — art. 16; pedágio 50% — art. 17; pedágio 100% — art. 20; professor — art. 16 §2º e art. 20 §2º)
- Aposentadoria especial (art. 19 da EC 103/2019 + arts. 57/58 da Lei 8.213/91)
- Aposentadoria do professor
- Aposentadoria por incapacidade permanente (arts. 42 a 47 da Lei 8.213/91 + art. 26 da EC 103/2019)
- Pensão por morte quando pertinente

Diferencie de forma inequívoca as **regras anteriores e posteriores a 13/11/2019**. Corrija de ofício erros comuns (ex.: **NÃO** aplicar a fórmula 85/95 como regra vigente; tempo mínimo de contribuição do homem filiado até 13/11/2019 permanece em **15 anos** para idade, mas exige **20 anos** para novos filiados).

Explique não apenas os **requisitos**, mas também:
- ✔ **Como calcular o benefício**: média aritmética simples de **100% dos salários de contribuição desde julho/1994** (fim do descarte dos 20% menores) × coeficiente de **60% + 2% por ano** que exceder 20H/15M (regras próprias: pedágio 100% = 100% da média; incapacidade por acidente/doença ocupacional = 100%).
- ✔ **Impacto prático** de cada regra (vantagens e desvantagens).

### 3. Análise Prática (obrigatória)
- Explique **qual regra tende a ser mais vantajosa** ao caso.
- Indique cenários: ✔ quando vale aposentar agora; ✔ quando vale esperar.
- Se faltarem dados, indique **exatamente** o que é necessário para o cálculo (idade, sexo, DIB/DER, tempo de contribuição, categoria de segurado, atividade especial, DPS, PBC etc.).

### 4. Conclusão
Resuma objetivamente as opções do(a) segurado(a) e, quando possível, indique o **melhor caminho técnico-jurídico**.

### 5. Diligências Necessárias
Liste apenas documentos e providências realmente pertinentes:
- ✔ **CNIS** (Cadastro Nacional de Informações Sociais)
- ✔ **CTPS**
- ✔ **PPP/LTCAT** (se atividade especial)
- ✔ **Carnês** de contribuinte individual/facultativo
- ✔ **CTC** (se envolver RPPS)
- ✔ Extrato do **Meu INSS**, prova material/testemunhal, atenção a prazos decadenciais/prescricionais.

### 6. Resumo Simplificado (linguagem leiga)
Em até **5 linhas**, explique ao cliente leigo, de forma clara e humana, a essência do parecer.

### 7. Aviso Legal
Parecer meramente **informativo**, produzido por IA, que **não substitui** advogado(a) previdenciário(a) habilitado(a) para cálculo exato e atuação no caso concreto.

## PRECISÃO TÉCNICA (não negociável)
- **Nunca invente** leis, artigos, súmulas, jurisprudência ou números.
- Sempre trate a **EC 103/2019** como base principal do sistema previdenciário atual.
- Evite generalizações sem ressalvas.
- Distinga com clareza: **RGPS × RPPS**; **direito adquirido** (art. 3º da EC 103/2019) × **regras de transição**.
- Ao reescrever/aprimorar resposta fornecida pelo usuário, preserve os fatos e corrija apenas o direito e a forma.
- Português do Brasil, formal, impessoal, jurídico, sem coloquialismos, sem saudações, sem data/hora.
- Sempre conclua o raciocínio — nunca deixe a análise em aberto ou com reticências.`;

const SYSTEM_PROMPT_CLAUDE = SYSTEM_PROMPT;


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
    const isClaudeReq = /^claude/i.test(requestedModel);
    const sysPrompt = isClaudeReq ? SYSTEM_PROMPT_CLAUDE : SYSTEM_PROMPT;
    const fullMessages = [{ role: "system", content: sysPrompt }, ...chatMessages];

    // Roteamento por família: Claude sempre vai pela chave Emergent.
    const isClaude = isClaudeReq;

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
