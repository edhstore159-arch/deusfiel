const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
import { requireUser } from "../_shared/auth.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

function normalize(num: string): string {
  const n = String(num || "").trim();
  if (!n) return "";
  if (n.startsWith("whatsapp:")) return n;
  return `whatsapp:${n.startsWith("+") ? n : "+" + n.replace(/^\+?/, "")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _auth_res = await requireUser(req);
  if (_auth_res instanceof Response) return _auth_res;

  try {
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Twilio não está conectado. Conecte o connector Twilio." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const to = normalize(body.to);
    const from = normalize(body.from);
    const message = String(body.message || "").trim();

    if (!to || !from || !message) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: to, from, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (message.length > 1500) {
      return new Response(
        JSON.stringify({ error: "Mensagem muito longa (máx 1500 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prefix = "📋 *Tarefa da Dra. Kenia*\n\n";
    const fullMessage = message.startsWith(prefix) ? message : prefix + message;

    const r = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Body: fullMessage }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[send-secretary-task] twilio error", r.status, data);
      return new Response(
        JSON.stringify({ error: `Twilio ${r.status}`, detail: data }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, sid: data.sid, status: data.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[send-secretary-task]", e);
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
