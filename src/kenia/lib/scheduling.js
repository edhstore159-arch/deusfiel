// scheduling.js — Pure functions extracted from supabase/functions/chat-ai/index.ts
// for unit testing. No Deno/Supabase dependencies.

function normalizeAppointmentTime(hour, minute = 0) {
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function extractExplicitTime(text, preferLast = false) {
  const value = String(text || "");
  const patterns = [
    /\b(?:[aà]s|as)\s*(\d{1,2})(?:[:h](\d{1,2}))?\s*(?:h|hs|horas)?\b(?!\s*[\/\-])/gi,
    /\bhor[aá]rio\s*(?:de|para)?\s*(?:[aà]s|as)?\s*(\d{1,2})(?:[:h](\d{1,2}))?\s*(?:h|hs|horas)?\b(?!\s*[\/\-])/gi,
    /(?<![\/\-])\b(\d{1,2})(?:[:h](\d{1,2}))\s*(?:h|hs|horas)?\b(?!\s*[\/\-])/gi,
    /(?<![\/\-])\b(\d{1,2})\s*(?:h|hs|horas)\b(?!\s*[\/\-])/gi,
  ];
  const matches = [];
  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      const hour = Number(match[1]);
      const minute = Number(match[2] || "0");
      const normalized = normalizeAppointmentTime(hour, minute);
      if (normalized) matches.push({ index: match.index ?? 0, time: normalized });
    }
  }
  if (!matches.length) return null;
  matches.sort((a, b) => a.index - b.index);
  return preferLast ? matches[matches.length - 1].time : matches[0].time;
}

function getSaoPauloDateParts() {
  const spParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return {
    year: Number(spParts.find((p) => p.type === "year").value),
    month: Number(spParts.find((p) => p.type === "month").value),
    day: Number(spParts.find((p) => p.type === "day").value),
  };
}

function toIsoDate(year, month, day) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() + 1 !== month || dt.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractExplicitDate(text, preferLast = false) {
  const value = String(text || "");
  const today = getSaoPauloDateParts();
  const candidates = [];

  for (const match of value.matchAll(/\bhoje\b/gi)) {
    const date = toIsoDate(today.year, today.month, today.day);
    if (date) candidates.push({ index: match.index ?? 0, date });
  }
  for (const match of value.matchAll(/\bamanh[aã]\b/gi)) {
    const dt = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
    const date = toIsoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    if (date) candidates.push({ index: match.index ?? 0, date });
  }
  for (const match of value.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/g)) {
    let year = match[3] ? Number(match[3]) : today.year;
    if (year < 100) year += 2000;
    const date = toIsoDate(year, Number(match[2]), Number(match[1]));
    if (date) candidates.push({ index: match.index ?? 0, date });
  }
  for (const match of value.matchAll(/\bdia\s+(\d{1,2})\b/gi)) {
    let year = today.year;
    let month = today.month;
    const day = Number(match[1]);
    let date = toIsoDate(year, month, day);
    if (date && date < toIsoDate(today.year, today.month, today.day)) {
      const dt = new Date(Date.UTC(year, month, day));
      year = dt.getUTCFullYear();
      month = dt.getUTCMonth() + 1;
      date = toIsoDate(year, month, dt.getUTCDate());
    }
    if (date) candidates.push({ index: match.index ?? 0, date });
  }
  const weekdayMap = {
    domingo: 0,
    segunda: 1,
    terca: 2,
    terça: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6,
    sábado: 6,
  };
  for (const match of value.matchAll(/\b(domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado)\b/gi)) {
    const normalizedWeekday = match[1].toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    const target = weekdayMap[normalizedWeekday];
    if (target === undefined) continue;
    const current = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
    let daysAhead = (target - current + 7) % 7;
    if (daysAhead === 0) daysAhead = 7;
    const dt = new Date(Date.UTC(today.year, today.month - 1, today.day + daysAhead));
    const date = toIsoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    if (date) candidates.push({ index: match.index ?? 0, date });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.index - b.index);
  return preferLast ? candidates[candidates.length - 1].date : candidates[0].date;
}

function parseAppointmentBlock(text) {
  const match = String(text || "").match(/<AGENDAMENTO>([\s\S]*?)<\/AGENDAMENTO>/);
  if (!match) return null;
  try {
    const payload = JSON.parse(match[1].trim());
    const date = String(payload.data_agendamento || "").trim();
    const time = String(payload.horario_agendamento || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
    return {
      client_name: String(payload.nome || "Cliente do chat").trim() || "Cliente do chat",
      phone: String(payload.telefone || "").trim() || null,
      email: String(payload.email || "").trim() || null,
      city: String(payload.cidade || "").trim() || null,
      legal_area: String(payload.area_juridica || "Atendimento jurídico").trim() || "Atendimento jurídico",
      case_summary: String(payload.resumo_caso || "").trim() || null,
      appointment_date: date,
      appointment_time: time,
      raw_payload: payload,
    };
  } catch {
    return null;
  }
}

function extractAppointmentFromText(text, history = []) {
  const t = String(text || "");
  const KEYWORD_RE = /\b(agendar|agendamento|marcar|marca[cç][aã]o|marcad[ao]|consulta|reuni[aã]o|atendimento|hor[aá]rio|confirmad[ao]|agendad[ao]|remarcar|reagendar)\b/i;
  const recentHistoryText = history.slice(-8).map((h) => String(h.content || "")).join("\n");
  const intentHere = KEYWORD_RE.test(t);
  const intentInHistory = KEYWORD_RE.test(recentHistoryText);
  if (!intentHere && !intentInHistory) return null;

  const time = extractExplicitTime(t);
  const date = extractExplicitDate(t);

  if (!time || !date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;

  const all = [...history.map((h) => h.content), t].join("\n");
  const phone = (all.match(/\+?\d{2}\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/) || [])[0] || null;
  const email = (all.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0] || null;
  const nameMatch = all.match(/(?:meu nome [eé]|me chamo|sou [oa]?)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+){0,3})/);
  const client_name = nameMatch?.[1]?.trim() || "Cliente do WhatsApp";

  return {
    client_name,
    phone,
    email,
    city: null,
    legal_area: "Atendimento jurídico",
    case_summary: t.slice(0, 240),
    appointment_date: date,
    appointment_time: time,
    raw_payload: { source: "text_fallback", original: t },
  };
}

function extractAppointmentFromConversation(text, history = []) {
  const userMessages = [
    ...history.filter((h) => h.role === "user").map((h) => String(h.content || "")),
    String(text || ""),
  ].filter(Boolean).slice(-8);
  const rescheduleRe = /(reagend|remarc|adiar|alterar|mudar|trocar|nova\s+data|novo\s+hor[aá]rio)/i;
  const keywordRe = /\b(agendar|agendamento|marcar|marca[cç][aã]o|consulta|reuni[aã]o|atendimento|hor[aá]rio|confirmad[ao]|agendad[ao]|remarcar|reagendar)\b/i;
  const lastIntentIndex = Math.max(
    userMessages.map((message, index) => (rescheduleRe.test(message) || keywordRe.test(message) ? index : -1)).reduce((a, b) => Math.max(a, b), -1),
    0,
  );
  const segment = userMessages.slice(lastIntentIndex).join("\n");
  if (!rescheduleRe.test(segment) && !keywordRe.test(segment)) return null;

  const date = extractExplicitDate(String(text || ""), true) || extractExplicitDate(segment, true);
  const time = extractExplicitTime(String(text || ""), true) || extractExplicitTime(segment, true);
  if (!date || !time) return null;

  const all = [...history.map((h) => h.content), text].join("\n");
  const phone = (all.match(/\+?\d{2}\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/) || [])[0] || null;
  const email = (all.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0] || null;
  const nameMatch = all.match(/(?:meu nome [eé]|me chamo|sou [oa]?)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+){0,3})/);
  return {
    client_name: nameMatch?.[1]?.trim() || "Cliente do WhatsApp",
    phone,
    email,
    city: null,
    legal_area: "Atendimento jurídico",
    case_summary: String(text || segment).slice(0, 240),
    appointment_date: date,
    appointment_time: time,
    raw_payload: { source: "conversation_fallback", original: text, context_window: segment },
  };
}

function cleanInternalChatMarkers(text) {
  return String(text || "")
    .replace(/<?\/?\s*HANDOFF[_\s-]*K[EÊ]NIA\s*\/?>/giu, "")
    .replace(/`{1,3}\s*HANDOFF[_\s-]*K[EÊ]NIA\s*`{1,3}/giu, "")
    .trim();
}

function normalizeForSimilarity(text) {
  return cleanInternalChatMarkers(text)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarityScore(a, b) {
  const left = new Set(normalizeForSimilarity(a).split(" ").filter((word) => word.length > 2));
  const right = new Set(normalizeForSimilarity(b).split(" ").filter((word) => word.length > 2));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  left.forEach((word) => {
    if (right.has(word)) overlap += 1;
  });
  return overlap / Math.max(left.size, right.size);
}

function recentAssistantReplies(history = []) {
  return (Array.isArray(history) ? history : [])
    .filter((m) => m.role === "assistant" && String(m.content || "").trim())
    .map((m) => cleanInternalChatMarkers(m.content))
    .slice(-4);
}

function isNearDuplicateReply(reply, history = []) {
  const normalizedReply = normalizeForSimilarity(reply);
  if (!normalizedReply) return false;
  return recentAssistantReplies(history).some((previous) => {
    const normalizedPrevious = normalizeForSimilarity(previous);
    const score = similarityScore(normalizedReply, normalizedPrevious);
    return normalizedReply === normalizedPrevious || score >= 0.86 || (normalizedReply.length < 240 && score >= 0.72);
  });
}

function buildJitsiLink(seed) {
  const safe = String(seed || `kenia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .slice(0, 60);
  return `https://meet.jit.si/${safe}`;
}

function normalizeAppointment(item) {
  const nowIso = () => new Date().toISOString();
  const startsAt = item.starts_at || (() => {
    if (!item.appointment_date || !item.appointment_time) return nowIso();
    let timeStr = String(item.appointment_time);
    if (item.appointment_time && typeof item.appointment_time === "object") {
      const h = item.appointment_time.hours ?? item.appointment_time.H ?? 0;
      const m = item.appointment_time.minutes ?? item.appointment_time.M ?? 0;
      timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    } else {
      timeStr = timeStr.slice(0, 5);
    }
    const dt = new Date(`${item.appointment_date}T${timeStr}:00`);
    return Number.isFinite(dt.getTime()) ? dt.toISOString() : nowIso();
  })();
  const raw = item.raw_payload || {};
  const meetingLink =
    item.meeting_link ||
    item.meet_url ||
    raw.meeting_link ||
    raw.meet_url ||
    buildJitsiLink(item.id || `${item.client_name || "consulta"}-${startsAt}`);
  return {
    ...item,
    title: item.title || raw.title || `Consulta — ${item.legal_area || "Atendimento jurídico"} · ${item.client_name || "Cliente"}`,
    starts_at: startsAt,
    duration_min: item.duration_min || raw.duration_min || 60,
    location: item.location || raw.location || "Google Meet",
    meeting_link: meetingLink,
    meet_url: meetingLink,
    notes: item.notes || raw.notes || [item.phone ? `WhatsApp: ${item.phone}` : "", item.case_summary].filter(Boolean).join(" · "),
    status: item.status === "scheduled" ? "confirmado" : item.status || "confirmado",
  };
}

export {
  normalizeAppointmentTime,
  extractExplicitTime,
  extractExplicitDate,
  toIsoDate,
  getSaoPauloDateParts,
  parseAppointmentBlock,
  extractAppointmentFromText,
  extractAppointmentFromConversation,
  cleanInternalChatMarkers,
  normalizeForSimilarity,
  similarityScore,
  recentAssistantReplies,
  isNearDuplicateReply,
  buildJitsiLink,
  normalizeAppointment,
};
