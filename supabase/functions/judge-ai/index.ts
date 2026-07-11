// Edge function: Juiz Virtual — agente que emite um "parecer" imparcial
// analisando fatos, provas e o direito aplicável, com base na Lovable AI.
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
Analise cada questão à luz do direito brasileiro aplicável. Cite artigos de lei, súmulas e jurisprudência relevante (STF, STJ, TST, TJs) quando pertinente. Explique o raciocínio de forma clara.

### 4. Dispositivo (parecer)
Apresente sua conclusão fundamentada: quem tem razão, em que medida, e o que deve ser feito.

### 5. Recomendações práticas
Próximos passos concretos que o usuário deveria adotar (documentos a reunir, ações judiciais cabíveis, prazos, tentativa de acordo etc.).

### 6. Aviso legal
Deixe claro que este é um parecer orientativo produzido por IA, sem valor de decisão judicial, e recomende a consulta a um advogado (idealmente à Dra. Kênia Garcia) antes de qualquer medida definitiva.

## REGRAS

- Português do Brasil, tom profissional e didático.
- Sempre concluir o raciocínio — nunca deixe resposta pela metade.
- Se faltarem informações essenciais (data, valores, partes envolvidas), faça no máximo UMA pergunta objetiva antes de emitir o parecer.
- Nunca invente jurisprudência: cite apenas o que realmente conhece; quando incerto, diga "orientação majoritária" em vez de inventar número de acórdão.
- Não emita juízo moral, apenas jurídico.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    const caseText = typeof body?.case === "string" ? body.case.trim() : "";
    const provider = body?.provider === "emergent" ? "emergent" : "lovable";

    if (!messages && !caseText) {
      return new Response(JSON.stringify({ error: "Envie 'case' (texto do caso) ou 'messages' (histórico)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatMessages = messages ?? [{ role: "user", content: caseText }];
    const fullMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...chatMessages];

    type Target = { name: "lovable" | "emergent"; url: string; apiKey: string; model: string };
    const targets: Target[] = [];
    const pushLovable = () => LOVABLE_API_KEY && targets.push({
      name: "lovable",
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      apiKey: LOVABLE_API_KEY,
      model: "google/gemini-2.5-flash",
    });
    const pushEmergent = () => EMERGENT_API_KEY && targets.push({
      name: "emergent",
      url: "https://integrations.emergentagent.com/llm/chat/completions",
      apiKey: EMERGENT_API_KEY,
      model: "gpt-4o-mini",
    });
    if (provider === "emergent") { pushEmergent(); pushLovable(); }
    else { pushLovable(); pushEmergent(); }

    if (targets.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum provedor de IA configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let lastStatus = 500;
    let lastText = "";
    let lastProvider = targets[0].name;
    for (const t of targets) {
      const upstream = await fetch(t.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${t.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: t.model, messages: fullMessages, stream: true }),
      });
      if (upstream.ok) {
        return new Response(upstream.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Judge-Provider": t.name, "X-Judge-Model": t.model },
        });
      }
      lastStatus = upstream.status;
      lastText = await upstream.text().catch(() => "");
      lastProvider = t.name;
      console.error(`judge-ai provider ${t.name} failed: ${upstream.status} ${lastText}`);
      // Only fallback on credit/rate errors
      if (upstream.status !== 402 && upstream.status !== 429) break;
    }

    const friendly = lastStatus === 402
      ? "Créditos de IA esgotados. Alterne o motor ou adicione créditos."
      : lastStatus === 429
      ? "Limite de requisições atingido. Tente novamente em instantes."
      : "Falha no gateway de IA.";
    return new Response(JSON.stringify({ error: friendly, provider: lastProvider, status: lastStatus, details: lastText }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
