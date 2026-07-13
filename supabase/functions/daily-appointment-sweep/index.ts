// Diariamente varre conversas recentes e cria agendamentos no dashboard
// caso o cliente tenha mencionado data/hora e ainda não exista appointment.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractAppointmentFromText(text: string) {
  const t = String(text || "");
  if (!/\b(agendar|agendamento|marcar|marca[cç][aã]o|consulta|reuni[aã]o|atendimento|hor[aá]rio)\b/i.test(t)) return null;

  const timeMatch = t.match(/\b(?:[aà]s\s*)?(\d{1,2})(?:[:h](\d{2}))?\s*(h|hs|horas)?\b/i);
  const todayMatch = /\bhoje\b/i.test(t);
  const tomorrowMatch = /\bamanh[aã]\b/i.test(t);
  const dateMatch = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (!timeMatch || (!todayMatch && !tomorrowMatch && !dateMatch)) return null;

  const spParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y0 = Number(spParts.find(p => p.type === "year")!.value);
  const m0 = Number(spParts.find(p => p.type === "month")!.value);
  const d0 = Number(spParts.find(p => p.type === "day")!.value);

  let y = y0, m = m0, d = d0;
  if (tomorrowMatch) {
    const dt = new Date(Date.UTC(y0, m0 - 1, d0 + 1));
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  } else if (dateMatch) {
    d = Number(dateMatch[1]); m = Number(dateMatch[2]);
    if (dateMatch[3]) { y = Number(dateMatch[3]); if (y < 100) y += 2000; }
  }
  const hh = Math.max(0, Math.min(23, Number(timeMatch[1])));
  const mm = Math.max(0, Math.min(59, Number(timeMatch[2] || "0")));
  if (!Number.isFinite(hh)) return null;

  const date = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const time = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

  const phone = (t.match(/\+?\d{2}\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/) || [])[0] || null;
  const email = (t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0] || null;
  const nameMatch = t.match(/(?:meu nome [eé]|me chamo|sou [oa]?)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+){0,3})/);
  const client_name = nameMatch?.[1]?.trim() || "Cliente do atendimento";

  return {
    client_name, phone, email,
    legal_area: "Atendimento jurídico",
    case_summary: t.slice(0, 240),
    appointment_date: date,
    appointment_time: time,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1) Buscar conversas das últimas 24h
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, user_id, session_id, message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    // 2) Admin para receber agendamentos sem dono
    const { data: adminRole } = await supabase
      .from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
    const adminId = adminRole?.user_id || null;

    let created = 0, skipped = 0, scanned = 0;
    const results: any[] = [];

    for (const conv of conversations || []) {
      scanned++;
      const appt = extractAppointmentFromText(conv.message || "");
      if (!appt) { skipped++; continue; }

      // Já existe agendamento mesma data/hora/telefone?
      const { data: existing } = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_date", appt.appointment_date)
        .eq("appointment_time", appt.appointment_time)
        .or(`session_id.eq.${conv.session_id || conv.id},phone.eq.${appt.phone || "__none__"}`)
        .limit(1);

      if (existing && existing.length > 0) { skipped++; continue; }

      const meetUrl = `https://meet.jit.si/kenia-${(appt.client_name || "cliente").replace(/\s+/g, "-").toLowerCase()}-${Date.now().toString(36)}`;

      const { data: inserted, error } = await supabase
        .from("appointments")
        .insert({
          user_id: conv.user_id || adminId,
          session_id: conv.session_id || conv.id,
          client_name: appt.client_name,
          phone: appt.phone,
          email: appt.email,
          legal_area: appt.legal_area,
          case_summary: appt.case_summary,
          appointment_date: appt.appointment_date,
          appointment_time: appt.appointment_time,
          source: "daily_sweep",
          status: "scheduled",
          raw_payload: { meeting_link: meetUrl, meet_url: meetUrl, origin_conversation: conv.id },
        })
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("[sweep] insert error:", error.message);
        skipped++;
      } else {
        created++;
        results.push({ id: inserted?.id, date: appt.appointment_date, time: appt.appointment_time, name: appt.client_name });
      }
    }

    console.log(`[sweep] scanned=${scanned} created=${created} skipped=${skipped}`);
    return new Response(
      JSON.stringify({ ok: true, scanned, created, skipped, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[sweep] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
