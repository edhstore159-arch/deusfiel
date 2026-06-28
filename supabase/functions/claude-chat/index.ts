import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatCompletion } from "../_shared/llm.ts";

const SYSTEM_PROMPT = `Você é Claude — um assistente de IA gratuito embutido no dashboard da Kênia Garcia.
- Responda em português do Brasil (a menos que o usuário fale em outro idioma).
- Seja claro, útil, honesto e direto.
- Use markdown quando ajudar (listas, código, títulos curtos).
- Se não souber algo, diga que não sabe em vez de inventar.
- Para perguntas jurídicas, dê orientações gerais e recomende consultar a advogada.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...incoming
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-20)
        .map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // 1) Tentar Anthropic oficial se ANTHROPIC_API_KEY existir
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (anthropicKey) {
      try {
        const sys = messages[0].content;
        const userMsgs = messages.slice(1).map((m: any) => ({ role: m.role, content: m.content }));
        const aRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2048,
            system: sys,
            messages: userMsgs,
          }),
        });
        if (aRes.ok) {
          const j = await aRes.json();
          const content = String(j?.content?.[0]?.text || "").trim();
          return new Response(
            JSON.stringify({ content, provider: "anthropic" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        console.warn("Anthropic falhou, caindo no fallback:", aRes.status, await aRes.text().catch(() => ""));
      } catch (e) {
        console.warn("Anthropic erro, fallback:", e);
      }
    }

    // 2) Fallback: gateway de IA gratuita do projeto
    const r = await chatCompletion({ messages, temperature: 0.7 });
    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: r.error || "Falha no provedor de IA", provider: r.provider || "none" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const content = String(r.data?.choices?.[0]?.message?.content || "").trim();
    return new Response(
      JSON.stringify({ content, provider: (r as any).provider || "lovable" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error)?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
