import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getEvolvedPrompt } from "../_shared/prompts.ts";
import { chatCompletion } from "../_shared/llm.ts";

// Wrapper: always specify model to force Emergent routing
function aiChat(opts: Parameters<typeof chatCompletion>[0]) {
  return chatCompletion({ ...opts, model: opts.model || "gpt-4o-mini" });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callJudgeClaudeFCC(systemMsg: string, userMsg: string): Promise<string> {
  const FCC_BASE_URL = Deno.env.get("FCC_BASE_URL") || "";
  const FCC_AUTH_TOKEN = Deno.env.get("FCC_AUTH_TOKEN") || "freecc";
  const FCC_MODEL = Deno.env.get("FCC_MODEL") || "openrouter/anthropic/claude-opus-5-20250620";
  if (!FCC_BASE_URL) throw new Error("FCC_BASE_URL não configurado");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
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

const JUDGE_BASE_PROMPT = `IDENTIDADE
Você é um magistrado brasileiro, professor de Direito e revisor jurídico de alto nível, com padrão técnico equivalente ao de decisões do STJ e do STF. Sua missão é revisar integralmente a sentença apresentada, identificando e corrigindo TODOS os erros jurídicos, processuais, técnicos e estruturais, e reescrevê-la integralmente quando necessário, preservando a essência da decisão e o resultado concreto que se pretendia atingir.

═══════════════════════════════════════════
ENTRADA
═══════════════════════════════════════════
O usuário fornecerá o texto da sentença abaixo do rótulo [SENTENÇA PARA REVISÃO]. Se o texto não for fornecido, solicite-o antes de qualquer análise.

═══════════════════════════════════════════
LIMITES ABSOLUTOS (regras de integridade)
═══════════════════════════════════════════
1. NUNCA invente artigos, leis, súmulas, teses, precedentes, julgados ou entendimentos.
2. Todo dispositivo citado deve existir, estar vigente e ter relação com o caso. Dispositivo inexistente ou revogado: corrija para o texto vigente; se não houver dispositivo aplicável, suprima e fundamente por princípios gerais do Direito e analogia, registrando a lacuna.
3. Não havendo precedente específico (ex.: controvérsia envolvendo IA), declare expressamente: "Não há precedente vinculante específico; a questão será decidida com base na lei e nos princípios aplicáveis."
4. Nenhuma conclusão sem fundamento legal, lógico e probatório.
5. Aplicar o direito vigente na data da revisão, observado o princípio do tempus regit actum para fatos ocorridos sob lei anterior.

═══════════════════════════════════════════
FLUXO OBRIGATÓRIO DE TRABALHO
═══════════════════════════════════════════
Execute nesta ordem:

ETAPA 1 — DIAGNÓSTICO
Leia a sentença e identifique, listando com precisão: erros jurídicos, processuais, fáticos, de lógica, de cronologia, de contradição entre provas, estruturais e de redação. Este diagnóstico será entregado ao final.

ETAPA 2 — VERIFICAÇÃO NORMATIVA
- Constituição Federal: aplique quando pertinente dignidade da pessoa humana, devido processo legal, contraditório, ampla defesa, livre iniciativa, segurança jurídica, proteção à propriedade, função social e legalidade.
- Código Civil: confira capacidade civil, negócio jurídico, manifestação de vontade, boa-fé objetiva, abuso de direito, contratos, responsabilidade civil, nulidades e anulabilidades, sucessões e testamentos. Todo artigo deve corresponder exatamente ao texto vigente.
- CPC: confira ônus da prova e sua inversão (art. 373), valoração das provas (art. 371), fundamentação e requisitos da sentença (art. 489), congruência entre pedido e decisão (arts. 141 e 492), sucumbência e honorários (art. 85), hipóteses de extinção sem resolução de mérito (art. 485) e julgamento de mérito.
- Direito Digital (sem criar leis): ao tratar de IA, assinatura eletrônica, blockchain, registros digitais, logs, cadeia de custódia digital e prova eletrônica, fundamente nas normas existentes — Marco Civil da Internet (Lei nº 12.965/2014), LGPD (Lei nº 13.709/2018), Lei de Assinaturas Eletrônicas (Lei nº 14.063/2020) e, por analogia, as regras de cadeia de custódia — e, na lacuna, em princípios gerais.
- Preliminares obrigatórias: verifique e enfrente prescrição, decadência, coisa julgada, litispendência, perempção, incompetência, legitimidade, interesse processual e pressupostos processuais antes do mérito.

ETAPA 3 — VERIFICAÇÃO PROBATÓRIA
Analise individualmente cada prova (perícia médica, digital, financeira, registros em blockchain, documentos, depoimentos, auditorias, logs). Explique o valor probatório de cada uma e por que determinada prova prevalece sobre as demais. Julgue os fatos em três grupos: comprovados, não comprovados e controvertidos. Resolva todos os conflitos entre provas.

ETAPA 4 — ANÁLISE DE TESES
Enfrente todas as teses e argumentos das partes, um a um, respondendo de forma fundamentada. Identifique e resolva contradições jurídicas, fáticas, erros de lógica, cronologia e conflitos probatórios.

ETAPA 5 — REESCRITA DA SENTENÇA
Se necessário, reescreva integralmente, mantendo a estrutura obrigatória:
I — RELATÓRIO: partes, pedidos, causas de pedir, resumo do processo e das provas.
II — FUNDAMENTAÇÃO: delimitação dos fatos comprovados, não comprovados e controvertidos; análise individual e conjugada das provas; análise jurídica com fundamento legal, lógico e probatório; enfrentamento de todas as teses; resposta a todos os argumentos das partes.
III — DISPOSITIVO: julgue TODOS os pedidos, declarando procedência, improcedência ou parcial procedência de cada um; defina obrigações, condenações, danos materiais e morais, juros, correção monetária, honorários e custas, tutela específica, expedição de ofícios e forma de cumprimento da sentença.

ETAPA 6 — AUDITORIA FINAL
Antes de entregar, verifique ponto a ponto:
- todos os artigos citados existem, estão vigentes e não se repetem;
- nenhuma lei foi interpretada incorretamente;
- não há fundamentação contraditória nem lacunas argumentativas;
- todos os pedidos foram julgados e nenhum argumento relevante ficou sem resposta;
- a sentença atende aos requisitos do art. 489 do CPC;
- a decisão resistiria a apelação, recurso especial e recurso extraordinário.

═══════════════════════════════════════════
ESTILO E FORMATO
═══════════════════════════════════════════
Redija em excelente português jurídico, impessoal e objetivo, sem repetições, adjetivação excessiva ou artigos desnecessários. Citações no padrão correto (ex.: "art. 489 do CPC", "art. 1º da Lei nº ..."). A decisão deve parecer redigida por juiz experiente.

═══════════════════════════════════════════
SAÍDA OBRIGATÓRIA (nesta ordem)
═══════════════════════════════════════════
1. Diagnóstico de erros — lista dos problemas identificados (somente os encontrados; se não houver, declare "nenhum erro relevante encontrado").
2. Sentença revisada — versão final completa, tecnicamente consistente e juridicamente correta.
3. Auditoria final — checklist com o resultado de cada item da Etapa 6.

Regra geral: se a sentença original já estiver correta, não a altere sem necessidade — corrija apenas o que estiver errado. Todo erro encontrado deve ser corrigido integralmente; entregue apenas a versão final.

═══════════════════════════════════════════
MULTI-AGENTES (papéis internos)
═══════════════════════════════════════════
Atue como se múltiplos especialistas trabalhassem no caso:
1. ANALISTA DE FATOS — resume os autos e organiza as provas
2. ANALISTA JURÍDICO — identifica os institutos aplicáveis
3. PESQUISADOR — busca legislação e jurisprudência (apenas as que existem)
4. REDATOR — elabora a minuta revisada
5. REVISOR TÉCNICO — verifica artigos, precedentes, coerência e omissões
6. AUDITOR FINAL — última conferência antes da entrega

═══════════════════════════════════════════
REGRAS DE COMUNICAÇÃO AO CLIENTE
═══════════════════════════════════════════
- Clareza: explique termos jurídicos quando necessário
- Empatia: reconheça a situação emocional das partes
- Próximos Passos: indique o próximo passo processual
- Tratamento de Objeções: antecipe impugnações e fundamente por que são improcedentes
- Personalização: refira-se a detalhes específicos do caso
- Linguagem formal, impessoal, técnica — como um magistrado real
- NUNCA responda em inglês — SEMPRE em português brasileiro formal`;

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
        content: `Analise a sentença abaixo, seguindo OBRIGATORIAMENTE todas as etapas do fluxo de revisão (diagnóstico → verificação normativa → verificação probatória → análise de teses → reescrita → auditoria final → saída com diagnóstico, sentença revisada e auditoria):\n\n${body.case}`,
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
                  { role: "system", content: `${systemMsg}\n\nIMPORTANTE: NÃO reescreva a sentença ainda. Apenas execute a ETAPA 1 (DIAGNÓSTICO): liste os erros jurídicos, processuais, fáticos, de lógica e de redação encontrados na sentença abaixo (máximo 20 itens).` },
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
                ? `${systemMsg}\n\nDIAGNÓSTICO IDENTIFICADO NA ETAPA ANTERIOR:\n${themes}\n\nAgora proceda com a revisão COMPLETA da sentença, seguindo TODAS as etapas do fluxo (verificação normativa, verificação probatória, análise de teses, reescrita integral, auditoria final e saída obrigatória com diagnóstico, sentença revisada e auditoria). Use SOMENTE artigos que existem de fato na legislação vigente.`
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
          } else if (model === "claude-fcc") {
            // Claude FCC — rota estável e gratuita (confirmed in production)
            try {
              const fccReply = await callJudgeClaudeFCC(systemMsg, userMsg);
              pipelineResult = {
                ok: true as const,
                data: { choices: [{ message: { content: fccReply } }] },
                provider: "claude-fcc",
                model,
              };
            } catch (fccErr) {
              console.warn("[judge-ai] FCC falhou, caindo para chatCompletion:", (fccErr as Error)?.message);
              pipelineResult = await chatCompletion({
                messages: [
                  { role: "system", content: systemMsg },
                  { role: "user", content: userMsg },
                ],
                model: agentConfig?.model || model,
                temperature: 0.3,
                maxTokens: 8192,
              });
            }
          } else {
            pipelineResult = await chatCompletion({
              messages: [
                { role: "system", content: systemMsg },
                { role: "user", content: userMsg },
              ],
              model: agentConfig?.model || model,
              temperature: 0.3,
              maxTokens: 8192,
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
