import { chatCompletion } from "../_shared/llm.ts";
import { saveEvolvedPrompt, getEvolvedPrompt } from "../_shared/prompts.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- PROMPTS DE PRODUÇÃO (lawyer-ai e judge-ai) ---
const LAWYER_PRODUCTION_PROMPT = `IDENTIDADE
Você é um Advogado Virtual Brasileiro especializado, trabalhando para o escritório da Dra. Kênia Garcia.
Seu papel é analisar o caso do cliente, coletar informações adicionais quando necessário, e fornecer orientação jurídica estratégica.

REGRAS GLOBAIS
- Nunca invente provas, fatos, documentos ou jurisprudência.
- Nunca prometa ganho de causa ou resultado específico.
- Sempre informe que sua orientação é preliminar e não substitui consulta presencial.
- Linguagem profissional, clara e acessível ao cliente.
- Quando faltar informação, pergunte diretamente ao cliente.
- Ao final de toda análise: "Esta orientação é preliminar e não substitui consulta jurídica presencial."

ESTRATÉGIAS DE ATENDIMENTO AO CLIENTE:
- Escuta Ativa: Use frases como "Entendi sua situação. Para eu analisar melhor, me conta: ..."
- Empatia: Demonstre compreensão antes de qualquer orientação
- Urgência Ética: "Esse tipo de situação tem prazos importantes"
- Tratamento de Objeções: "Não tenho dinheiro" → "A Dra. Kênia oferece consulta inicial"
- Gatilhos Psicológicos: Reciprocidade, Prova Social, Autoridade, Afinidade
- Personalização: Use o nome do cliente, refira-se a detalhes específicos`;

const JUDGE_PRODUCTION_PROMPT = `IDENTIDADE
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

// --- ESTRATÉGIAS DE SECRETARIA/MARKETING (conectadas ao treinamento jurídico) ---
const SECRETARY_STRATEGIES = [
  { id: "abordagem_inicial", name: "Abordagem Inicial", desc: "Primeira impressão e quebra de gelo" },
  { id: "identificacao_dor", name: "Identificação de Dor", desc: "Mapear a necessidade real do cliente" },
  { id: "demonstracao_valor", desc: "Mostrar diferenciais do escritório" },
  { id: "tratamento_objecao", name: "Tratamento de Objeções", desc: "Superar resistências comuns" },
  { id: "fechamento", name: "Fechar o Lead", desc: "Converter orientação em agendamento" },
  { id: "follow_up", name: "Follow-up Estratégico", desc: "Manter contato após primeira interação" },
  { id: "captura_whatsapp", name: "Captação via WhatsApp", desc: "Estratégias específicas para WhatsApp" },
  { id: "indicacao", name: "Captação por Indicação", desc: "Como pedir e receber indicações" },
  { id: "escuta_ativa", name: "Escuta Ativa com Perguntas", desc: "Coletar dados com perguntas estratégicas" },
  { id: "urgencia_etica", name: "Criação de Urgência", desc: "Motivar ação imediata de forma ética" },
  { id: "gatilhos_psicologicos", name: "Gatilhos Psicológicos", desc: "Reciprocidade, prova social, escassez" },
  { id: "lead_divorcio", name: "Lead — Divórcio", desc: "Atendimento para casos de família" },
  { id: "lead_previdenciario", name: "Lead — Previdenciário", desc: "Atendimento para aposentadorias e INSS" },
  { id: "lead_bancario", name: "Lead — Direito Bancário", desc: "Atendimento para questões bancárias" },
  { id: "lead_hesitante", name: "Lead Hesitante", desc: "Cliente indeciso que precisa de incentivo" },
  { id: "lead_urgencia", name: "Lead com Urgência", desc: "Cliente em situação urgente" },
  { id: "pos_duvida_juridica", name: "Após Dúvida Jurídica", desc: "Converter orientação em agendamento" },
];

const STRATEGIES_CONTEXT = `
# ESTRATÉGIAS DE CAPTAÇÃO E ATENDIMENTO (Treinamento de Secretaria)
Ao gerar respostas como advogado ou juiz, aplique as seguintes estratégias de atendimento ao cliente:

${SECRETARY_STRATEGIES.map((s, i) => `${i + 1}. **${s.name || s.id}**: ${s.desc}`).join("\n")}

Ao argumentar ou sentenciar, demonstre:
- Empatia e escuta ativa com o cliente
- Clareza na explicação jurídica
- Próximos passos concretos
- Tratamento de objeções comum (custo, demora, complexidade)
- Urgência ética quando aplicável
- Gatilhos psicológicos: reciprocidade, prova social, autoridade
- Personalização: mencione detalhes específicos do caso
- Fechamento: oriente sobre próximos passos processuais
`;

const GENERATE_CASE_PROMPT = `Você é um professor de direito da USP/FGV criando CASOS SIMULADOS para treinamento profissional avançado. Gere casos REALISTAS com fatos detalhados, provas, contexto processual e questões jurídicas relevantes.

FORMATO — SEMPRE retorne JSON válido:
{
  "case_data": {
    "title": "Título do caso com referência simulada",
    "description": "Descrição COMPLETA do caso com: (1) contexto fático detalhado, (2) provas disponíveis, (3) histórico processual, (4) posição das partes, (5) questões jurídicas controvertidas. Mínimo 300 palavras.",
    "parties": "Autor vs. Réu com qualificação resumida",
    "question": "Pergunta-chave jurídica que o profissional deve resolver",
    "key_issues": ["Questão jurídica 1 com base legal", "Questão jurídica 2 com base legal"],
    "applicable_laws": ["Art. X do Código Y - nome do dispositivo", "Súmula Z do Tribunal W - ementa resumida"],
    "hints": ["Dica técnica com indicação de jurisprudência", "Dica sobre armadilhas processuais"],
    "client_context": "Contexto do cliente: situação emocional, urgência, objeções prováveis, necessidades específicas"
  }
}

REGRAS OBRIGATÓRIAS:
- Casos devem ser REALISTAS e baseados em jurisprudência REAL brasileira
- Descrição deve ter no MÍNIMO 300 palavras com fatos, provas e contexto completo
- Inclua TODAS as partes do processo (autor, réu, MP quando aplicável)
- A pergunta deve ser JURÍDICA e objetiva — nunca genérica
- Inclua artigos ESPECÍFICOS de lei aplicáveis (Código Penal, Civil, CLT, CDC, etc.)
- Inclua SÚMULAS ou JURISPRUDÊNCIA relevante de tribunais superiores (STF, STJ, TST)
- NUNCA invente dados pessoais reais — use nomes fictícios mas realistas
- O caso deve ter TENSÃO JURÍDICA — não pode ter resposta óbvia
- Dificuldade FÁCIL: 1-2 questões jurídicas diretas
- Dificuldade MÉDIA: 2-3 questões com alguma complexidade
- Dificuldade DIFÍCIL: 3+ questões com múltiplas teses defensáveis`;

const EVALUATE_PROMPT = `Você é um examinador jurídico de tribunais superiores (STF/STJ/TST) avaliando a resposta de um advogado ou juiz em treinamento profissional. Seja RIGOROSO mas JUSTO na avaliação.

FORMATO — SEMPRE retorne JSON válido:
{
  "score": 85,
  "feedback": "Feedback detalhado, específico e construtivo para exibir no chat. Mínimo 3 frases.",
  "evaluation": {
    "criteria": [
      { "name": "Fundamentação Legal", "met": true, "score": 22, "max": 25, "feedback": "Especifique QUAIS artigos foram citados e se estão corretos" },
      { "name": "Argumentação", "met": true, "score": 20, "max": 25, "feedback": "Se a argumentação é lógica, coerente e completa" },
      { "name": "Conclusão", "met": false, "score": 10, "max": 20, "feedback": "Se a conclusão é clara, fundamentada e responde à pergunta" },
      { "name": "Jurisprudência", "met": true, "score": 12, "max": 15, "feedback": "Se citou súmulas, Ementas de tribunais superiores" },
      { "name": "Procedência", "met": true, "score": 13, "max": 15, "feedback": "Se a posição jurídica adotada é correta e defensável" },
      { "name": "Atendimento ao Cliente", "met": true, "score": 8, "max": 10, "feedback": "Empatia, escuta ativa, personalização, próximos passos claros" },
      { "name": "Persuasão", "met": true, "score": 5, "max": 5, "feedback": "Gatilhos psicológicos, urgência ética, tratamento de objeções" }
    ],
    "strengths": ["Ponto forte específico e detalhado 1", "Ponto forte específico 2"],
    "weaknesses": ["Ponto fraco específico com indicação de como melhorar 1", "Ponto fraco específico 2"],
    "suggested_improvement": "Sugestão MUITO específica de melhoria com exemplo de como escrever"
  }
}

RUBRICA DE AVALIAÇÃO POR CRITÉRIO:

FUNDAMENTAÇÃO LEGAL (25 pts):
- 0-5: Não cita nenhum artigo de lei ou cita errado
- 6-10: Cita 1-2 artigos genéricos sem detalhamento
- 11-15: Cita artigos corretos com explicação parcial
- 16-20: Cita múltiplos artigos corretamente com fundamentação
- 21-25: Cita artigos específicos, explica a incidência e conecta com o caso

ARGUMENTAÇÃO (25 pts):
- 0-5: Apenas repete a pergunta sem argumentar
- 6-10: Argumentação genérica e superficial
- 11-15: Argumentação com algum embasamento, mas incompleta
- 16-20: Argumentação coerente, lógica e bem estruturada
- 21-25: Argumentação brilhante, com múltiplos fundamentos e antecipação de contra-argumentos

CONCLUSÃO (20 pts):
- 0-5: Sem conclusão ou conclusão contraditória
- 6-10: Conclusões genérica sem responder à pergunta
- 11-15: Conclusão que responde parcialmente à pergunta
- 16-20: Conclusão clara, fundamentada e que responde integralmente

JURISPRUDÊNCIA (15 pts):
- 0-5: Não cita nenhuma jurisprudência
- 6-10: Cita jurisprudência genérica ou sem especificação
- 11-15: Cita súmula ou ementa específica de tribunal superior

PROCEDÊNCIA (15 pts):
- 0-5: Posição jurídica manifestamente incorreta
- 6-10: Posição correta mas frágil argumentativamente
- 11-15: Posição jurídica sólida e defensável

ATENDIMENTO AO CLIENTE (10 pts):
- 0-3: Sem empatia, sem escuta ativa, linguagem fria e robótica
- 4-6: Demonstra alguma empatia mas falta personalização
- 7-10: Empatia genuína, escuta ativa, personalização, próximos passos claros

PERSUASÃO (5 pts):
- 0-1: Sem gatilhos de persuasão, sem urgência, sem tratamento de objeções
- 2-3: Alguns gatilhos presentes mas superficiais
- 4-5: Gatilhos psicológicos bem aplicados, urgência ética, tratamento de objeções eficaz

REGRAS:
- Score deve refletir RIGOROSAMENTE a rubrica acima
- NÃO dê score alto por texto bonito sem conteúdo jurídico
- NÃO penalize demais respostas curtas mas corretas
- Feedback deve ser ESPECÍFICO — cite trechos da resposta quando possível
- suggested_improvement deve ter EXEMPLO de como escrever melhor
- SEMPRE retorne JSON válido`;

const EVALUATE_AND_CORRECT_PROMPT = `Você é um mentor jurídico de tribunais superiores especialista em formação profissional. Sua tarefa é REESCREVER a resposta do profissional, transformando uma resposta FRACA em uma resposta de NÍVEL PROFISSIONAL ALTO (como seria escrita por um advogado ou juiz experiente).

FORMATO — SEMPRE retorne JSON válido:
{
  "corrected_response": "Texto COMPLETO da resposta reescrita e melhorada — mínimo 300 palavras, formato profissional, com saudação, fundamentação, argumentação e conclusão",
  "changes": [
    {
      "original": "Trecho exato original do profissional",
      "corrected": "Trecho corrigido/melhorado com explicação",
      "reason": "Motivo jurídico específico da alteração"
    }
  ],
  "summary": "Resumo técnico das principais melhorias aplicadas"
}

REGRAS OBRIGATÓRIAS:
- REESCREVA a resposta COMPLETA como documento profissional (petição ou sentença)
- ESTRUTURA OBRIGATÓRIA da resposta reescrita:
  * MODO ADVOCACIA: Saudação → Fundamentação legal → Argumentação → Jurisprudência → Pedido → Fechamento
  * MODO JUIZ: Relatório → Fundamentação → Dispositivo → Dispositivo sentencial
- MANTenha os pontos fortes que o profissional já acertou
- ADICIONE fundamentação legal ESPECÍFICA que estava faltando (artigos com número e inciso)
- ADICIONE jurisprudência relevante de tribunais superiores (STF, STJ, TST, TJ)
- CORRIJA erros jurídicos quando houver — explique por que está errado
- MELHORE a linguagem técnica — use terminologia jurídica precisa
- O resultado deve ser uma resposta PRONTA para protocolo em juízo
- NÃO apenas dê dicas — REESCREVA o texto integralmente como documento profissional
- Inclua ao menos 3 artigos de lei e 1 jurisprudência na versão corrigida`;

const IMPROVE_ARGUMENT_PROMPT = `Você é um consultor jurídico sênior de tribunais superiores. Analise a resposta do profissional e forneça sugestões TÉCNICAS e ESPECÍFICAS de como elevar a qualidade da argumentação ao nível profissional.

FORMATO — SEMPRE retorne JSON válido:
{
  "suggestions": [
    {
      "area": "Fundamentação Legal / Argumentação / Jurisprudência / Conclusão / Procedência",
      "suggestion": "Sugestão TÉCNICA específica com indicação de artigo ou tese jurídica",
      "example": "FRASE PRONTA para incluir na resposta (mínimo 2 frases com terminologia jurídica)"
    }
  ],
  "priority_suggestion": "A sugestão mais crítica para elevar o score — com exemplo completo",
  "quick_wins": ["Melhoria rápida com frase pronta 1", "Melhoria rápida com frase pronta 2", "Melhoria rápida com frase pronta 3"]
}

REGRAS OBRIGATÓRIAS:
- Cada sugestão deve ser TÉCNICA e ACIONÁVEL — não genérica
- Inclua EXEMPLOS com FRASES PRONTAS usando terminologia jurídica brasileira
- Foque nos critérios com MENOR score na avaliação
- Priorize: (1) Fundamentação legal com artigos específicos, (2) Jurisprudência de tribunais superiores
- Cada exemplo deve ter pelo menos 2 frases com estrutura jurídica completa
- Não repita o que já está bom — foque apenas nos pontos fracos
- As sugestões devem ser aplicáveis IMEDIATAMENTE pelo profissional
- quick_wins devem ser mudanças simples que melhoram muito o score`;

// --- PROMPTS DE TREINAMENTO DE SECRETARIA ---
const SECRETARY_STRATEGY_PROMPT = `Você é um diretor de vendas de um escritório de advocacia brasileiro criando cenários realistas de treinamento para secretárias jurídicas. Gere um cenário de atendimento ao cliente baseado na estratégia solicitada.

FORMATO — SEMPRE retorne JSON válido:
{
  "scenario": "Descrição detalhada do cenário (mínimo 150 palavras). Inclua: contexto do cliente, problema jurídico, estado emocional, objeções prováveis, urgência, e qualquer detalhe que torne o cenário realista.",
  "script": "Roteiro sugestivo de como a secretária deveria conduzir o atendimento (mínimo 100 palavras). Passo a passo com frases exemplos.",
  "client_profile": "Perfil resumido do cliente simulado: nome fictício, idade, situação, tom de voz provável, nível de conhecimento jurídico"
}

REGRAS:
- Cenários devem ser REALISTAS e variados
- Use nomes fictícios brasileiros
- Inclua detalhes emocionais e situacionais
- O cenário deve ter TENSÃO — o cliente pode ter dúvidas, medos, objeções
- Adapte a complexidade ao nível de dificuldade`;

const SECRETARY_EVALUATE_PROMPT = `Você é um consultor de vendas e atendimento jurídico avaliando o desempenho de uma secretária jurídica em simulação de atendimento. Avalie com base nas melhores práticas de atendimento ao cliente e estratégias de vendas éticas.

FORMATO — SEMPRE retorne JSON válido:
{
  "score": 75,
  "feedback": "Feedback detalhado e construtivo. Mínimo 3 frases. Seja específico sobre o que funcionou e o que pode melhorar.",
  "strengths": ["Ponto forte específico 1", "Ponto forte específico 2"],
  "weaknesses": ["Ponto fraco com sugestão de melhoria 1", "Ponto fraco com sugestão de melhoria 2"],
  "tips": ["Dica prática 1", "Dica prática 2", "Dica prática 3"],
  "improved_response": "Versão melhorada da resposta da secretária (mínimo 100 palavras). Reescreva como uma profissional experiente faria.",
  "real_pattern_check": {
    "identity_ok": true,
    "short_response": true,
    "one_question": true,
    "active_listening": true,
    "scheduling_offered": false,
    "objection_handled": "na",
    "psychological_trigger": false
  }
}

RUBRICA DE AVALIAÇÃO:

IDENTIDADE (critério obrigatório):
- A secretária manteve identidade humana? Não revelou ser IA?
- Resposta curta e objetiva (estilo WhatsApp)?
- Uma pergunta por vez?

ESCUTA ATIVA (25 pts):
- 0-5: Não demonstrou compreensão do problema
- 6-15: Demonstra alguma escuta mas não aprofunda
- 16-25: Escuta genuína, faz perguntas estratégicas, valida sentimento do cliente

TRATAMENTO DE OBJEÇÕES (20 pts):
- 0-5: Ignorou objeções ou respondeu de forma seca
- 6-15: Tratou objeções de forma genérica
- 16-20: Tratou objeções com empatia, ofereceu alternativas, superou resistência

GATILHOS PSICOLÓGICOS (15 pts):
- 0-5: Sem nenhum gatilho de persuasão
- 6-10: Alguns gatilhos presentes mas superficiais
- 11-15: Reciprocidade, prova social, autoridade, escassez aplicados naturalmente

FECHAMENTO (20 pts):
- 0-5: Não ofereceu próximo passo
- 6-15: Ofereceu agendamento de forma genérica
- 16-20: Fechamento natural, ofereceu horários específicos, criou urgência ética

PERSONALIZAÇÃO (10 pts):
- 0-5: Resposta genérica sem usar dados do cliente
- 6-10: Usou nome do cliente, referenciou detalhes específicos do caso

PROFISSIONALISMO (10 pts):
- 0-5: Linguagem inadequada ou fria demais
- 6-10: Tom profissional, acolhedor, humano

REGRAS:
- Score deve refletir RIGOROSAMENTE a rubrica
- Feedback deve ser ESPECÍFICO — cite trechos da resposta
- tips devem ser PRÁTICAS e imediatamente aplicáveis
- improved_response deve ser um EXEMPLO de como a secretária deveria ter respondido
- real_pattern_check: marque true/false para cada critério; "na" se não aplicável ao cenário
- SEMPRE retorne JSON válido`;

const SECRETARY_IMPROVE_PROMPT_PROMPT = `Você é um consultor de vendas e comunicação jurídica especialista em otimização de prompts para secretárias virtuais de escritórios de advocacia. Sua tarefa é MELHORAR o prompt da secretária com base nos feedbacks de treinamento.

FORMATO — SEMPRE retorne JSON válido:
{
  "improved_prompt": "O prompt completo melhorado (mínimo 500 palavras). Deve ser uma instrução completa e acionável para a secretária virtual.",
  "changes": [
    {
      "area": "Área alterada (ex: Identidade, Escuta Ativa, Fechamento)",
      "before": "Como estava antes",
      "after": "Como ficou depois",
      "reason": "Motivo da melhoria"
    }
  ],
  "reasoning": "Resumo das principais melhorias aplicadas e por quê"
}

REGRAS OBRIGATÓRIAS:
- O prompt melhorado deve ser COMPLETO e AUTOCONTIDO (a secretária deve entender tudo sem explicações externas)
- Mantenha a IDENTIDADE da secretária (humana, jurídica, da Dra. Kênia Garcia)
- ADICIONE instruções específicas para os pontos fracos identificados
- MANTENHA o que já funcionava bem
- Inclua exemplos práticos de como responder
- O prompt deve cobrir: identidade, escuta ativa, tratamento de objeções, gatilhos psicológicos, fechamento, personalização, formatação WhatsApp
- Não remova seções que já estavam funcionando bem
- Priorize: (1) Corrigir pontos críticos, (2) Adicionar exemplos práticos, (3) Reforçar boas práticas
- O resultado deve ser um prompt que, quando lido pela IA, faça a secretária agir como uma profissional humana experiente`;

function parseJsonResponse(raw: string): Record<string, unknown> | null {
  const text = (raw || "").trim();
  if (!text) return null;
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("[training-ai] JSON parse error:", e);
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action: string = String(body.action ?? "").trim();
    const mode: string = String(body.mode ?? "lawyer").trim();
    const area: string = String(body.area ?? "civel").trim();
    const difficulty: string = String(body.difficulty ?? "medio").trim();
    const caseData = body.case_data || null;
    const userResponse: string = String(body.user_response ?? "").trim();
    const correctedResponse: string = String(body.corrected_response ?? "").trim();
    const score: number = typeof body.score === "number" ? body.score : 0;
    const evaluation = body.evaluation || null;
    const history: Array<{ role: string; content: string }> = Array.isArray(body.history) ? body.history : [];

    let systemPrompt = "";
    let userContent = "";
    let lawyerFeedback = "";

    if (action === "generate_case") {
      systemPrompt = GENERATE_CASE_PROMPT;
      const areaLabel = area.charAt(0).toUpperCase() + area.slice(1);
      const diffLabel = difficulty === "facil" ? "Fácil" : difficulty === "dificil" ? "Difícil" : "Médio";
      userContent = `Gere um caso simulado para treinamento de ${mode === "lawyer" ? "ADVOCACIA" : "JULGAMENTO"} na área de ${areaLabel} com dificuldade ${diffLabel}. Use nomes fictícios. Caso realista.`;
    } else if (action === "generate_lawyer_response") {
      // Apenas gera a resposta do advogado/juiz production para referência
      const lawList = caseData?.applicable_laws?.join(", ") || "N/A";
      const issuesList = caseData?.key_issues?.join("; ") || "N/A";
      const clientName = caseData?.parties?.split(" vs")[0]?.trim() || "Cliente";
      const lawyerPrompt = mode === "lawyer" ? LAWYER_PRODUCTION_PROMPT : JUDGE_PRODUCTION_PROMPT;

      const lawyerResult = await chatCompletion({
        messages: [
          { role: "system", content: `${lawyerPrompt}\n\n${STRATEGIES_CONTEXT}` },
          { role: "user", content: `CASO DO CLIENTE:\n${JSON.stringify(caseData, null, 2)}\n\nLEIS APLICÁVEIS: ${lawList}\nQUESTÕES JURÍDICAS: ${issuesList}\n\nCLIENTE: ${clientName}\n\nResponda ao cliente como ${mode === "lawyer" ? "advogado" : "juiz"}, aplicando estratégias de atendimento. Use o nome do cliente, seja empático e fundamentado. Máximo 400 palavras.` },
        ],
        temperature: 0.5, maxTokens: 1500, model: "gpt-4o-mini", preferFastProvider: true,
      });

      const response = lawyerResult.ok
        ? (lawyerResult.data?.choices?.[0]?.message?.content || "Resposta não disponível.")
        : "Erro ao gerar resposta.";

      return new Response(
        JSON.stringify({ response, provider: lawyerResult.provider || "gpt-4o-mini" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (action === "evaluate") {
      const modeLabel = mode === "lawyer" ? "ADVOCACIA" : "JULGAMENTO";
      const lawList = caseData?.applicable_laws?.join(", ") || "N/A";
      const issuesList = caseData?.key_issues?.join("; ") || "N/A";

      // 1. Advogado production responde ao caso do cliente (não ao profissional)
      const lawyerPrompt = mode === "lawyer" ? LAWYER_PRODUCTION_PROMPT : JUDGE_PRODUCTION_PROMPT;
      const lawyerResult = await chatCompletion({
        messages: [
          { role: "system", content: `${lawyerPrompt}\n\n${STRATEGIES_CONTEXT}` },
          { role: "user", content: `CASO DO CLIENTE:\n${JSON.stringify(caseData, null, 2)}\n\nLEIS APLICÁVEIS: ${lawList}\nQUESTÕES JURÍDICAS: ${issuesList}\n\nResponda ao cliente como advogado, aplicando estratégias de atendimento. Use o nome do cliente, seja empático e fundamentado. Máximo 400 palavras.` },
        ],
        temperature: 0.5, maxTokens: 1500, model: "gpt-4o-mini", preferFastProvider: true,
      });

      lawyerFeedback = "Análise não disponível.";
      if (lawyerResult.ok) {
        lawyerFeedback = lawyerResult.data?.choices?.[0]?.message?.content || lawyerFeedback;
      }

      // 2. Juiz avalia a argumentação do profissional
      systemPrompt = EVALUATE_PROMPT;
      userContent = `Avalie RIGOROSAMENTE a resposta do profissional no modo ${modeLabel}.

CASO:
${JSON.stringify(caseData, null, 2)}

LEIS APLICÁVEIS AO CASO: ${lawList}
QUESTÕES JURÍDICAS CENTRAIS: ${issuesList}

ARGUMENTAÇÃO DO PROFISSIONAL:
${userResponse}

RESPOSTA CORRETA DO ADVOGADO (referência):
${lawyerFeedback}

INSTRUÇÕES DE AVALIAÇÃO:
- Compare a argumentação do profissional com a resposta correta do advogado
- Verifique se citou os artigos de lei corretos (não apenas mencionou — precisa do número)
- Verifique se a argumentação é lógica e responde à pergunta feita
- Verifique se há jurisprudência de tribunal superior (STF, STJ, TST)
- Verifique se a conclusão é clara e fundamentada
- Score deve ser RIGOROSO: respostas genéricas sem artigos específicos devem receber abaixo de 50`;
    } else if (action === "evaluate_and_correct") {
      systemPrompt = EVALUATE_AND_CORRECT_PROMPT;
      const modeLabel = mode === "lawyer" ? "ADVOCACIA" : "JULGAMENTO";
      const lawList = caseData?.applicable_laws?.join(", ") || "N/A";
      userContent = `Profissional no modo ${modeLabel}. Score obtido: ${score}/100.

CASO:
${JSON.stringify(caseData, null, 2)}

LEIS APLICÁVEIS: ${lawList}

RESPOSTA ORIGINAL DO PROFISSIONAL:
${userResponse}

AVALIAÇÃO DETALHADA:
- Pontos fortes: ${evaluation?.strengths?.join("; ") || "N/A"}
- Pontos fracos: ${evaluation?.weaknesses?.join("; ") || "N/A"}
- Critérios: ${evaluation?.criteria?.map((c: any) => `${c.name}: ${c.score || 0}/${c.max || 25} - ${c.met ? "OK" : "FRACO"} - ${c.feedback}`).join("; ") || "N/A"}
- Sugestão: ${evaluation?.suggested_improvement || "N/A"}

REESCREVA a resposta como documento profissional pronto para protocolo.
Adicione os artigos de lei e jurisprudência que faltam.
Mantenha os pontos fortes. Corrija os fracos.
Mínimo 300 palavras na versão corrigida.`;
    } else if (action === "improve_argument") {
      systemPrompt = IMPROVE_ARGUMENT_PROMPT + "\n\n" + STRATEGIES_CONTEXT;
      const modeLabel = mode === "lawyer" ? "ADVOCACIA" : "JULGAMENTO";
      const lawList = caseData?.applicable_laws?.join(", ") || "N/A";
      userContent = `Profissional no modo ${modeLabel}. Score atual: ${score}/100.

CASO:
${JSON.stringify(caseData, null, 2)}

LEIS APLICÁVEIS: ${lawList}

RESPOSTA DO PROFISSIONAL:
${userResponse}

AVALIAÇÃO COMPLETA:
- Feedback: ${evaluation?.suggested_improvement || "N/A"}
- Pontos fracos: ${evaluation?.weaknesses?.join("; ") || "N/A"}
- Critérios: ${evaluation?.criteria?.map((c: any) => `${c.name}: ${c.score || 0}/${c.max || 25} - ${c.met ? "OK" : "FRACO"} - ${c.feedback}`).join("; ") || "N/A"}

Forneça sugestões TÉCNICAS com FRASES PRONTAS em terminologia jurídica brasileira.`;
    } else if (action === "simulate_whatsapp") {
      const clientMessage: string = String(body.client_message ?? "").trim();
      const clientName: string = String(body.client_name ?? "Cliente").trim();
      const customPrompt: string = String(body.custom_prompt ?? "").trim();

      if (!clientMessage) {
        return new Response(
          JSON.stringify({ error: "client_message obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const systemPromptBase = customPrompt
        ? customPrompt.slice(0, 2000)
        : (mode === "lawyer" ? LAWYER_PRODUCTION_PROMPT : JUDGE_PRODUCTION_PROMPT);

      let systemInstruction = "";
      let userInstruction = "";

      if (mode === "lawyer") {
        systemInstruction = `Você é um ADVOGADO EXPERIMENTE respondendo no WhatsApp. Elabore uma resposta COMPLETA para o cliente, incluindo:
- Análise jurídica do caso com base legal
- Artigos de lei aplicáveis (CLT, CPC, CF, etc.)
- Jurisprudência relevante quando possível
- Orientação clara sobre direitos do cliente
- Próximos passos concretos
- Tom empático mas profissional
- Nunca prometa resultado específico
- Use o nome do cliente
- Sempre informe que é orientação preliminar

${STRATEGIES_CONTEXT}

${systemPromptBase}`;
        userInstruction = `CLIENTE: ${clientName}\nÁREA: ${area}\nMENSAGEM: "${clientMessage}"

Elabore uma resposta COMPLETA e FUNDAMENTADA como advogado, aplicando as estratégias de atendimento ao cliente. Inclua artigos de lei, orientação jurídica e próximos passos. Máximo 500 palavras.`;
      } else {
        systemInstruction = `Você é um JUIZ EXPERIENTE analisando um caso. Analise a situação do cliente e produza:
1. Análise técnico-jurídica completa do caso
2. Artigos de lei e súmulas aplicáveis
3. Probabilidade de êxito em eventual ação judicial (0-100%)
4. Pontos fortes e fracos do caso
5. Jurisprudência relevante
6. Avaliação se um advogado BEM orientado acertaria ou não nesse caso
7. Orientação sobre os riscos e chances reais

${STRATEGIES_CONTEXT}

${systemPromptBase}`;
        userInstruction = `CLIENTE: ${clientName}\nÁREA: ${area}\nSITUAÇÃO: "${clientMessage}"

Produza uma ANÁLISE JUDICIAL COMPLETA. Avalie se um advogado bem orientado acertaria ou não nesse caso. Fundamente com artigos de lei e jurisprudência. Máximo 500 palavras.`;
      }

      // 1. Gerar resposta do profissional
      const simResult = await chatCompletion({
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userInstruction },
        ],
        temperature: 0.7, maxTokens: 1500, model: "gpt-4o-mini", preferFastProvider: true,
      });

      if (!simResult.ok) {
        return new Response(
          JSON.stringify({ error: "Falha ao gerar resposta" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const professionalResponse = simResult.data?.choices?.[0]?.message?.content || "";

      // 1b. Identificar estratégias usadas na resposta (para cores inline)
      const tagInstruction = `Analise a resposta do profissional abaixo e identifique quais estratégias de atendimento foram utilizadas em CADA PARÁGRAFO.

Estratégias disponíveis:
- saudacao: Abertura e boas-vindas
- identificacao: Coleta de dados pessoais
- diagnostico: Identificação do problema
- direcionamento: Encaminhamento para ministério/área
- encerramento: Finalização e follow-up
- urgencia: Situação urgente
- oracao: Momento de oração/acolhimento
- agendamento: Marcação de reunião
- pos_atendimento: Verificação e acompanhamento

Responda APENAS em JSON: {"paragraphs": [{"text": "texto do parágrafo", "strategy": "nome_da_estrategia"}]}

Separados por linha em branco no original. Mantenha o texto EXATAMENTE como está.`;

      const tagResult = await chatCompletion({
        messages: [
          { role: "system", content: tagInstruction },
          { role: "user", content: professionalResponse },
        ],
        temperature: 0.1, maxTokens: 2000, model: "gpt-4o-mini", preferFastProvider: true,
      });

      let taggedResponse = professionalResponse;
      let strategyTags: Array<{ text: string; strategy: string }> = [];
      if (tagResult.ok) {
        const tagParsed = parseJsonResponse(tagResult.data?.choices?.[0]?.message?.content || "");
        if (tagParsed?.paragraphs && Array.isArray(tagParsed.paragraphs)) {
          strategyTags = tagParsed.paragraphs.map((p: any) => ({
            text: String(p.text || ""),
            strategy: String(p.strategy || "saudacao"),
          }));
        }
      }

      // 2. Avaliar a resposta com estratégias da secretaria
      const evalInstruction = mode === "lawyer"
        ? `Avalie a resposta do ADVOGADO considerando as estratégias de atendimento ao cliente. Responda APENAS em JSON: {"score": 0-100, "feedback": "texto", "strengths": ["..."], "weaknesses": ["..."]}

${STRATEGIES_CONTEXT}

Critérios obrigatórios:
- Escuta ativa e empatia com o cliente
- Tratamento de objeções (custo, demora, complexidade)
- Gatilhos psicológicos: reciprocidade, prova social, autoridade
- Personalização: uso do nome do cliente, detalhes específicos
- Fechamento: orientação sobre próximos passos concretos
- Fundamentação legal com artigos específicos`
        : `Avalie a análise do JUIZ. Responda APENAS em JSON: {"score": 0-100, "feedback": "texto", "strengths": ["..."], "weaknesses": ["..."]}

${STRATEGIES_CONTEXT}

Critérios obrigatórios:
- Análise técnica completa e fundamentada
- Probabilidade de êxito realista
- Jurisprudência relevante citada
- Orientação sobre riscos e chances reais
- Avaliação se advogado bem orientado acertaria`;

      const evalResult = await chatCompletion({
        messages: [
          { role: "system", content: evalInstruction },
          { role: "user", content: `Mensagem do cliente: "${clientMessage}"\nResposta do profissional:\n${professionalResponse}\n\nAvalie considerando as estratégias de atendimento ao cliente. Score 0-100.` },
        ],
        temperature: 0.3, maxTokens: 500, model: "gpt-4o-mini", preferFastProvider: true,
      });

      let evaluation = { score: 50, feedback: "Avaliação não disponível", strengths: [] as string[], weaknesses: [] as string[] };
      if (evalResult.ok) {
        const evalParsed = parseJsonResponse(evalResult.data?.choices?.[0]?.message?.content || "");
        if (evalParsed) {
          evaluation = {
            score: typeof evalParsed.score === "number" ? evalParsed.score : 50,
            feedback: String(evalParsed.feedback || "Avaliação concluída"),
            strengths: Array.isArray(evalParsed.strengths) ? evalParsed.strengths : [],
            weaknesses: Array.isArray(evalParsed.weaknesses) ? evalParsed.weaknesses : [],
          };
        }
      }

      console.log(`[training-ai] simulate_whatsapp: ${mode} | ${area} | Score: ${evaluation.score}`);

      // 3. Se score < 80, gerar prompt melhorado automaticamente
      let improvedPrompt: string | null = null;
      if (evaluation.score < 80) {
        const improveResult = await chatCompletion({
          messages: [
            { role: "system", content: `Melhore o prompt de um ${mode === "lawyer" ? "ADVOGADO" : "JUIZ"} para WhatsApp. O prompt atual gerou uma resposta com score ${evaluation.score}/100.

Pontos fracos: ${evaluation.weaknesses.join("; ") || "N/A"}
Feedback: ${evaluation.feedback}

${STRATEGIES_CONTEXT}

Crie um prompt MELHORADO que corrija os pontos fracos. O prompt deve:
- Manter o que funcionou (pontos fortes)
- Corrigir os pontos fracos identificados
- Incluir instruções específicas para melhorar os pontos fracos
- Aplicar as estratégias de atendimento ao cliente
- Ser claro e acionável
- Máximo 500 palavras

Responda APENAS com o prompt melhorado, sem explicações extras.` },
            { role: "user", content: `Prompt atual:\n${systemPromptBase}\n\nGere o prompt melhorado aplicando as estratégias de atendimento.` },
          ],
          temperature: 0.5, maxTokens: 1000, model: "gpt-4o-mini", preferFastProvider: true,
        });

        if (improveResult.ok) {
          improvedPrompt = improveResult.data?.choices?.[0]?.message?.content || null;
        }
      }

      // Save improved prompt to DB when score < 80
      if (improvedPrompt && evaluation.score < 80) {
        await saveEvolvedPrompt(mode === "lawyer" ? "lawyer" : "judge", area, improvedPrompt, evaluation.score, {
          source: "simulate_whatsapp",
          client_message: clientMessage,
        });
      }

      return new Response(
        JSON.stringify({
          case_data: { description: clientMessage, title: `Simulação - ${area}` },
          client_message: clientMessage,
          client_name: clientName,
          professional_response: professionalResponse,
          strategy_tags: strategyTags,
          evaluation,
          improved_prompt: improvedPrompt,
          mode,
          area,
          provider: "gpt-4o-mini",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else if (action === "auto_train_loop") {
      const initialPrompt: string = String(body.current_prompt ?? "").trim();
      const targetImprovement: number = Number(body.target_improvement ?? 20);
      const maxIterations: number = Math.min(Number(body.max_iterations ?? 3), 3);
      const areas: string[] = Array.isArray(body.areas) && body.areas.length > 0
        ? body.areas.slice(0, 3)
        : [area];

      if (!initialPrompt) {
        return new Response(
          JSON.stringify({ error: "current_prompt obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const iterations: Array<Record<string, unknown>> = [];
      let currentPrompt = initialPrompt;
      let baselineScore = 0;
      let finalPrompt = initialPrompt;
      let iteration = 0;

      while (iteration < maxIterations) {
        iteration++;
        console.log(`[training-ai] auto_train_loop iteration ${iteration}/${maxIterations}`);

        const trainResults: Array<Record<string, unknown>> = [];

        for (const iterArea of areas) {
          try {
            // 1. Gerar caso
            const caseResult = await chatCompletion({
              messages: [
                { role: "system", content: GENERATE_CASE_PROMPT },
                { role: "user", content: `Gere um caso simulado para treinamento de ${mode === "lawyer" ? "ADVOCACIA" : "JULGAMENTO"} na área de ${iterArea.charAt(0).toUpperCase() + iterArea.slice(1)} com dificuldade Médio. Use nomes fictícios. Caso realista.` },
              ],
              temperature: 0.8, maxTokens: 4000, model: "gpt-4o-mini",
            });
            if (!caseResult.ok) continue;
            const caseParsed = parseJsonResponse(caseResult.data?.choices?.[0]?.message?.content || "");
            const caseData = (caseParsed as any)?.case_data || caseParsed;
            if (!caseData?.description) continue;

            // 2. Gerar resposta com prompt atual + estratégias de secretaria
            const responseResult = await chatCompletion({
              messages: [
                { role: "system", content: currentPrompt + "\n\n" + STRATEGIES_CONTEXT },
                { role: "user", content: `Caso: ${caseData.title}\n\n${caseData.description}\n\nPergunta: ${caseData.question || ""}\n\nResponda como ${mode === "lawyer" ? "advogado" : "juiz"}, aplicando estratégias de atendimento ao cliente.` },
              ],
              temperature: 0.7, maxTokens: 3000, model: "gpt-4o-mini",
            });
            if (!responseResult.ok) continue;
            const secretaryResponse = responseResult.data?.choices?.[0]?.message?.content || "";

            // 3. Avaliar resposta
            const evalResult = await chatCompletion({
              messages: [
                { role: "system", content: EVALUATE_PROMPT },
                { role: "user", content: `Avalie RIGOROSAMENTE a resposta do profissional no modo ${mode === "lawyer" ? "ADVOCACIA" : "JULGAMENTO"}.\n\nCASO:\n${JSON.stringify(caseData, null, 2)}\n\nLEIS APLICÁVEIS AO CASO: ${caseData.applicable_laws?.join(", ") || "N/A"}\nQUESTÕES JURÍDICAS CENTRAIS: ${caseData.key_issues?.join("; ") || "N/A"}\n\nRESPOSTA DO PROFISSIONAL:\n${secretaryResponse}\n\nScore deve ser RIGOROSO: respostas genéricas sem artigos específicos devem receber abaixo de 50.` },
              ],
              temperature: 0.3, maxTokens: 1500, model: "gpt-4o-mini",
            });
            if (!evalResult.ok) continue;
            const evalParsed = parseJsonResponse(evalResult.data?.choices?.[0]?.message?.content || "");
            trainResults.push({
              area: iterArea,
              score: typeof evalParsed?.score === "number" ? evalParsed.score : 50,
              evaluation: evalParsed?.evaluation || {},
              feedback: evalParsed?.feedback || "",
            });
          } catch (e) { /* skip */ }
        }

        // 4. Calcular média
        const scores = trainResults.map((r) => r.score as number || 0);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const passed = scores.filter((s) => s >= 60).length;

        if (iteration === 1) baselineScore = avgScore;

        // 5. Verificar se atingiu meta
        const improvement = baselineScore > 0 ? Math.round(((avgScore - baselineScore) / baselineScore) * 100) : 0;
        const reachedTarget = improvement >= targetImprovement;

        // 6. Coletar weaknesses e tips
        const allWeaknesses: string[] = [];
        const allStrengths: string[] = [];
        trainResults.forEach((r) => {
          const ev = r.evaluation as Record<string, unknown>;
          if (Array.isArray(ev?.weaknesses)) allWeaknesses.push(...(ev.weaknesses as string[]));
          if (Array.isArray(ev?.strengths)) allStrengths.push(...(ev.strengths as string[]));
        });

        iterations.push({
          iteration,
          avgScore,
          baselineScore,
          improvement,
          passed,
          total: trainResults.length,
          areas: areas,
          weaknesses: [...new Set(allWeaknesses)].slice(0, 10),
          strengths: [...new Set(allStrengths)].slice(0, 10),
          reachedTarget,
        });

        if (reachedTarget || iteration >= maxIterations) {
          finalPrompt = currentPrompt;
          break;
        }

        // 7. Melhorar prompt
        const improveResult = await chatCompletion({
          messages: [
            { role: "system", content: `Melhore o prompt do ${mode === "lawyer" ? "advogado" : "juiz"} para treinamento jurídico. JSON: {"improved_prompt": "...", "changes": []}` },
            { role: "user", content: `PROMPT ATUAL:\n${currentPrompt}\n\nWEAKNESSES:\n${allWeaknesses.slice(0, 5).join("\n")}\n\nSTRENGTHS:\n${allStrengths.slice(0, 3).join("\n")}\n\nScore atual: ${avgScore}/100. Meta: +${targetImprovement}%. Melhore o prompt para o profissional responder melhor em treinos.` },
          ],
          temperature: 0.7, maxTokens: 4000, model: "gpt-4o-mini",
        });

        if (improveResult.ok) {
          const impParsed = parseJsonResponse(improveResult.data?.choices?.[0]?.message?.content || "");
          if (impParsed?.improved_prompt) {
            currentPrompt = impParsed.improved_prompt as string;
          }
        }
      }

      // Save improved prompt to DB for production agents
      const finalScore = iterations[iterations.length - 1]?.avgScore || 0;
      if (finalPrompt && finalPrompt !== initialPrompt) {
        await saveEvolvedPrompt(mode === "lawyer" ? "lawyer" : "judge", area, finalPrompt, finalScore, {
          source: "auto_train_loop",
          iterations: iterations.length,
          total_improvement: finalScore - baselineScore,
        });
      }

      return new Response(
        JSON.stringify({
          iterations,
          final_prompt: finalPrompt,
          initial_prompt: initialPrompt,
          baseline_score: baselineScore,
          final_score: iterations[iterations.length - 1]?.avgScore || 0,
          total_improvement: baselineScore > 0
            ? Math.round((((iterations[iterations.length - 1]?.avgScore as number) || 0) - baselineScore) / baselineScore * 100)
            : 0,
          target_improvement: targetImprovement,
          reached_target: iterations[iterations.length - 1]?.reachedTarget || false,
          mode,
          provider: "gpt-4o-mini",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // === AÇÕES DE TREINAMENTO DE SECRETARIA ===

    if (action === "secretary_strategy") {
      const strategyId: string = String(body.strategy_id ?? "").trim();
      const strategy = SECRETARY_STRATEGIES.find((s) => s.id === strategyId);
      if (!strategy) {
        return new Response(
          JSON.stringify({ error: `Estratégia não encontrada: ${strategyId}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const stratResult = await chatCompletion({
        messages: [
          { role: "system", content: SECRETARY_STRATEGY_PROMPT },
          { role: "user", content: `Gere um cenário realista de atendimento para a estratégia: "${strategy.name}" — ${strategy.desc}.\n\nO cenário deve simular um cliente real de escritório de advocacia brasileiro. Inclua contexto emocional, urgência, objeções prováveis e detalhes que tornem o treinamento desafiador. Use nomes fictícios brasileiros.` },
        ],
        temperature: 0.8, maxTokens: 2000, model: "gpt-4o-mini", preferFastProvider: true,
      });

      if (!stratResult.ok) {
        return new Response(
          JSON.stringify({ error: "Falha ao gerar cenário" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const parsed = parseJsonResponse(stratResult.data?.choices?.[0]?.message?.content || "");
      const strategyData = {
        scenario: String(parsed?.scenario || "Cenário não disponível."),
        script: String(parsed?.script || ""),
        client_profile: String(parsed?.client_profile || "Cliente não especificado."),
        strategy_id: strategyId,
        strategy_name: strategy.name,
      };

      console.log(`[training-ai] secretary_strategy: ${strategyId}`);
      return new Response(
        JSON.stringify({ strategy: strategyData, provider: "gpt-4o-mini" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "secretary_evaluate") {
      const scenario: string = String(body.scenario ?? "").trim();
      const userResponse: string = String(body.user_response ?? "").trim();
      const strategyId: string = String(body.strategy_id ?? "").trim();
      const currentPrompt: string = String(body.current_prompt ?? "").trim();

      if (!userResponse) {
        return new Response(
          JSON.stringify({ error: "user_response obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const evalResult = await chatCompletion({
        messages: [
          { role: "system", content: SECRETARY_EVALUATE_PROMPT },
          { role: "user", content: `CENÁRIO DE TREINAMENTO:\n${scenario}\n\nESTRATÉGIA: ${strategyId}\n\nRESPOSTA DA SECRETÁRIA:\n${userResponse}\n\nPROMPT ATUAL DA SECRETÁRIA:\n${(currentPrompt || "").slice(0, 1500)}\n\nAvalie a resposta considerando todas as estratégias de atendimento ao cliente. Score 0-100.` },
        ],
        temperature: 0.3, maxTokens: 2000, model: "gpt-4o-mini", preferFastProvider: true,
      });

      if (!evalResult.ok) {
        return new Response(
          JSON.stringify({ error: "Falha ao avaliar resposta" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const parsed = parseJsonResponse(evalResult.data?.choices?.[0]?.message?.content || "");
      const score = typeof parsed?.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 50;

      console.log(`[training-ai] secretary_evaluate: ${strategyId} | Score: ${score}`);
      return new Response(
        JSON.stringify({
          score,
          feedback: String(parsed?.feedback || "Avaliação concluída."),
          strengths: Array.isArray(parsed?.strengths) ? parsed.strengths : [],
          weaknesses: Array.isArray(parsed?.weaknesses) ? parsed.weaknesses : [],
          tips: Array.isArray(parsed?.tips) ? parsed.tips : [],
          improved_response: String(parsed?.improved_response || ""),
          real_pattern_check: parsed?.real_pattern_check || {},
          provider: "gpt-4o-mini",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "improve_prompt") {
      const currentPrompt: string = String(body.current_prompt ?? "").trim();
      const evaluationSummary: string = String(body.evaluation_summary ?? "").trim();
      const weaknesses: string[] = Array.isArray(body.weaknesses) ? body.weaknesses : [];
      const tips: string[] = Array.isArray(body.tips) ? body.tips : [];

      if (!currentPrompt) {
        return new Response(
          JSON.stringify({ error: "current_prompt obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const improveResult = await chatCompletion({
        messages: [
          { role: "system", content: SECRETARY_IMPROVE_PROMPT_PROMPT },
          { role: "user", content: `PROMPT ATUAL DA SECRETÁRIA:\n${currentPrompt.slice(0, 3000)}\n\nRESUMO DA AVALIAÇÃO:\n${evaluationSummary.slice(0, 1500)}\n\nPONTOS FRACOS:\n${weaknesses.map((w, i) => `${i + 1}. ${w}`).join("\n") || "Nenhum identificado"}\n\nDICAS:\n${tips.map((t, i) => `${i + 1}. ${t}`).join("\n") || "Nenhuma identificada"}\n\nMELHORE o prompt da secretária para que ela responda melhor nos próximos treinos. O prompt deve ser completo e autocontido.` },
        ],
        temperature: 0.7, maxTokens: 4000, model: "gpt-4o-mini", preferFastProvider: true,
      });

      if (!improveResult.ok) {
        return new Response(
          JSON.stringify({ error: "Falha ao melhorar prompt" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const parsed = parseJsonResponse(improveResult.data?.choices?.[0]?.message?.content || "");
      const improvedPrompt = String(parsed?.improved_prompt || currentPrompt);

      // Salvar prompt melhorado no banco para que chat-ai (WhatsApp) use
      if (improvedPrompt && improvedPrompt !== currentPrompt && improvedPrompt.trim().length > 100) {
        await saveEvolvedPrompt("secretary", "general", improvedPrompt, 0, {
          source: "secretary_improve_prompt",
          weaknesses_count: weaknesses.length,
          tips_count: tips.length,
        });
        console.log(`[training-ai] improve_prompt: prompt salvo no agent_prompts para WhatsApp`);
      }

      console.log(`[training-ai] improve_prompt: ${weaknesses.length} weaknesses addressed`);
      return new Response(
        JSON.stringify({
          improved_prompt: improvedPrompt,
          changes: Array.isArray(parsed?.changes) ? parsed.changes : [],
          reasoning: String(parsed?.reasoning || "Prompt melhorado com base no feedback."),
          provider: "gpt-4o-mini",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "auto_train") {
      const currentPrompt: string = String(body.current_prompt ?? "").trim();
      if (!currentPrompt) {
        return new Response(
          JSON.stringify({ error: "current_prompt obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const results: Array<Record<string, unknown>> = [];

      for (const strategy of SECRETARY_STRATEGIES) {
        try {
          // 1. Gerar cenário
          const scenResult = await chatCompletion({
            messages: [
              { role: "system", content: SECRETARY_STRATEGY_PROMPT },
              { role: "user", content: `Gere um cenário para a estratégia: "${strategy.name}" — ${strategy.desc}. Use nomes fictícios brasileiros. Cenário realista.` },
            ],
            temperature: 0.8, maxTokens: 1500, model: "gpt-4o-mini", preferFastProvider: true,
          });
          if (!scenResult.ok) continue;
          const scenParsed = parseJsonResponse(scenResult.data?.choices?.[0]?.message?.content || "");
          const scenarioText = String(scenParsed?.scenario || "Cenário não disponível.");

          // 2. Gerar resposta da secretária com o prompt atual
          const respResult = await chatCompletion({
            messages: [
              { role: "system", content: currentPrompt },
              { role: "user", content: `CENÁRIO:\n${scenarioText}\n\nResponda como secretária jurídica da Dra. Kênia Garcia, aplicando estratégias de atendimento.` },
            ],
            temperature: 0.7, maxTokens: 1000, model: "gpt-4o-mini", preferFastProvider: true,
          });
          if (!respResult.ok) continue;
          const secretaryResponse = respResult.data?.choices?.[0]?.message?.content || "";

          // 3. Avaliar resposta
          const evalResult = await chatCompletion({
            messages: [
              { role: "system", content: SECRETARY_EVALUATE_PROMPT },
              { role: "user", content: `CENÁRIO:\n${scenarioText}\n\nESTRATÉGIA: ${strategy.name}\n\nRESPOSTA DA SECRETÁRIA:\n${secretaryResponse}\n\nAvalie. Score 0-100.` },
            ],
            temperature: 0.3, maxTokens: 1500, model: "gpt-4o-mini", preferFastProvider: true,
          });
          if (!evalResult.ok) continue;
          const evalParsed = parseJsonResponse(evalResult.data?.choices?.[0]?.message?.content || "");

          results.push({
            strategy_id: strategy.id,
            strategy_name: strategy.name,
            score: typeof evalParsed?.score === "number" ? evalParsed.score : 50,
            feedback: String(evalParsed?.feedback || ""),
            strengths: Array.isArray(evalParsed?.strengths) ? evalParsed.strengths : [],
            weaknesses: Array.isArray(evalParsed?.weaknesses) ? evalParsed.weaknesses : [],
          });
        } catch { /* skip */ }
      }

      const scores = results.map((r) => r.score as number || 0);
      const total = results.length;
      const passed = scores.filter((s) => s >= 60).length;
      const avgScore = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;

      // Coletar weaknesses e melhorar prompt
      const allWeaknesses: string[] = [];
      const allStrengths: string[] = [];
      results.forEach((r) => {
        if (Array.isArray(r.weaknesses)) allWeaknesses.push(...(r.weaknesses as string[]));
        if (Array.isArray(r.strengths)) allStrengths.push(...(r.strengths as string[]));
      });

      let improvedPrompt: string | null = null;
      if (allWeaknesses.length > 0) {
        const improveResult = await chatCompletion({
          messages: [
            { role: "system", content: SECRETARY_IMPROVE_PROMPT_PROMPT },
            { role: "user", content: `PROMPT ATUAL:\n${currentPrompt.slice(0, 2500)}\n\nWEAKNESSES:\n${[...new Set(allWeaknesses)].slice(0, 8).join("\n")}\n\nSTRENGTHS:\n${[...new Set(allStrengths)].slice(0, 5).join("\n")}\n\nScore médio: ${avgScore}/100. Melhore o prompt.` },
          ],
          temperature: 0.7, maxTokens: 4000, model: "gpt-4o-mini", preferFastProvider: true,
        });
        if (improveResult.ok) {
          const impParsed = parseJsonResponse(improveResult.data?.choices?.[0]?.message?.content || "");
          if (impParsed?.improved_prompt) improvedPrompt = impParsed.improved_prompt as string;
        }
      }

      // Salvar prompt melhorado no banco
      if (improvedPrompt && improvedPrompt !== currentPrompt && improvedPrompt.trim().length > 100) {
        await saveEvolvedPrompt("secretary", "general", improvedPrompt, avgScore, {
          source: "secretary_auto_train",
          strategies_tested: total,
          avg_score: avgScore,
        });
        console.log(`[training-ai] auto_train: prompt melhorado salvo no agent_prompts`);
      }

      console.log(`[training-ai] auto_train: ${total} strategies, avg: ${avgScore}, passed: ${passed}`);
      return new Response(
        JSON.stringify({
          results,
          stats: { total, passed, avgScore },
          improved_prompt: improvedPrompt,
          provider: "gpt-4o-mini",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "auto_train_loop") {
      // Secretary-specific auto_train_loop (different from the legal training one)
      const currentPrompt: string = String(body.current_prompt ?? "").trim();
      const targetImprovement: number = Number(body.target_improvement ?? 20);
      const maxIterations: number = Math.min(Number(body.max_iterations ?? 3), 3);

      if (!currentPrompt) {
        return new Response(
          JSON.stringify({ error: "current_prompt obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const iterations: Array<Record<string, unknown>> = [];
      let activePrompt = currentPrompt;
      let baselineScore = 0;

      for (let iter = 1; iter <= maxIterations; iter++) {
        console.log(`[training-ai] secretary auto_train_loop iteration ${iter}/${maxIterations}`);

        const iterResults: Array<Record<string, unknown>> = [];

        for (const strategy of SECRETARY_STRATEGIES.slice(0, 5)) {
          try {
            const scenResult = await chatCompletion({
              messages: [
                { role: "system", content: SECRETARY_STRATEGY_PROMPT },
                { role: "user", content: `Cenário para: "${strategy.name}" — ${strategy.desc}. Només fictícios.` },
              ],
              temperature: 0.8, maxTokens: 1200, model: "gpt-4o-mini", preferFastProvider: true,
            });
            if (!scenResult.ok) continue;
            const scenParsed = parseJsonResponse(scenResult.data?.choices?.[0]?.message?.content || "");
            const scenarioText = String(scenParsed?.scenario || "");

            const respResult = await chatCompletion({
              messages: [
                { role: "system", content: activePrompt },
                { role: "user", content: `CENÁRIO:\n${scenarioText}\n\nResponda como secretária jurídica.` },
              ],
              temperature: 0.7, maxTokens: 800, model: "gpt-4o-mini", preferFastProvider: true,
            });
            if (!respResult.ok) continue;
            const secretaryResponse = respResult.data?.choices?.[0]?.message?.content || "";

            const evalResult = await chatCompletion({
              messages: [
                { role: "system", content: SECRETARY_EVALUATE_PROMPT },
                { role: "user", content: `CENÁRIO:\n${scenarioText}\n\nRESPOSTA:\n${secretaryResponse}\n\nAvalie. Score 0-100.` },
              ],
              temperature: 0.3, maxTokens: 1200, model: "gpt-4o-mini", preferFastProvider: true,
            });
            if (!evalResult.ok) continue;
            const evalParsed = parseJsonResponse(evalResult.data?.choices?.[0]?.message?.content || "");

            iterResults.push({
              strategy_id: strategy.id,
              score: typeof evalParsed?.score === "number" ? evalParsed.score : 50,
              weaknesses: Array.isArray(evalParsed?.weaknesses) ? evalParsed.weaknesses : [],
              strengths: Array.isArray(evalParsed?.strengths) ? evalParsed.strengths : [],
            });
          } catch { /* skip */ }
        }

        const scores = iterResults.map((r) => r.score as number || 0);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        if (iter === 1) baselineScore = avgScore;

        const improvement = baselineScore > 0 ? Math.round(((avgScore - baselineScore) / baselineScore) * 100) : 0;
        const reachedTarget = improvement >= targetImprovement;

        const allWeaknesses: string[] = [];
        const allStrengths: string[] = [];
        iterResults.forEach((r) => {
          if (Array.isArray(r.weaknesses)) allWeaknesses.push(...(r.weaknesses as string[]));
          if (Array.isArray(r.strengths)) allStrengths.push(...(r.strengths as string[]));
        });

        iterations.push({
          iteration: iter,
          avgScore,
          baselineScore,
          improvement,
          passed: scores.filter((s) => s >= 60).length,
          total: iterResults.length,
          weaknesses: [...new Set(allWeaknesses)].slice(0, 10),
          strengths: [...new Set(allStrengths)].slice(0, 10),
          reachedTarget,
        });

        if (reachedTarget || iter >= maxIterations) break;

        // Melhorar prompt
        const improveResult = await chatCompletion({
          messages: [
            { role: "system", content: SECRETARY_IMPROVE_PROMPT_PROMPT },
            { role: "user", content: `PROMPT ATUAL:\n${activePrompt.slice(0, 2500)}\n\nWEAKNESSES:\n${allWeaknesses.slice(0, 5).join("\n")}\n\nSTRENGTHS:\n${allStrengths.slice(0, 3).join("\n")}\n\nScore: ${avgScore}/100. Meta: +${targetImprovement}%. Melhore o prompt.` },
          ],
          temperature: 0.7, maxTokens: 4000, model: "gpt-4o-mini", preferFastProvider: true,
        });
        if (improveResult.ok) {
          const impParsed = parseJsonResponse(improveResult.data?.choices?.[0]?.message?.content || "");
          if (impParsed?.improved_prompt) activePrompt = impParsed.improved_prompt as string;
        }
      }

      const finalScore = iterations[iterations.length - 1]?.avgScore || 0;
      const totalImprovement = baselineScore > 0
        ? Math.round(((finalScore as number) - baselineScore) / baselineScore * 100)
        : 0;

      // Save evolved prompt
      if (activePrompt !== currentPrompt) {
        await saveEvolvedPrompt("secretary", "general", activePrompt, finalScore as number, {
          source: "secretary_auto_train_loop",
          iterations: iterations.length,
          total_improvement: totalImprovement,
        });
      }

      console.log(`[training-ai] secretary auto_train_loop done: score ${finalScore}, improvement: +${totalImprovement}%`);
      return new Response(
        JSON.stringify({
          iterations,
          final_prompt: activePrompt,
          initial_prompt: currentPrompt,
          baseline_score: baselineScore,
          final_score: finalScore,
          total_improvement: totalImprovement,
          target_improvement: targetImprovement,
          reached_target: iterations[iterations.length - 1]?.reachedTarget || false,
          provider: "gpt-4o-mini",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ];

    console.log("[training-ai] Calling AI, action:", action);

    const aiResult = await chatCompletion({
      messages,
      temperature: action === "evaluate" ? 0.3 : action === "evaluate_and_correct" ? 0.5 : 0.8,
      maxTokens: 4000,
      model: "gpt-4o-mini",
    });

    if (!aiResult.ok) {
      console.error("[training-ai] AI failed:", aiResult.status, aiResult.error);
      return new Response(
        JSON.stringify({ error: "Nenhum provider de IA disponível", details: String(aiResult.error || "").slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawText = aiResult.data?.choices?.[0]?.message?.content || "";
    console.log("[training-ai] Got response, length:", rawText.length, "provider:", aiResult.provider);

    const parsed = parseJsonResponse(rawText);

    if (!parsed) {
      console.error("[training-ai] Parse failed. Raw length:", rawText.length);
      return new Response(
        JSON.stringify({ error: "Não foi possível parsear resposta da IA", debug: rawText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "generate_case") {
      const case_data = parsed.case_data || parsed;
      console.log("[training-ai] Case generated via", aiResult.provider);
      return new Response(
        JSON.stringify({ case_data, provider: aiResult.provider }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "evaluate") {
      const evalScore = typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 50;
      const evalData = parsed.evaluation || {};
      const feedback = String(parsed.feedback || "Avaliação concluída.");
      console.log("[training-ai] Evaluated via", aiResult.provider, "Score:", evalScore);
      return new Response(
        JSON.stringify({ score: evalScore, feedback: lawyerFeedback + "\n\n---\n\n" + feedback, evaluation: evalData, lawyer_feedback: lawyerFeedback, provider: aiResult.provider }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "evaluate_and_correct") {
      const correctedResponseText = String(parsed.corrected_response || "");
      const changes = Array.isArray(parsed.changes) ? parsed.changes : [];
      const summary = String(parsed.summary || "Correção aplicada.");
      console.log("[training-ai] Corrected via", aiResult.provider, "Changes:", changes.length);
      return new Response(
        JSON.stringify({ corrected_response: correctedResponseText, changes, summary, provider: aiResult.provider }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "improve_argument") {
      const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
      const prioritySuggestion = String(parsed.priority_suggestion || "");
      const quickWins = Array.isArray(parsed.quick_wins) ? parsed.quick_wins : [];
      console.log("[training-ai] Suggestions via", aiResult.provider, "Count:", suggestions.length);
      return new Response(
        JSON.stringify({ suggestions, priority_suggestion: prioritySuggestion, quick_wins: quickWins, provider: aiResult.provider }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação desconhecida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[training-ai] fatal:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
