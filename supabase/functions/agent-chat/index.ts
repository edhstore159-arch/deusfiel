// Chat endpoint for user-trained AI agents.
import { createClient } from "npm:@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null } as any };
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agent_id, messages } = await req.json();
    if (!agent_id || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "agent_id e messages são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: agent, error } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agent_id)
      .eq("user_id", user.id)
      .single();
    if (error || !agent) {
      return new Response(JSON.stringify({ error: "Agente não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys = [
      agent.role ? `Papel: ${agent.role}` : "",
      agent.system_prompt || "",
      agent.knowledge
        ? `\n\n[BASE DE CONHECIMENTO — use estritamente para responder]\n${agent.knowledge}`
        : "",
    ].filter(Boolean).join("\n");

    const r = await chatCompletion({
      model: agent.model,
      temperature: Number(agent.temperature) || 0.7,
      messages: [{ role: "system", content: sys }, ...messages],
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "Falha no provider", detail: r.error }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const text = r.data?.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ text, provider: r.provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
