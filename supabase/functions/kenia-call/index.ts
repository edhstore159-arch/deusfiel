// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/auth.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _auth_res = await requireUser(req);
  if (_auth_res instanceof Response) return _auth_res;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      return new Response(JSON.stringify({ error: "Twilio não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const to: string = (body.to || "").toString().trim();
    const message: string =
      (body.message || "").toString().trim() ||
      "Olá, aqui é a Kenia Garcia, secretária jurídica da Dra. Kenia. Estou ligando para confirmar seu atendimento. Caso queira falar conosco, responda esta chamada ou nos chame no WhatsApp. Obrigada e tenha um excelente dia.";

    if (!/^\+\d{8,15}$/.test(to)) {
      return new Response(JSON.stringify({ error: "Número inválido (use formato E.164, ex.: +5564999881043)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find a voice-capable Twilio number
    const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=50`, {
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": TWILIO_API_KEY },
    });
    const numbersJson: any = await numbersRes.json();
    const voiceNumber = (numbersJson.incoming_phone_numbers || []).find(
      (n: any) => n.capabilities?.voice
    );
    if (!voiceNumber) {
      return new Response(JSON.stringify({
        error: "no_voice_number",
        message: "A conta Twilio não possui número com capacidade de Voz. Compre um número Voice no Console Twilio (Phone Numbers → Buy a Number, marque Voice) e tente novamente.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Camila-Neural" language="pt-BR">${escapeXml(message)}</Say><Pause length="1"/><Say voice="Polly.Camila-Neural" language="pt-BR">Até logo.</Say></Response>`;

    const callRes = await fetch(`${GATEWAY_URL}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: voiceNumber.phone_number, Twiml: twiml }),
    });
    const callJson: any = await callRes.json();
    if (!callRes.ok) {
      return new Response(JSON.stringify({ error: "twilio_error", details: callJson }), {
        status: callRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, sid: callJson.sid, status: callJson.status, from: voiceNumber.phone_number, to }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
