import { chatCompletion } from "../_shared/llm.ts";
import { getEvolvedPrompt, saveEvolvedPrompt } from "../_shared/prompts.ts";
import { JUDGE_BASE_PROMPT, AREA_PROMPTS } from "../_shared/judge_prompt.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ZEN_BASE = "https://opencode.ai/zen/v1/chat/completions";
const ZEN_KEY = Deno.env.get("ZEN_API_KEY") || "";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Lê um stream SSE (OpenAI chat.completions) agregando apenas o conteúdo.
async function readSSEText(resp: Response): Promise<string> {
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const data = t.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        if (json?.error) continue;
        const delta = json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content;
        if (delta) text += delta;
      } catch {}
    }
  }
  return text.trim();
}

// OpenCode Zen (nuvem, gratuito). candidates: modelo(s) a tentar. timeoutMs por candidato.
// mimo-v2.5-free não tem reasoning-burn: gera conteúdo direto e rápido (~30-60s).
// deepseek/big-pickle (reasoning) queimam o max_tokens com raciocínio antes de emitir
// conteúdo, por isso ficam como fallback.
async function zenComplete(
  system: string,
  user: string,
  maxTokens = 16000,
  candidates = ["mimo-v2.5-free", "deepseek-v4-flash-free", "big-pickle"],
  timeoutMs = 140000,
): Promise<string> {
  if (!ZEN_KEY) return "";
  const patchedSystem = `INSTRUÇÃO CRÍTICA: Responda SEMPRE em português brasileiro. NUNCA responda em inglês. NÃO inclua raciocínio interno ou análise. Responda apenas com a resposta final.\n\n${system}`;
  for (const candidate of candidates) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const resp = await fetch(ZEN_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: ZEN_KEY },
        body: JSON.stringify({
          model: candidate,
          messages: [
            { role: "system", content: patchedSystem },
            { role: "user", content: user },
          ],
          max_tokens: maxTokens,
          stream: true,
        }),
        signal: ac.signal,
      });
      if (!resp.ok || !resp.body) {
        await resp?.text().catch(() => {});
        clearTimeout(timer);
        console.warn(`[auto-improve] Zen ${candidate} falhou: ${resp?.status}`);
        continue;
      }
      const text = await readSSEText(resp);
      clearTimeout(timer);
      if (text) return text;
    } catch (e) {
      clearTimeout(timer);
      console.warn(`[auto-improve] Zen ${candidate} erro:`, (e as Error)?.message);
    }
  }
  return "";
}

// Claude FCC não é utilizável neste caso (nem Nemotron/NIM). Cadeia 100% nuvem:
// OpenCode Zen → Gemini/Emergent.

// Gera sentença: Zen (nuvem) → Gemini/Emergent (nuvem).
async function generateSentence(system: string, user: string): Promise<string> {
  const t0 = Date.now();
  const zen = await zenComplete(system, user, 16000, ["mimo-v2.5-free"], 135000);
  if (zen) return zen;
  if (Date.now() - t0 > 40000) return "";
  console.warn("[auto-improve] Zen sentença vazio, tentando Gemini/Emergent...");
  const cc = await chatCompletion({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 8000,
    preferFastProvider: true,
  });
  return cc.ok ? (cc.data?.choices?.[0]?.message?.content || "") : "";
}

// LLM genérico: Zen (nuvem) → chatCompletion (Gemini/Emergent, nuvem). Funciona com o PC desligado.
async function llmComplete(system: string, user: string, maxTokens = 4000): Promise<string> {
  const r = await llmCompleteDetailed(system, user, maxTokens);
  return r.text;
}

// Igual a llmComplete, mas também retorna o que cada provider tentou (diagnóstico).
async function llmCompleteDetailed(
  system: string,
  user: string,
  maxTokens = 4000,
  timeoutMs = 115000,
): Promise<{ text: string; attempts: Array<Record<string, unknown>> }> {
  const attempts: Array<Record<string, unknown>> = [];
  const t0 = Date.now();
  const zen = await zenComplete(system, user, Math.max(maxTokens, 16000), ["mimo-v2.5-free"], timeoutMs);
  attempts.push({ provider: "zen", ms: Date.now() - t0, len: zen.length, model: "mimo-v2.5-free" });
  if (zen) return { text: zen, attempts };
  console.warn("[auto-improve] Zen vazio, tentando chatCompletion...");
  const t2 = Date.now();
  const cc = await chatCompletion({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens,
    preferFastProvider: true,
  });
  const ccText = cc.ok ? cc.data?.choices?.[0]?.message?.content || "" : "";
  attempts.push({
    provider: "chatCompletion",
    ms: Date.now() - t2,
    len: ccText.length,
    status: cc.ok ? cc.status : cc.status,
    error: cc.ok ? undefined : String(cc.error || "").slice(0, 200),
    providerName: (cc as any).provider,
  });
  if (cc.ok && ccText) return { text: ccText, attempts };
  console.warn("[auto-improve] fallback chatCompletion falhou:", cc.error);
  return { text: "", attempts };
}

// Roda a cadeia Zen → chat pedindo JSON. Se o provedor voltar texto livre,
// faz UMA tentativa de conversão estrita (coerção) com o mesmo esquema.
async function llmJson(
  system: string,
  user: string,
  schemaDef: string,
  maxTokens = 2500,
  timeoutMs = 65000,
): Promise<{ parsed: Record<string, unknown> | null; text: string; attempts: Array<Record<string, unknown>> }> {
  const firstStart = Date.now();
  const first = await llmCompleteDetailed(system, user, maxTokens, timeoutMs);
  let parsed = parseJsonResponse(first.text);
  if (parsed) return { parsed, text: first.text, attempts: first.attempts };
  if (!first.text) return { parsed: null, text: "", attempts: first.attempts };
  if (Date.now() - firstStart >= 70000) {
    return { parsed: null, text: first.text, attempts: first.attempts };
  }
  console.warn("[auto-improve] Resposta não-JSON, tentando conversão estrita...");
  const coerced = await llmCompleteDetailed(
    `IMPORTANTE: Sua resposta será interpretada por máquina. Converta EXCLUSIVAMENTE o texto abaixo em UM objeto JSON válido EXATAMENTE neste formato:\n${schemaDef}\nNão inclua nenhum texto, marcação ou comentário antes ou depois do JSON. Responda apenas com o objeto JSON.\n\nTEXTO A CONVERTER:\n${first.text.slice(0, 8000)}`,
    "Converta para JSON.",
    maxTokens,
    timeoutMs,
  );
  const parsed2 = parseJsonResponse(coerced.text);
  return { parsed: parsed2, text: coerced.text || first.text, attempts: [...first.attempts, ...coerced.attempts] };
}

function parseJsonResponse(raw: string): Record<string, unknown> | null {
  let text = (raw || "").trim();
  if (!text) return null;
  text = text.replace(/<think>[\s\S]*?<\/think>/giu, "").trim();
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
  }
  const braceStart = text.indexOf("{");
  const bracketStart = text.indexOf("[");
  let jsonStart = -1;
  if (braceStart >= 0 && bracketStart >= 0) jsonStart = Math.min(braceStart, bracketStart);
  else if (braceStart >= 0) jsonStart = braceStart;
  else if (bracketStart >= 0) jsonStart = bracketStart;
  if (jsonStart >= 0) {
    const candidate = text.slice(jsonStart);
    try { return JSON.parse(candidate); } catch {}
    let depth = 0;
    let inString = false;
    let escape = false;
    const endChar = candidate[0] === "{" ? "}" : "]";
    for (let i = 0; i < candidate.length; i++) {
      const c = candidate[i];
      if (escape) { escape = false; continue; }
      if (c === "\\") { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === "{" || c === "[") depth++;
      if (c === "}" || c === "]") depth--;
      if (depth === 0) {
        try { return JSON.parse(candidate.slice(0, i + 1)); } catch {}
        break;
      }
    }
  }
  return null;
}

const CASE_GEN_PROMPT = `IMPORTANTE: Responda APENAS em PORTUGUÊS DO BRASIL. NUNCA use inglês. NÃO inclua raciocínio interno.

Você é um professor de direito brasileiro criando um CASO SIMULADO REALISTA para treinamento de julgamento. Gere um caso completo com:
- Contexto fático detalhado (partes, relação jurídica, contrato/fatos, histórico)
- Provas disponíveis (documentos, contratos, perícias, mensagens, registros digitais, blockchain, etc.)
- Posições de cada parte
- Questões jurídicas controvertidas (3 a 5)
- Tensão jurídica real (sem resposta óbvia)
- Nomes fictícios brasileiros
- Nenhum dado pessoal real

Retorne apenas o texto do enunciado do caso (entre 300 e 800 palavras), pronto para um juiz julgar. Não adicione nada além do caso.`;

const GENERATE_SENTENCE_SYSTEM = (prompt: string) =>
  `${prompt}\n\nIMPORTANTE: Elabore a sentença completa do caso abaixo em português brasileiro, seguindo obrigatoriamente todas as seções do fluxo (I-Relatório, II-Fundamentação, III-Provas, IV-Questões Jurídicas, V-Fundamentação Constitucional, VI-Direito Internacional, VII-Inteligência Artificial e VIII-Dispositivo). Decida todos os pedidos. Não invente artigos, leis, súmulas ou precedentes.`;

const ANALYSIS_PROMPT = `IMPORTANTE: Responda APENAS em PORTUGUÊS DO BRASIL. NUNCA use inglês. NÃO inclua raciocínio interno.

Você é um auditor jurídico RIGOROSO de tribunais superiores (STF/STJ). Analise a SENTENÇA gerada por IA para um CASO hipotético e identifique TODOS os erros.

RETORNE APENAS JSON válido:
{
  "score": 0-100,
  "summary": "resumo do nível de qualidade em 2-3 frases",
  "errors": [
    { "type": "juridico|processual|estrutural|alucinacao|redacao|logica", "severity": "critico|moderado|menor", "description": "descrição do erro", "fix": "como corrigir" }
  ],
  "strengths": ["ponto forte específico"],
  "suggestions": ["sugestão específica de melhoria do prompt"]
}

CRITÉRIOS DE ANÁLISE:
- ALUCINAÇÃO (severidade crítica): artigos/leis/súmulas/precedentes INVENTADOS ou com número/teor errado.
- ESTRUTURA: a sentença contém I-Relatório, II-Fundamentação, III-Provas, IV-Questões Jurídicas, V-Fundamentação Constitucional, VI-Direito Internacional, VII-Inteligência Artificial e VIII-Dispositivo?
- DISPOSITIVO: todos os pedidos foram julgados (procedência/improcedência)? Tutela de urgência, honorários, custas, juros, correção monetária e determinações?
- LÓGICA: contradições internas, erros de raciocínio, conclusões sem fundamento.
- ÔNUS DA PROVA: distribuído corretamente quando houve incerteza probatória.
- LACUNAS: tratadas com analogia, princípios gerais e LINDB.
- FUNDAMENTAÇÃO: toda conclusão tem base legal, lógica e probatória.
- REDAÇÃO: português jurídico, impessoal, sem juridiquês vazio.

Seja RIGOROSO: sentença medíocre ou incompleta não pode receber score alto.`;

const IMPROVE_PROMPT = `IMPORTANTE: Responda APENAS em PORTUGUÊS DO BRASIL. NUNCA use inglês. NÃO inclua raciocínio interno.

Você é um especialista em otimização de prompts jurídicos. MELHORE o prompt de um Juiz Virtual brasileiro que gera sentenças completas para casos hipotéticos.

O prompt atual gerou uma sentença com score {score}/100 e estes pontos fracos:

ERROS:
{errors}

PONTOS FORTES (manter):
{strengths}

SUGESTÕES DE MELHORIA:
{suggestions}

RETORNE APENAS JSON válido:
{
  "improved_prompt": "O prompt COMPLETO melhorado, autocontido e pronto para uso. Deve: manter a identidade de Desembargador Federal/STJ, manter a estrutura obrigatória da sentença (I a VIII), manter as regras de integridade (nunca inventar artigos, leis, súmulas ou precedentes), manter a regra 'julgar o caso, não revisar sentença', e ADICIONAR instruções específicas que corrijam os erros identificados. Escreva o prompt em texto puro, sem escapar aspas nem quebrar o texto com barras.",
  "changes": [
    { "area": "seção alterada", "before": "como estava", "after": "como ficou", "reason": "por que mudou" }
  ],
  "summary": "resumo em 2-3 frases das melhorias aplicadas"
}

REGRAS:
- O improved_prompt deve ser um prompt COMPLETO (não um diff, não instruções soltas).
- Mantenha o que já funcionava.
- Priorize: eliminar alucinações, completar a estrutura, aprimorar o Dispositivo, reforçar a distribuição do ônus da prova e o enfrentamento de todas as teses.`;

function currentPromptFor(area: string): string {
  let p = JUDGE_BASE_PROMPT;
  if (area && AREA_PROMPTS[area]) p += AREA_PROMPTS[area];
  return p;
}

async function activePrompt(area: string): Promise<string> {
  let p = currentPromptFor(area);
  try {
    const evolved = await getEvolvedPrompt("judge", area || "*");
    if (evolved && evolved.trim().length > 100) p = evolved;
  } catch (e) {
    console.warn("[auto-improve] Falha ao buscar prompt evoluído:", e);
  }
  return p;
}

// ---------- server ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const action: string = String(body.action ?? "").trim();
  const area: string = String(body.area ?? "").trim();

  if (action === "generate_case") {
    const caseStr = await llmComplete(CASE_GEN_PROMPT, `Área: ${area || "geral"}. Gere um caso simulado realista.`, 2500);
    if (!caseStr) return json({ ok: false, error: "Falha ao gerar o caso." }, 502);
    return json({ ok: true, case: caseStr });
  }

  if (action === "generate_sentence") {
    const caseStr: string = String(body.case ?? "").trim();
    if (!caseStr) return json({ ok: false, error: "case obrigatório" }, 400);
    const prompt = await activePrompt(area);
    const userMsg = `Abaixo está o enunciado do caso a ser julgado. Elabore a sentença original completa, resolvendo integralmente o caso:\n\n${caseStr}`;

    const sentence = await generateSentence(GENERATE_SENTENCE_SYSTEM(prompt), userMsg);
    if (!sentence) return json({ ok: false, error: "Falha ao gerar a sentença (tempo limite dos provedores)." }, 502);
    return json({
      ok: true,
      sentence,
      complete: /disposit/iu.test(sentence),
      area,
      promptVersion: "evolved",
    });
  }

  if (action === "continue_sentence") {
    const partial: string = String(body.partial ?? "").trim();
    const caseStr: string = String(body.case ?? "").trim();
    if (!partial) return json({ ok: false, error: "partial obrigatório" }, 400);
    const prompt = await activePrompt(area);
    const userMsg = `Abaixo está a sentença do caso, que foi INTERROMPIDA ANTES DO FIM. Complete-a a partir de onde parou, finalizando todas as seções faltantes (especialmente o VIII-Dispositivo com o julgamento de TODOS os pedidos). Não repita texto já escrito.\n\nCASO:\n${caseStr}\n\nSENTENÇA PARCIAL:\n${partial.slice(-6000)}`;

    const continued = await generateSentence(GENERATE_SENTENCE_SYSTEM(prompt), userMsg);
    if (!continued) return json({ ok: false, error: "Falha ao completar a sentença." }, 502);
    const full = partial.trim().endsWith("...") ? partial.trim().slice(0, -3) : partial.trim();
    const sentence = `${full}\n\n${continued.trim()}`;
    return json({
      ok: true,
      sentence,
      complete: /disposit/iu.test(sentence),
      area,
    });
  }

  if (action === "analyze") {
    const caseStr: string = String(body.case ?? "").trim();
    const sentence: string = String(body.sentence ?? "").trim();
    if (!sentence) return json({ ok: false, error: "sentence obrigatório" }, 400);
    const schema = `{"score": 0-100, "summary": "string", "errors": [{"type": "juridico|processual|estrutural|alucinacao|redacao|logica", "severity": "critico|moderado|menor", "description": "string", "fix": "string"}], "strengths": ["string"], "suggestions": ["string"]}`;
    const res = await llmJson(ANALYSIS_PROMPT, `CASO:\n${caseStr}\n\nSENTENÇA GERADA:\n${sentence}`, schema, 2500);
    const parsed = res.parsed;
    const analysis = {
      score: parsed && typeof parsed.score === "number" ? parsed.score : 0,
      summary: String(parsed?.summary || "Análise concluída"),
      errors: Array.isArray(parsed?.errors) ? parsed.errors : [],
      strengths: Array.isArray(parsed?.strengths) ? parsed.strengths.map((s) => String(s)) : [],
      suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions.map((s) => String(s)) : [],
    };
    const criticalErrors = analysis.errors.filter((e: any) => e?.severity === "critico" || e?.type === "alucinacao").length;
    const diag = { attempts: res.attempts, rawLen: res.text.length, raw: res.text.slice(0, 4000) };
    return json({ ok: true, ...analysis, criticalErrors, _diag: diag });
  }

  if (action === "improve") {
    const caseStr: string = String(body.case ?? "").trim();
    const sentence: string = String(body.sentence ?? "").trim();
    const analysis = body.analysis || {};
    const score: number = typeof analysis.score === "number" ? analysis.score : 0;
    const errors: unknown[] = Array.isArray(analysis.errors) ? analysis.errors : [];
    const strengths: string[] = Array.isArray(analysis.strengths) ? analysis.strengths.map((s: unknown) => String(s)) : [];
    const suggestions: string[] = Array.isArray(analysis.suggestions) ? analysis.suggestions.map((s: unknown) => String(s)) : [];

    const prompt = await activePrompt(area);
    const schema = `{"improved_prompt": "string (prompt completo)", "changes": [{"area": "string", "before": "string", "after": "string", "reason": "string"}], "summary": "string"}`;
    const res = await llmJson(
      IMPROVE_PROMPT
        .replace("{score}", String(score))
        .replace("{errors}", errors.slice(0, 12).map((e: any) => `- [${e?.severity || "menor"}] ${e?.description || ""} → ${e?.fix || ""}`).join("\n") || "Nenhum erro listado")
        .replace("{strengths}", strengths.join("\n- ") || "Nenhum")
        .replace("{suggestions}", suggestions.join("\n- ") || "Nenhuma"),
      `PROMPT ATUAL:\n${prompt}\n\nCASO:\n${caseStr}\n\nSENTENÇA GERADA:\n${sentence.slice(0, 6000)}`,
      schema,
      5000,
    );
    const improved = res.parsed;
    const improvedPrompt = improved?.improved_prompt ? String(improved.improved_prompt).trim() : "";
    if (!improvedPrompt || improvedPrompt.length < 300) {
      return json({ ok: false, error: "Prompt melhorado inválido.", raw: String(res.text || "").slice(0, 500) }, 502);
    }
    const saved = await saveEvolvedPrompt("judge", area, improvedPrompt, score, {
      source: "auto-improve",
      error_count: errors.length,
    });
    return json({
      ok: true,
      saved,
      area: area || "general",
      score,
      summary: String(improved?.summary || "Prompt melhorado com base nos erros identificados."),
      changes: Array.isArray(improved?.changes) ? improved.changes.slice(0, 20) : [],
      prompt: improvedPrompt,
    });
  }

  return json({ ok: false, error: `ação desconhecida: ${action}` }, 400);
});
