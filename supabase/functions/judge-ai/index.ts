// Edge function: Juiz Virtual — agente que emite um "parecer" imparcial
// analisando fatos, provas e o direito aplicável, com base na Lovable AI.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
    if (!EMERGENT_API_KEY) {
      return new Response(JSON.stringify({ error: "EMERGENT_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    const caseText = typeof body?.case === "string" ? body.case.trim() : "";

    if (!messages && !caseText) {
      return new Response(JSON.stringify({ error: "Envie 'case' (texto do caso) ou 'messages' (histórico)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatMessages = messages ?? [{ role: "user", content: caseText }];
    const fullMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...chatMessages];

    const upstream = await fetch("https://integrations.emergentagent.com/llm/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${EMERGENT_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: fullMessages, stream: true }),
    });

    if (upstream.ok) {
      return new Response(upstream.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Judge-Provider": "emergent", "X-Judge-Model": "gpt-4o-mini" },
      });
    }

    const errText = await upstream.text().catch(() => "");
    console.error(`judge-ai emergent failed: ${upstream.status} ${errText}`);
    const friendly = upstream.status === 402
      ? "Créditos da chave Emergent esgotados."
      : upstream.status === 429
      ? "Limite de requisições atingido. Tente novamente em instantes."
      : "Falha no gateway de IA.";
    return new Response(JSON.stringify({ error: friendly, provider: "emergent", status: upstream.status, details: errText }), {
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
