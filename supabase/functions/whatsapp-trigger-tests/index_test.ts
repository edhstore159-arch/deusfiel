// Integration tests for the create_appointment_from_whatsapp trigger.
// Uses the service role key to insert whatsapp_messages rows and asserts
// that the trigger materializes appointments visible to the dashboard.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function pickAdminUserId(): Promise<string> {
  const { data, error } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("no admin user_role — seed one before running tests");
  return data.user_id as string;
}

async function insertMessage(text: string, contactId: string, userId: string) {
  const { data, error } = await admin
    .from("whatsapp_messages")
    .insert({
      user_id: userId,
      contact_id: contactId,
      contact_name: "Cliente Teste",
      contact_phone: "+5511999999999",
      text,
      from_me: false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function findAppointment(contactId: string) {
  const { data, error } = await admin
    .from("appointments")
    .select("*")
    .eq("session_id", contactId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function cleanup(contactId: string, messageId?: string) {
  await admin.from("appointments").delete().eq("session_id", contactId);
  if (messageId) await admin.from("whatsapp_messages").delete().eq("id", messageId);
}

Deno.test("cria appointment quando mensagem confirma agendamento com data e hora", async () => {
  const userId = await pickAdminUserId();
  const contactId = `test-${crypto.randomUUID()}`;
  const msgId = await insertMessage(
    "Agendamento confirmado para 15/08/2026 às 14:30",
    contactId,
    userId,
  );
  try {
    const appt = await findAppointment(contactId);
    assert(appt, "esperava um appointment criado pelo trigger");
    assertEquals(appt.appointment_date, "2026-08-15");
    assertEquals(String(appt.appointment_time).slice(0, 5), "14:30");
    assertEquals(appt.status, "scheduled");
    assertEquals(appt.source, "whatsapp_trigger");
    assertEquals(appt.user_id, userId, "appointment deve aparecer no dashboard do admin");
  } finally {
    await cleanup(contactId, msgId);
  }
});

Deno.test("parse de 'às 16h' sem minutos", async () => {
  const userId = await pickAdminUserId();
  const contactId = `test-${crypto.randomUUID()}`;
  const msgId = await insertMessage(
    "Reunião marcada para 10/09/2026 às 16h",
    contactId,
    userId,
  );
  try {
    const appt = await findAppointment(contactId);
    assert(appt, "esperava appointment com hora sem minutos");
    assertEquals(appt.appointment_date, "2026-09-10");
    assertEquals(String(appt.appointment_time).slice(0, 5), "16:00");
  } finally {
    await cleanup(contactId, msgId);
  }
});

Deno.test("ignora mensagens sem intenção de agendamento", async () => {
  const userId = await pickAdminUserId();
  const contactId = `test-${crypto.randomUUID()}`;
  const msgId = await insertMessage(
    "Obrigado pelo atendimento, tenha um bom dia!",
    contactId,
    userId,
  );
  try {
    const appt = await findAppointment(contactId);
    assertEquals(appt, null, "não deveria criar appointment sem palavra-chave");
  } finally {
    await cleanup(contactId, msgId);
  }
});

Deno.test("ignora mensagens de agendamento sem data/hora", async () => {
  const userId = await pickAdminUserId();
  const contactId = `test-${crypto.randomUUID()}`;
  const msgId = await insertMessage(
    "Podemos marcar uma reunião em breve?",
    contactId,
    userId,
  );
  try {
    const appt = await findAppointment(contactId);
    assertEquals(appt, null, "sem data/hora não deve gerar appointment");
  } finally {
    await cleanup(contactId, msgId);
  }
});

Deno.test("não duplica appointment para mesma data/hora e contato", async () => {
  const userId = await pickAdminUserId();
  const contactId = `test-${crypto.randomUUID()}`;
  const m1 = await insertMessage("Consulta agendada 20/10/2026 às 09:15", contactId, userId);
  const m2 = await insertMessage("Confirmando: 20/10/2026 às 09:15", contactId, userId);
  try {
    const { data, error } = await admin
      .from("appointments")
      .select("id")
      .eq("session_id", contactId);
    if (error) throw error;
    assertEquals(data?.length, 1, "trigger deve deduplicar por contato + data + hora");
  } finally {
    await cleanup(contactId);
    await admin.from("whatsapp_messages").delete().in("id", [m1, m2]);
  }
});
