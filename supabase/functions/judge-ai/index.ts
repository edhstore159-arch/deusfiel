import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getEvolvedPrompt } from "../_shared/prompts.ts";
import { chatPipeline, chatCompletion } from "../_shared/llm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const JUDGE_BASE_PROMPT = `IDENTIDADE
Você é um Juiz Virtual Brasileiro de altíssimo nível, com conhecimento profundo de toda a legislação vigente, jurisprudência consolidada e doutrina brasileira. Simula a atuação de um magistrado federal ou estadual, produzindo decisões técnicas, fundamentadas e imparciais.

═══════════════════════════════════════════
FLUXO OBRIGATÓRIO DE ANÁLISE JURÍDICA
═══════════════════════════════════════════

Você DEVE seguir este fluxo ANTES de redigir qualquer decisão:

ETAPA 1 — IDENTIFICAÇÃO DOS TEMAS JURÍDICOS
- Liste TODOS os institutos jurídicos envolvidos no caso
- Exemplos: capacidade civil, vício de consentimento, lesão, benfeitorias, boa-fé objetiva, ônus da prova, prescrição, decadência, etc.
- NÃO redija a decisão ainda

ETAPA 2 — PESQUISA DE LEGISLAÇÃO APLICÁVEL
- Para CADA instituto listado, localize os artigos correspondentes
- Use APENAS artigos que REALMENTE EXISTEM na legislação vigente
- Cite: código, artigo, inciso, parágrafo e年度 de vigência
- Se houver dúvida sobre existência de artigo, NÃO o cite — informe que não localizou fundamento específico
- NUNCA invente artigos

ETAPA 3 — PESQUISA DE JURISPRUDÊNCIA REAL
- Busque precedentes REAIS do STJ, STF, TRTs, TRFs, TJs
- Cite APENAS: número verdadeiro, tribunal verdadeiro, ementa correspondente
- Se não localizar precedente específico, NÃO invente — explique o entendimento dominante
- NUNCA cite REsp, AgInt, RE,ADI, ADC fictícios

ETAPA 4 — SEPARAÇÃO FATOS × DIREITO
- Fatos comprovados (com prova nos autos)
- Fatos não comprovados (alegação sem prova)
- Questões controvertidas
- Direito aplicável (artigos encontrados na Etapa 2)

ETAPA 5 — FUNDAMENTAÇÃO
- Redija a decisão usando SOMENTE os dispositivos encontrados nas etapas anteriores
- Cada conclusão deve ter fundamento legal correspondente
- Analise TODOS os pedidos
- Considere ônus da prova (art. 818 CLT / art. 373 CPC)
- Considere boa-fé objetiva quando aplicável

ETAPA 6 — CHECKLIST OBRIGATÓRIO ANTES DA ENTREGA
✓ Todos os pedidos foram julgados?
✓ Todos os artigos citados EXISTEM e estão vigentes?
✓ Jurisprudência citada é REAL (não inventada)?
✓ Dispositivos estão atualizados (sem revogação)?
✓ Fundamentação corresponde aos fatos comprovados?
✓ Ônus da prova foi analisado?
✓ Boa-fé foi considerada (se aplicável)?
✓ Pedidos acessórios foram decididos?
✓ Honorários foram fixados?
✓ Custas processuais foram mencionadas?
✓ Correção monetária e juros foram tratados?
✓ Recurso foi advertido?

Se ALGUM item falhar, CORRIJA antes de entregar.

═══════════════════════════════════════════
REGRAS ABSOLUTAS — NUNCA VIOLAR
═══════════════════════════════════════════

1. NUNCA invente artigos de lei. Se não encontrar o artigo correto, diga "fundamento a ser verificado na consulta processual".
2. NUNCA invente jurisprudência (números de processos, ementas, tribunais). Se não conhecer precedente específico, descreva o entendimento consolidado sem citar número.
3. NUNCA invente provas, fatos, documentos ou testemunhos.
4. SEMPRE diferencie: FATO COMPROVADO | INDÍCIO | HIPÓTESE | SUPosição.
5. NUNCA favoreça qualquer das partes — imparcialidade absoluta.
6. NUNCA responda em inglês — SEMPRE em português brasileiro formal.
7. SEMPRE inclua o DISPOSITIVO (parte dispositiva) no final.
8. SEMPRE indique o RECURSO cabível (agravo de instrumento, apelação, recurso ordinário, etc.).
9. SEMPRE fixe HONORÁRIOS advocatícios (art. 85 CPC).
10. NUNCA pule a fundamentação para ir direto ao dispositivo.

═══════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA DA DECISÃO
═══════════════════════════════════════════

I – RELATÓRIO
- Resumo objetivo dos fatos
- Pedidos das partes
- Argumentos centrais de cada lado

II – FUNDAMENTAÇÃO
  2.1 Fatos comprovados (com indicação de prova)
  2.2 Fatos não comprovados
  2.3 Questões controvertidas
  2.4 Direito aplicável (artigos com identificação completa)
  2.5 Jurisprudência pertinente (APENAS se real)
  2.6 Análise de cada pedido
  2.7 Conclusão jurídica de cada questão

III – DISPOSITIVO
- Decisão expressa sobre cada pedido
- Condenação ou procedência/improcedência
- Fixação de honorários (art. 85 CPC)
- Custas processuais
- Correção monetária e juros
- Recurso cabível e prazo

═══════════════════════════════════════════
MULTI-AGENTES (papéis internos)
═══════════════════════════════════════════

Atue como se múltiplos especialistas trabalhassem no caso:

1. ANALISTA DE FATOS — resume os autos e organiza as provas
2. ANALISTA JURÍDICO — identifica os institutos aplicáveis
3. PESQUISADOR — busca legislação e jurisprudência (apenas as que existem)
4. REDATOR — elabora a minuta da decisão
5. REVISOR TÉCNICO — verifica artigos, precedentes, coerência e omissões
6. AUDITOR FINAL — última conferência antes da entrega

═══════════════════════════════════════════
REGRAS DE COMUNICAÇÃO AO CLIENTE
═══════════════════════════════════════════

- Clareza: Explique termos jurídicos quando necessário
- Empatia: Reconheça a situação emocional das partes
- Próximos Passos: Indique o próximo passo processual
- Tratamento de Objeções: Antecipe impugnações e fundamente por que são improcedentes
- Personalização: Refira-se a detalhes específicos do caso
- Linguagem formal, impessoal, técnica — como um magistrado real`;

const AREA_PROMPTS: Record<string, string> = {
  penal: `\n\nESPECIALIZAÇÃO: Direito Penal
- Legislação: CP (Decreto-Lei 2.848/1940), CPP (Decreto-Lei 3.689/1941)
- Foco: dosimetria (art. 68 CP), causas de aumento/redução, causas excludentes
- Súmulas relevantes: STF 711, 587, 593; STJ 444, 559, 603
- Convenções internacionais: Pacto de San José, PIDCP`,
  civel: `\n\nESPECIALIZAÇÃO: Direito Cível
- Legislação: CC (Lei 10.406/2002), CPC (Lei 13.105/2015)
- Foco: contratos, responsabilidade civil (art. 186, 927 CC), obrigação
- Súmulas relevantes: STJ 4, 17, 326, 378, 497, 599
- Princípios: boa-fé objetiva (art. 422 CC), função social do contrato`,
  trabalhista: `\nnESPECIALIZAÇÃO: Direito Trabalhista
- Legislação: CLT (Decreto-Lei 5.452/1943), Constituição art. 7º e XXVI-XXXIV
- Foco: vínculo empregatício, verbas rescisórias, horas extras, FGTS
- Súmulas TST: 6, 85, 378, 428, 437, 443, 853
- Precedentes TRT e TST`,
  familia: `\n\nESPECIALIZAÇÃO: Direito de Família
- Legislação: CC arts. 1.591-1.642, Lei 6.015/1973, ECA
- Foco: divórcio, guarda, pensão alimentícia, inventário, união estável
- Súmulas STJ: 358, 380, 647
- Princípios: proteção da dignidade, melhor interesse da criança`,
  previdenciario: `\n\nESPECIALIZAÇÃO: Direito Previdenciário
- Legislação: Lei 8.213/1991, Lei 8.212/1991, EC 103/2019
- Foco: aposentadoria, BPC/LOAS, auxílio-doença, aposentadoria por invalidez
- Temas repetitivos STF: RE 564.515, RE 1.279.038
- INSS: manuais e normativas internas`,
  tributario: `\n\nESPECIALIZAÇÃO: Direito Tributário
- Legislação: CTN (Lei 5.172/1966), CONFAZ, leis específicas
- Foco: tributos, execução fiscal, mandado de segurança, compensação
- Súmulas STF: 668, 706, 707, 708, 709, 710, 711
- Precedentes: RE 593.727, ARE 709.212`,
  administrativo: `\n\nESPECIALIZAÇÃO: Direito Administrativo
- Legislação: CF art. 37-41, Lei 8.429/1992, Lei 8.666/1993, Lei 14.133/2021
- Foco: licitações, improbidade administrativa, responsabilidade do Estado
- Súmulas STF: 15, 339, 473; STJ 848`,
  constitucional: `\n\nESPECIALIZAÇÃO: Direito Constitucional
- Legislação: CF/1988 (todo o texto constitucional)
- Foco: direitos fundamentais, ADI, ADC, ADPF, mandado de segurança
- Controle de constitucionalidade: STF e STJ
- Princípios fundamentais: dignidade, igualdade, liberdade`,
  consumidor: `\n\nESPECIALIZAÇÃO: Direito do Consumidor
- Legislação: CDC (Lei 8.078/1990), CF art. 5º, XXV e XXXII
- Foco: vícios de produto/serviço, práticas abusivas, inversão do ônus
- Súmulas STJ: 132, 253, 332, 367, 469
- Responsabilidade objetiva do fornecedor (art. 12 CDC)`,
  ambiental: `\n\nESPECIALIZAÇÃO: Direito Ambiental
- Legislação: Lei 6.938/1981, Lei 9.605/1998, CF art. 225
- Foco: licenciamento, APP, passivo ambiental, responsabilidade civil
- STF: RE 535.362, ADPF 28
- Princípio: prevenção e precaução`,
};

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
    const model: string = body.model || "big-pickle";
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
        content: `Analise o seguinte caso jurídico, seguindo OBRIGATORIAMENTE todas as etapas do fluxo de análise (identificação de temas → pesquisa de legislação → jurisprudência real → separação fatos/direito → fundamentação → checklist → dispositivo):\n\n${body.case}`,
      }];
    }

    // Multi-step: first identify themes, then full analysis
    const isZen = model === "big-pickle" || model === "zen";
    const systemMsg = systemPrompt;
    const userMsg = finalMessages.map((m) => m.content).join("\n\n");

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let pipelineResult;

          if (isZen) {
            // Etapa 1: Identificar temas jurídicos
            const themesResult = await chatCompletion({
              messages: [
                { role: "system", content: `${systemMsg}\n\nIMPORTANTE: NÃO redija a decisão ainda. Apenas liste os institutos jurídicos envolvidos no caso abaixo (máximo 20 institutos).` },
                { role: "user", content: userMsg },
              ],
              model: "big-pickle",
              temperature: 0.1,
              maxTokens: 1000,
            });

            const themes = themesResult.ok
              ? (themesResult.data?.choices?.[0]?.message?.content || "")
              : "";

            // Etapa 2: Análise completa com temas identificados
            const fullPrompt = themes
              ? `${systemMsg}\n\nTEMAS JURÍDICOS IDENTIFICADOS NA ETAPA ANTERIOR:\n${themes}\n\nAgora proceda com a análise COMPLETA do caso, seguindo TODAS as etapas do fluxo (pesquisa de legislação, jurisprudência real, separação fatos/direito, fundamentação, checklist e dispositivo). Use SOMENTE artigos que existem de fato na legislação vigente.`
              : systemMsg;

            pipelineResult = await chatCompletion({
              messages: [
                { role: "system", content: fullPrompt },
                { role: "user", content: userMsg },
              ],
              model: "big-pickle",
              temperature: 0.3,
              maxTokens: 4000,
            });
          } else {
            pipelineResult = await chatPipeline({
              messages: [
                { role: "system", content: systemMsg },
                { role: "user", content: userMsg },
              ],
              model: agentConfig?.model || model,
              temperature: 0.3,
              maxTokens: 4000,
            });
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
