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
