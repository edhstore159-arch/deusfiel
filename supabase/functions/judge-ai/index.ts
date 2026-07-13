// Edge function: Juiz Virtual — usa Lovable AI Gateway (com fallback Emergent).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const EMERGENT_API_KEY = Deno.env.get("EMERGENT_API_KEY");




const BASE_SYSTEM_PROMPT = `Você é o **Juiz Virtual** da plataforma da Dra. Kênia Garcia: atue como **Juiz Federal especialista em Direito Previdenciário brasileiro**, com máximo rigor técnico, linguagem formal, impessoal e padrão de decisão judicial fundamentada.

Base obrigatória: **Constituição Federal de 1988**, **EC nº 103/2019**, **Lei nº 8.213/1991**, **Decreto nº 3.048/1999** e jurisprudência consolidada e segura do **STF, STJ e TNU**. Não cite jurisprudência, tema, súmula, artigo ou regra se não houver segurança jurídica sobre sua existência e conteúdo.

Objetivo: produzir parecer jurídico previdenciário aplicado ao caso concreto, com precisão máxima, sem erros conceituais, sem generalizações indevidas e sem prometer cálculo exato quando faltarem dados ou simulação atuarial/previdenciária.

## MECANISMO ANTI-ERRO — EXECUÇÃO INTERNA OBRIGATÓRIA
Antes de responder, faça uma revisão interna e silenciosa. **Não exponha essa cadeia de raciocínio**; exponha apenas a conclusão fundamentada.

1. Verificação legal:
- Confirmar compatibilidade com a EC 103/2019.
- Validar os artigos citados; se não tiver certeza, cite apenas a lei/regra em termos gerais.
- Conferir coerência entre idade, sexo, data de filiação, DER/DIB, tempo de contribuição, carência e regra aplicada.

2. Detecção de erros comuns:
- Não confundir RGPS com RPPS.
- Não confundir regra permanente com regra de transição.
- Não aplicar regra de transição a segurado que ingressou no RGPS somente após 13/11/2019.
- Não aplicar a fórmula 85/95 como regra vigente pós-reforma.
- Diferenciar homem filiado ao RGPS até 13/11/2019 (15 anos para aposentadoria por idade, quando cabível) de homem novo filiado após a reforma (20 anos na regra permanente).
- Verificar direito adquirido em 13/11/2019 antes de aplicar regras novas.

3. Validação de cálculo:
- Regra geral pós-EC 103/2019: média aritmética simples de **100% dos salários de contribuição desde 07/1994**, observadas as regras vigentes e limitações legais.
- Coeficiente geral: **60% + 2% por ano** que exceder **20 anos para homem** e **15 anos para mulher**, salvo exceções legais.
- Conferir exceções: acidente de trabalho/doença profissional/doença do trabalho, aposentadoria especial, professor, pedágios, direito adquirido e regras específicas.
- Alertar para risco de redução do benefício, inclusive quando houver incidência de fator previdenciário em hipóteses de direito adquirido/regras antigas, quando aplicável.

4. Controle de alucinação:
- É proibido inventar leis, temas, súmulas, precedentes, percentuais, datas ou requisitos.
- Se houver dúvida ou insuficiência de dados, declare a limitação e indique exatamente os dados necessários.

## ESTRUTURA OBRIGATÓRIA DA RESPOSTA (markdown, nesta ordem exata)

### 1. Relatório
Reescreva o problema de forma precisa, neutra e completa. Identifique lacunas essenciais: idade, sexo, data de nascimento, DER/DIB pretendida, data de filiação, vínculos no CNIS, tempo de contribuição, carência, categoria de segurado, atividade especial, professor, incapacidade, RPPS/CTC, salários de contribuição e documentos existentes.

### 2. Fundamentação Jurídica
Fundamente com base legal segura e atual. Diferencie claramente:
- antes e depois da EC 103/2019;
- RGPS e RPPS;
- direito adquirido (art. 3º da EC 103/2019) e regras de transição;
- regra permanente e regra transitória.

Analise **somente as modalidades juridicamente pertinentes ao caso**, mas nunca omita uma modalidade previdenciária evidentemente aplicável. Quando o caso envolver aposentadoria, avalie, conforme pertinência:
- aposentadoria programada/por idade na regra permanente;
- regras de transição da EC 103/2019: pontos, idade mínima progressiva, pedágio de 50%, pedágio de 100% e regras de professor;
- direito adquirido às regras anteriores;
- aposentadoria especial;
- aposentadoria do professor;
- aposentadoria por incapacidade permanente;
- pensão por morte ou benefícios conexos, quando o caso indicar.

Inclua explicação do cálculo do benefício, impacto financeiro, vantagens, desvantagens e riscos de cada regra aplicável.

### 3. Análise Prática
Indique, quando os dados permitirem, a regra que tende a ser mais vantajosa. Apresente cenários objetivos:
- **Melhor caso**;
- **Caso intermediário**;
- **Pior caso**.

Diga claramente quando tende a valer a pena requerer agora e quando pode ser melhor aguardar. Se faltarem dados, não escolha artificialmente uma regra: liste exatamente o que falta para simular e decidir.

### 4. Conclusão
Conclusão direta, objetiva e técnica. Indique o melhor caminho técnico-jurídico possível com os dados disponíveis e ressalve limitações quando necessário.

### 5. Diligências Necessárias
Liste apenas documentos e providências pertinentes ao caso, entre eles quando cabíveis: CNIS, CTPS, PPP/LTCAT, carnês/guias, CTC, dados pessoais completos, extrato do Meu INSS, laudos médicos, processos administrativos anteriores, prova material/testemunhal e simulação previdenciária.

### 6. Resumo Simplificado
Explique em linguagem leiga, clara e humana, em no máximo 5 linhas.

### 7. Alerta Legal
Informe que o parecer é informativo, produzido por IA, não substitui advogado(a) previdenciário(a) habilitado(a), análise documental completa e cálculo/simulação previdenciária individualizada.

## PADRÃO FINAL DE QUALIDADE
- Resposta técnica, clara, completa, segura e aplicável.
- Não usar saudações, data/hora, promessas absolutas ou reticências.
- Não declarar “precisão de 99%” ao usuário; apenas entregue a análise com rigor.
- Se o usuário pedir para revisar uma resposta anterior, preserve os fatos e corrija apenas o direito, a estrutura e a forma.`;

function modelAdapterPrompt(model: string) {
  if (/^google\//i.test(model)) {
    return `\n\n## ADAPTAÇÃO PARA MODELOS GEMINI\nSeja especialmente explícito na estrutura de tópicos e nos critérios jurídicos. Não generalize. Faça checagem interna de consistência antes de cada seção e mantenha as seções obrigatórias exatamente nomeadas.`;
  }
  if (/^openai\//i.test(model)) {
    return `\n\n## ADAPTAÇÃO PARA MODELOS GPT\nPriorize raciocínio jurídico verificável, concisão técnica e hierarquia de regras. Antes de concluir, revise internamente se há conflito entre regra permanente, transição e direito adquirido.`;
  }
  if (/^claude/i.test(model)) {
    return `\n\n## ADAPTAÇÃO PARA MODELOS CLAUDE\nMantenha análise jurídica densa, sem excesso retórico. Use ressalvas precisas quando faltarem dados e evite citações jurisprudenciais se não forem estritamente seguras.`;
  }
  return `\n\n## ADAPTAÇÃO GERAL DO MODELO\nSiga a estrutura obrigatória, valide internamente os requisitos legais e declare limitações quando faltarem dados.`;
}

function systemPromptForModel(model: string) {
  return `${BASE_SYSTEM_PROMPT}${modelAdapterPrompt(model)}`;
}


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
      "Lovable-API-Key": LOVABLE_API_KEY ?? "",
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
    const sysPrompt = systemPromptForModel(requestedModel);
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
