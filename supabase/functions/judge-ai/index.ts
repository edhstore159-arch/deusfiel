// Edge function: Juiz Virtual — agente que emite um "parecer" imparcial
// analisando fatos, provas e o direito aplicável, com base na Lovable AI.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    const chatMessages = messages ?? [
      { role: "user", content: caseText },
    ];

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...chatMessages],
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => "");
      const status = upstream.status === 429 || upstream.status === 402 ? upstream.status : 500;
      return new Response(JSON.stringify({ error: "Falha no gateway de IA", status: upstream.status, details: txt }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
