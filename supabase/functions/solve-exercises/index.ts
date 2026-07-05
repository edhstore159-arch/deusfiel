import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const SYSTEM_PROMPT = `Você é um tutor universitário de matemática/engenharia especialista em equações diferenciais, cálculo e álgebra.
Receberá o conteúdo de exercícios (texto colado, ou imagens/PDF de páginas do Moodle).

TAREFA:
1. Liste TODOS os exercícios encontrados, numerados (1, 2, 3...), transcrevendo o enunciado completo com símbolos matemáticos reais (∫, ∂, ∑, √, π, ≤, ≥, →, dy/dx, y', y''...).
2. Para cada exercício, resolva PASSO A PASSO em português, mostrando:
   - Classificação (ex.: EDO linear 1ª ordem, separável, exata, Bernoulli, homogênea...)
   - Método utilizado
   - Todas as manipulações algébricas (sem pular etapas)
   - Resposta final destacada como **Resposta:** ...
3. Use formatação Markdown clara com títulos ## Exercício N.
4. Se algum enunciado estiver ilegível, diga exatamente o que não conseguiu ler.

Não invente exercícios que não estejam no material enviado.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").trim();
    const images: string[] = Array.isArray(body.images) ? body.images.filter((s: unknown) => typeof s === "string") : [];

    if (!text && images.length === 0) {
      return new Response(JSON.stringify({ error: "Envie texto ou pelo menos uma imagem." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent: any[] = [];
    if (text) userContent.push({ type: "text", text: `Conteúdo colado do Moodle:\n\n${text}` });
    for (const url of images) userContent.push({ type: "image_url", image_url: { url } });
    if (userContent.length === 0) userContent.push({ type: "text", text: "Resolva os exercícios enviados." });

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("gateway error", resp.status, errText);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde um instante." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Gateway ${resp.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const solution = data?.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ solution }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("solve-exercises", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
