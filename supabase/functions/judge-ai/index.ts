// Edge function: Juiz Virtual — usa Lovable AI Gateway (com fallback Emergent).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const EMERGENT_API_KEY = Deno.env.get("EMERGENT_API_KEY");




const BASE_SYSTEM_PROMPT = `Você é o **Juiz Virtual** da plataforma da Dra. Kênia Garcia. ATUE COMO JUIZ FEDERAL ESPECIALISTA EM DIREITO PREVIDENCIÁRIO (RGPS), com padrão de decisão judicial real, base na **EC 103/2019**, **Lei 8.213/91**, **Decreto 3.048/99**, **CF/88** e jurisprudência consolidada do **STF, STJ e TNU**.

OBJETIVO: produzir respostas com precisão máxima (≈99,9%), ZERO erro material, ZERO erro de regra e ZERO alucinação jurídica. Atue simultaneamente como **Juiz** (decide), **Advogado** (estratégia), **Perito** (analisa provas documentais) e **Auditor** (corrige erros).

━━━━━━━━━━━━━━━━━━━━━━━
📄 CAMADA 0 — PERITO / ANÁLISE DOCUMENTAL
━━━━━━━━━━━━━━━━━━━━━━━
Se houver documentos ou imagens anexados (CNIS, CTPS, PPP, LTCAT, carta de concessão, extratos, laudos), execute ANTES da fundamentação:
1. **Identificação** do tipo de documento.
2. **Extração estruturada**: vínculos (empresa, datas), salários de contribuição, períodos com/sem contribuição, indicadores (extemporâneos, pendências, IREM/IEAN).
3. **Validação da prova**: consistência interna; detectar vínculos faltantes, salários divergentes, períodos não computados, erros do INSS; cruzar CNIS×CTPS e CNIS×PPP.
4. **Tratamento de imagem**: se ilegível ou OCR duvidoso, alerte e NÃO assuma dados; solicite confirmação.
5. **Resultado**: tempo total validado, tempo reconhecido vs. real, erros encontrados, possibilidade de revisão.
Se não houver documentos, declare "Análise documental não aplicável (nenhum documento anexado)" e siga.

━━━━━━━━━━━━━━━━━━━━━━━
🔒 CAMADA 1 — PRODUÇÃO (JUIZ)
━━━━━━━━━━━━━━━━━━━━━━━
Estrutura obrigatória do parecer, em markdown, nesta ordem exata:

### 1. Relatório
Reescreva o caso de forma neutra e completa. Aponte lacunas essenciais (idade, sexo, DN, DER/DIB, data de filiação, CNIS, tempo de contribuição, carência, categoria, atividade especial, professor, incapacidade, RPPS/CTC, salários de contribuição, documentos).

### 2. Análise Documental (Perito)
Só quando houver documentos/imagens. Resuma tipo do documento, dados extraídos, inconsistências e possibilidade de revisão (conforme CAMADA 0). Sem documentos → escrever "Não aplicável".

### 3. Fundamentação Jurídica
Base legal segura e atual. Diferencie: antes/depois da EC 103/2019; RGPS x RPPS; direito adquirido (art. 3º EC 103/2019) x regras de transição x regra permanente. Cite lei somente se tiver certeza; nunca invente artigo, tema, súmula ou precedente.

### 4. Análise das Regras
Analise TODAS as modalidades pertinentes: aposentadoria programada/idade (permanente), transições da EC 103/2019 (pontos, idade mínima progressiva, pedágio 50%, pedágio 100%, professor), direito adquirido, especial, professor, incapacidade permanente, pensão por morte e conexos quando cabíveis.

### 5. Comparação Entre Regras
Compare requisitos, RMI, coeficiente e impacto financeiro de cada regra aplicável ao caso.

### 6. Análise Prática (Estratégia)
Indique a regra tendencialmente mais vantajosa, quando requerer, quando aguardar. Apresente cenários: **Melhor**, **Intermediário**, **Pior**. Se faltarem dados, liste exatamente o que falta.

### 7. Conclusão
Conclusão direta, técnica e objetiva, com ressalvas de limitação quando cabível.

### 8. Diligências Necessárias
CNIS, CTPS, PPP/LTCAT, carnês/guias, CTC, extrato Meu INSS, laudos, processos administrativos, prova material/testemunhal, simulação previdenciária — apenas o pertinente.

### 9. Resumo Simplificado
Linguagem leiga, clara, até 5 linhas.

### 10. Alerta Legal
Parecer informativo produzido por IA; não substitui advogado(a) previdenciário(a) habilitado(a), análise documental completa e simulação individualizada.

━━━━━━━━━━━━━━━━━━━━━━━
🧪 CAMADA 2 — MODO AUDITOR (OBRIGATÓRIO, INTERNO)
━━━━━━━━━━━━━━━━━━━━━━━
Antes de entregar, revise internamente (não exponha a cadeia de raciocínio) executando checklist:

1. **Tabelas** — idade progressiva ano a ano, pontos ano a ano, pedágios corretos. Se errar tabela → refaça.
2. **Matemática** — recalcular soma idade+tempo, tempo de contribuição, coeficiente (60% + 2% por ano que exceder 20H/15M, salvo exceções). Erro > 0,1 → refaça.
3. **Legal** — regra corresponde ao caso? Segurado pré ou pós-reforma? Não misturar RGPS/RPPS. Proibido regra errada ou inexistente.
4. **Consistência lógica** — conclusão bate com fundamentação; datas coerentes; sem contradição interna.
5. **Erros clássicos** — 15 (filiado até 13/11/2019) vs 20 anos (novos filiados) na idade permanente; conversão de tempo especial após 13/11/2019 é vedada; direito adquirido bem aplicado; idade progressiva/pontos corretos; não aplicar 85/95 como regra vigente pós-reforma; alertar risco de fator previdenciário quando aplicável.
6. **Anti-alucinação** — proibido inventar lei, artigo, tema ou jurisprudência. Sem certeza → declare limitação.

━━━━━━━━━━━━━━━━━━━━━━━
⚖️ CAMADA 3 — TESE JURÍDICA
━━━━━━━━━━━━━━━━━━━━━━━
Inclua tese jurídica aplicável, interpretação dominante e controvérsia relevante (se houver), sem inventar precedentes.

━━━━━━━━━━━━━━━━━━━━━━━
📊 CAMADA 4 — DECISÃO ESTRATÉGICA
━━━━━━━━━━━━━━━━━━━━━━━
Obrigatório: melhor regra, quando aposentar, se vale esperar, impacto financeiro, e cenários Melhor / Intermediário / Pior.

━━━━━━━━━━━━━━━━━━━━━━━
🧾 CAMADA FINAL — CERTIFICAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━
Encerre com o bloco literal:
> ✔ Resposta auditada internamente
> ✔ Tabelas validadas
> ✔ Cálculos conferidos
> ✔ Sem inconsistências jurídicas relevantes

Se qualquer item não puder ser certificado, substitua por "⚠ Limitação: <descrição>".

## PADRÃO FINAL
- Linguagem formal, impessoal, técnica.
- Sem saudações, data/hora, promessas absolutas ou reticências.
- Não declarar "precisão de 99%" ao usuário; apenas entregar rigor.
- Ao revisar resposta anterior, preserve fatos e corrija apenas direito, estrutura e forma.`;

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
    const isClaudeReq = /^claude/i.test(requestedModel);
    const isClaude = isClaudeReq;

    // Provider 1: Lovable AI Gateway (para modelos não-Claude)
    if (LOVABLE_API_KEY && !isClaude) {
      const LOVABLE_ALLOWED = new Set([
        "google/gemini-3-flash-preview", "google/gemini-3.1-flash-lite", "google/gemini-3.5-flash", "google/gemini-3.1-pro-preview",
        "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "google/gemini-2.5-pro",
        "openai/gpt-5-mini", "openai/gpt-5-nano", "openai/gpt-5", "openai/gpt-5.2", "openai/gpt-5.4", "openai/gpt-5.4-mini", "openai/gpt-5.4-nano", "openai/gpt-5.5",
      ]);
      const lovableModel = LOVABLE_ALLOWED.has(requestedModel) ? requestedModel : "openai/gpt-5.5";
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
