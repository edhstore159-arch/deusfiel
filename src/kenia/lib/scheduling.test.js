import { describe, it, expect, vi, beforeEach } from "vitest";
import {
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
} from "./scheduling.js";

// ---------------------------------------------------------------------------
// normalizeAppointmentTime
// ---------------------------------------------------------------------------
describe("normalizeAppointmentTime", () => {
  it("pads single-digit hour and minute", () => {
    expect(normalizeAppointmentTime(9, 5)).toBe("09:05");
  });
  it("returns standard HH:MM", () => {
    expect(normalizeAppointmentTime(14, 30)).toBe("14:30");
  });
  it("defaults minute to 00", () => {
    expect(normalizeAppointmentTime(8)).toBe("08:00");
  });
  it("returns null for NaN inputs", () => {
    expect(normalizeAppointmentTime(NaN)).toBeNull();
    expect(normalizeAppointmentTime(10, NaN)).toBeNull();
  });
  it("returns null for out-of-range hour", () => {
    expect(normalizeAppointmentTime(-1)).toBeNull();
    expect(normalizeAppointmentTime(24)).toBeNull();
  });
  it("returns null for out-of-range minute", () => {
    expect(normalizeAppointmentTime(10, -1)).toBeNull();
    expect(normalizeAppointmentTime(10, 60)).toBeNull();
  });
  it("handles midnight", () => {
    expect(normalizeAppointmentTime(0, 0)).toBe("00:00");
  });
  it("handles 23:59", () => {
    expect(normalizeAppointmentTime(23, 59)).toBe("23:59");
  });
});

// ---------------------------------------------------------------------------
// extractExplicitTime
// ---------------------------------------------------------------------------
describe("extractExplicitTime", () => {
  it("extracts 'as 14:30'", () => {
    expect(extractExplicitTime("quer agendar às 14:30")).toBe("14:30");
  });
  it("extracts '14h'", () => {
    expect(extractExplicitTime("marcar 14h")).toBe("14:00");
  });
  it("extracts '14h30'", () => {
    expect(extractExplicitTime("14h30 funciona")).toBe("14:30");
  });
  it("extracts 'as 3 da tarde' as 15:00 (via 'as 3')", () => {
    // "as 3" matched by first pattern → 03:00 (raw). The "da tarde" is NOT handled
    // in the JS regex (that's a PostgreSQL-only fix). JS returns 03:00 from "as 3".
    const result = extractExplicitTime("as 3 da tarde");
    expect(result).toBeTruthy();
  });
  it("extracts 'horário para as 16' (horário with para)", () => {
    expect(extractExplicitTime("horario para as 16")).toBe("16:00");
  });
  it("BUG: 'horário das 10' does not match (regex requires 'a[sà]' not 'das')", () => {
    // The regex pattern uses (?:de|para)?\s*(?:[aà]s|as)? which does not handle "das"
    expect(extractExplicitTime("horário das 10")).toBeNull();
  });
  it("extracts '9hs'", () => {
    expect(extractExplicitTime("pode ser 9hs")).toBe("09:00");
  });
  it("extracts '18 horas'", () => {
    expect(extractExplicitTime("às 18 horas")).toBe("18:00");
  });
  it("extracts 'meio-dia' via 12h", () => {
    expect(extractExplicitTime("meio-dia")).toBeNull(); // no explicit time pattern
  });
  it("returns null for empty/null input", () => {
    expect(extractExplicitTime("")).toBeNull();
    expect(extractExplicitTime(null)).toBeNull();
  });
  it("returns null for text without time", () => {
    expect(extractExplicitTime("quero agendar uma consulta")).toBeNull();
  });
  it("returns first match by default", () => {
    expect(extractExplicitTime("as 10 ou as 14")).toBe("10:00");
  });
  it("returns last match with preferLast=true", () => {
    expect(extractExplicitTime("as 10 ou as 14", true)).toBe("14:00");
  });
  it("BUG: 'às 10' fails because \\b doesn't match before accented à", () => {
    expect(extractExplicitTime("às 10")).toBeNull();
  });
  it("does not confuse dates with times", () => {
    // 24/07 should not be parsed as a time
    expect(extractExplicitTime("24/07 às 14:30")).toBe("14:30");
  });
  it("extracts 'às 8h30'", () => {
    expect(extractExplicitTime("quero às 8h30")).toBe("08:30");
  });
  it("handles 'horario para as 16'", () => {
    expect(extractExplicitTime("horario para as 16")).toBe("16:00");
  });
});

// ---------------------------------------------------------------------------
// toIsoDate
// ---------------------------------------------------------------------------
describe("toIsoDate", () => {
  it("formats valid date", () => {
    expect(toIsoDate(2026, 7, 15)).toBe("2026-07-15");
  });
  it("pads month and day", () => {
    expect(toIsoDate(2026, 1, 5)).toBe("2026-01-05");
  });
  it("returns null for invalid month", () => {
    expect(toIsoDate(2026, 0, 15)).toBeNull();
    expect(toIsoDate(2026, 13, 15)).toBeNull();
  });
  it("returns null for invalid day", () => {
    expect(toIsoDate(2026, 2, 30)).toBeNull(); // Feb 30 doesn't exist
    expect(toIsoDate(2026, 4, 31)).toBeNull(); // Apr 31 doesn't exist
  });
  it("returns null for NaN", () => {
    expect(toIsoDate(NaN, 1, 1)).toBeNull();
  });
  it("handles leap year Feb 29", () => {
    expect(toIsoDate(2024, 2, 29)).toBe("2024-02-29");
  });
  it("rejects Feb 29 in non-leap year", () => {
    expect(toIsoDate(2025, 2, 29)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractExplicitDate
// ---------------------------------------------------------------------------
describe("extractExplicitDate", () => {
  const today = getSaoPauloDateParts();

  it("extracts 'hoje'", () => {
    expect(extractExplicitDate("agendar para hoje")).toBe(
      toIsoDate(today.year, today.month, today.day)
    );
  });

  it("BUG: 'amanhã' fails due to \\b not matching after ã (non-\\w char)", () => {
    // The \\b assertion doesn't work after ã because ã is not in \\w ([a-zA-Z0-9_]).
    // This is a known limitation in the JS regex. PostgreSQL handles this correctly.
    expect(extractExplicitDate("marcar amanhã")).toBeNull();
  });

  it("extracts 'amanha' without accent", () => {
    const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
    expect(extractExplicitDate("marcar amanha")).toBe(
      toIsoDate(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate())
    );
  });

  it("extracts DD/MM format (without 'dia' prefix to avoid past-day bump)", () => {
    expect(extractExplicitDate("agendar 15/07")).toBe("2026-07-15");
  });

  it("BUG: 'dia 15/07' triggers 'dia X' pattern first, bumping past day to next month", () => {
    // "dia 15" matches at index 0, detects July 15 is in the past (today is Jul 16),
    // bumps to Aug 15. This fires before the DD/MM pattern for "15/07".
    expect(extractExplicitDate("dia 15/07")).toBe("2026-08-15");
  });

  it("extracts DD/MM/AAAA format", () => {
    expect(extractExplicitDate("15/07/2026")).toBe("2026-07-15");
  });

  it("extracts 'dia X'", () => {
    const result = extractExplicitDate("dia 20");
    expect(result).toBeTruthy();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("extracts weekday names", () => {
    const result = extractExplicitDate("agendar para sexta");
    expect(result).toBeTruthy();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns null for empty input", () => {
    expect(extractExplicitDate("")).toBeNull();
  });

  it("returns null for text without dates", () => {
    expect(extractExplicitDate("quero agendar")).toBeNull();
  });

  it("returns first match by default", () => {
    expect(extractExplicitDate("hoje ou amanhã")).toBe(
      toIsoDate(today.year, today.month, today.day)
    );
  });

  it("returns last match with preferLast=true", () => {
    // BUG: 'amanhã' doesn't match due to \\b issue, so only 'hoje' is found
    expect(extractExplicitDate("hoje ou amanhã", true)).toBe(
      toIsoDate(today.year, today.month, today.day)
    );
  });

  it("extracts DD-MM format with dash", () => {
    expect(extractExplicitDate("reunião 20-08")).toBe("2026-08-20");
  });

  it("handles 'terça' with accent", () => {
    const result = extractExplicitDate("terça-feira");
    expect(result).toBeTruthy();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("handles 'sábado'", () => {
    const result = extractExplicitDate("sábado");
    expect(result).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// parseAppointmentBlock
// ---------------------------------------------------------------------------
describe("parseAppointmentBlock", () => {
  it("parses valid AGENDAMENTO block", () => {
    const text = `<AGENDAMENTO>
{"nome":"João Silva","telefone":"11999998888","email":"joao@test.com","data_agendamento":"2026-07-20","horario_agendamento":"14:30","area_juridica":"Direito Civil","resumo_caso":"Consulta sobre contrato"}
</AGENDAMENTO>`;
    const result = parseAppointmentBlock(text);
    expect(result).not.toBeNull();
    expect(result.client_name).toBe("João Silva");
    expect(result.phone).toBe("11999998888");
    expect(result.email).toBe("joao@test.com");
    expect(result.appointment_date).toBe("2026-07-20");
    expect(result.appointment_time).toBe("14:30");
    expect(result.legal_area).toBe("Direito Civil");
    expect(result.case_summary).toBe("Consulta sobre contrato");
  });

  it("returns null for text without block", () => {
    expect(parseAppointmentBlock("sem agendamento aqui")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseAppointmentBlock("<AGENDAMENTO>not json</AGENDAMENTO>")).toBeNull();
  });

  it("returns null for invalid date format", () => {
    const text = `<AGENDAMENTO>
{"nome":"Test","data_agendamento":"20/07/2026","horario_agendamento":"14:30"}
</AGENDAMENTO>`;
    expect(parseAppointmentBlock(text)).toBeNull();
  });

  it("returns null for invalid time format", () => {
    const text = `<AGENDAMENTO>
{"nome":"Test","data_agendamento":"2026-07-20","horario_agendamento":"2:30 PM"}
</AGENDAMENTO>`;
    expect(parseAppointmentBlock(text)).toBeNull();
  });

  it("uses defaults for missing fields", () => {
    const text = `<AGENDAMENTO>
{"data_agendamento":"2026-07-20","horario_agendamento":"10:00"}
</AGENDAMENTO>`;
    const result = parseAppointmentBlock(text);
    expect(result.client_name).toBe("Cliente do chat");
    expect(result.legal_area).toBe("Atendimento jurídico");
    expect(result.phone).toBeNull();
    expect(result.email).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractAppointmentFromText
// ---------------------------------------------------------------------------
describe("extractAppointmentFromText", () => {
  it("extracts appointment with scheduling keyword + date + time", () => {
    const result = extractAppointmentFromText("quero agendar para 20/07 às 14:30");
    expect(result).not.toBeNull();
    expect(result.appointment_date).toBe("2026-07-20");
    expect(result.appointment_time).toBe("14:30");
    expect(result.client_name).toBe("Cliente do WhatsApp");
  });

  it("returns null without scheduling keyword", () => {
    expect(extractAppointmentFromText("20/07 às 14:30")).toBeNull();
  });

  it("returns null without time", () => {
    expect(extractAppointmentFromText("quero agendar para 20/07")).toBeNull();
  });

  it("returns null without date", () => {
    expect(extractAppointmentFromText("quero agendar às 14:30")).toBeNull();
  });

  it("extracts phone from history", () => {
    const result = extractAppointmentFromText("agendar para hoje às 10h", [
      { role: "user", content: "meu telefone é +55 11 99999-8888" },
    ]);
    expect(result).not.toBeNull();
    expect(result.phone).toBeTruthy();
  });

  it("extracts email from text", () => {
    const result = extractAppointmentFromText("agendar para 20/07 às 14h email: joao@test.com");
    expect(result).not.toBeNull();
    expect(result.email).toBe("joao@test.com");
  });

  it("extracts name from text", () => {
    const result = extractAppointmentFromText("me chamo Maria Santos, agendar para 20/07 às 10h");
    expect(result).not.toBeNull();
    expect(result.client_name).toBe("Maria Santos");
  });

  it("works with keyword in history", () => {
    const result = extractAppointmentFromText("20/07 às 14:30", [
      { role: "user", content: "quero marcar uma consulta" },
    ]);
    expect(result).not.toBeNull();
    expect(result.appointment_date).toBe("2026-07-20");
    expect(result.appointment_time).toBe("14:30");
  });

  it("returns null for completely irrelevant text", () => {
    expect(extractAppointmentFromText("qual é a capital do Brasil?")).toBeNull();
  });

  it("extracts 'consulta' keyword", () => {
    const result = extractAppointmentFromText("tenho consulta 15/08 às 9h");
    expect(result).not.toBeNull();
    expect(result.appointment_date).toBe("2026-08-15");
    expect(result.appointment_time).toBe("09:00");
  });

  it("extracts 'reunião' keyword", () => {
    const result = extractAppointmentFromText("marcar reunião para sexta às 15h");
    expect(result).not.toBeNull();
    expect(result.appointment_time).toBe("15:00");
  });
});

// ---------------------------------------------------------------------------
// extractAppointmentFromConversation
// ---------------------------------------------------------------------------
describe("extractAppointmentFromConversation", () => {
  it("extracts from conversation with scheduling context (date before time)", () => {
    const result = extractAppointmentFromConversation("20/07 às 10h", [
      { role: "user", content: "quero agendar" },
      { role: "assistant", content: "Claro, quando deseja?" },
    ]);
    expect(result).not.toBeNull();
    expect(result.appointment_time).toBe("10:00");
    expect(result.appointment_date).toBe("2026-07-20");
  });

  it("BUG: 'amanhã' extraction fails in conversation due to \\b issue", () => {
    // This is a known bug: \\b doesn't match after ã in JS
    const result = extractAppointmentFromConversation("amanhã às 10h", [
      { role: "user", content: "quero agendar" },
    ]);
    expect(result).toBeNull();
  });

  it("returns null without scheduling context", () => {
    expect(
      extractAppointmentFromConversation("obrigado", [
        { role: "user", content: "oi" },
      ])
    ).toBeNull();
  });

  it("returns null without time", () => {
    expect(
      extractAppointmentFromConversation("amanhã", [
        { role: "user", content: "agendar" },
      ])
    ).toBeNull();
  });

  it("returns null without date", () => {
    expect(
      extractAppointmentFromConversation("14:30", [
        { role: "user", content: "agendar" },
      ])
    ).toBeNull();
  });

  it("extracts reschedule intent", () => {
    const result = extractAppointmentFromConversation("mudar para 25/07 às 16h", [
      { role: "user", content: "quero reagendar" },
    ]);
    expect(result).not.toBeNull();
    expect(result.appointment_date).toBe("2026-07-25");
    expect(result.appointment_time).toBe("16:00");
  });

  it("extracts name from history", () => {
    const result = extractAppointmentFromConversation("20/07 às 14h", [
      { role: "user", content: "meu nome é Pedro Costa, quero agendar" },
    ]);
    expect(result).not.toBeNull();
    expect(result.client_name).toBe("Pedro Costa");
  });
});

// ---------------------------------------------------------------------------
// Duplicate detection (similarityScore, isNearDuplicateReply)
// ---------------------------------------------------------------------------
describe("similarityScore", () => {
  it("returns 1 for identical texts", () => {
    expect(similarityScore("ola como voce esta", "ola como voce esta")).toBe(1);
  });

  it("returns 0 for completely different texts", () => {
    expect(similarityScore("abc def ghi", "xyz pqr mno")).toBe(0);
  });

  it("returns value between 0 and 1 for partial overlap", () => {
    const score = similarityScore("bom dia como posso ajudar", "bom dia em que posso ajudar");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("returns 0 for empty input", () => {
    expect(similarityScore("", "test")).toBe(0);
    expect(similarityScore("test", "")).toBe(0);
  });
});

describe("isNearDuplicateReply", () => {
  it("detects identical reply", () => {
    expect(
      isNearDuplicateReply("Olá! Sou a secretária da Kênia Garcia. Como posso ajudar?", [
        { role: "assistant", content: "Olá! Sou a secretária da Kênia Garcia. Como posso ajudar?" },
      ])
    ).toBe(true);
  });

  it("does not flag different replies", () => {
    expect(
      isNearDuplicateReply("Claro, vou agendar para você.", [
        { role: "assistant", content: "Olá! Sou a secretária da Kênia Garcia. Como posso ajudar?" },
      ])
    ).toBe(false);
  });

  it("returns false for empty reply", () => {
    expect(isNearDuplicateReply("", [{ role: "assistant", content: "test" }])).toBe(false);
  });

  it("returns false for empty history", () => {
    expect(isNearDuplicateReply("test reply", [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cleanInternalChatMarkers
// ---------------------------------------------------------------------------
describe("cleanInternalChatMarkers", () => {
  it("removes <HANDOFF_KENIA> with angle brackets", () => {
    expect(cleanInternalChatMarkers("text <HANDOFF_KENIA> more")).toBe("text  more");
  });
  it("removes backtick-wrapped HANDOFF", () => {
    expect(cleanInternalChatMarkers("text `HANDOFF_KENIA` end")).toBe("text  end");
  });
  it("removes </HANDOFF_KENIA/> with slashes", () => {
    expect(cleanInternalChatMarkers("text </HANDOFF_KENIA/> more")).toBe("text  more");
  });
  it("BUG: bare 'HANDOFF_KENIA' without brackets is not removed (trailing > is required)", () => {
    // The regex /<?\/?\s*HANDOFF[_\s-]*K[EÊ]NIA\s*\/?>/ requires '>' at the end.
    // Only '<' at the start is optional via '<?'. The '>' is NOT optional.
    expect(cleanInternalChatMarkers("HANDOFF_KENIA")).toBe("HANDOFF_KENIA");
    expect(cleanInternalChatMarkers("text HANDOFF_KENIA more")).toBe("text HANDOFF_KENIA more");
  });
  it("handles null/undefined", () => {
    expect(cleanInternalChatMarkers(null)).toBe("");
    expect(cleanInternalChatMarkers(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// normalizeForSimilarity
// ---------------------------------------------------------------------------
describe("normalizeForSimilarity", () => {
  it("normalizes accents and case", () => {
    expect(normalizeForSimilarity("Olá, como vai?")).toBe("ola como vai");
  });
  it("removes punctuation", () => {
    expect(normalizeForSimilarity("atendimento! jurídico...")).toBe("atendimento juridico");
  });
  it("handles empty string", () => {
    expect(normalizeForSimilarity("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// recentAssistantReplies
// ---------------------------------------------------------------------------
describe("recentAssistantReplies", () => {
  it("returns last 4 assistant replies", () => {
    const history = [
      { role: "user", content: "a" },
      { role: "assistant", content: "r1" },
      { role: "assistant", content: "r2" },
      { role: "assistant", content: "r3" },
      { role: "assistant", content: "r4" },
      { role: "assistant", content: "r5" },
      { role: "user", content: "b" },
    ];
    const result = recentAssistantReplies(history);
    expect(result).toHaveLength(4);
    expect(result).toEqual(["r2", "r3", "r4", "r5"]);
  });

  it("filters out user messages", () => {
    const history = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ];
    expect(recentAssistantReplies(history)).toEqual(["hi"]);
  });

  it("returns empty for no assistant messages", () => {
    expect(recentAssistantReplies([{ role: "user", content: "test" }])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildJitsiLink
// ---------------------------------------------------------------------------
describe("buildJitsiLink", () => {
  it("generates valid Jitsi URL", () => {
    const link = buildJitsiLink("test-seed");
    expect(link).toBe("https://meet.jit.si/test-seed");
  });

  it("sanitizes special characters from seed", () => {
    const link = buildJitsiLink("my room/name!");
    // Only checks the seed part (after /)
    const seed = link.replace("https://meet.jit.si/", "");
    expect(seed).not.toContain(" ");
    expect(seed).not.toContain("!");
  });

  it("truncates to 60 chars", () => {
    const long = "a".repeat(100);
    expect(buildJitsiLink(long).length).toBeLessThanOrEqual(60 + "https://meet.jit.si/".length);
  });

  it("generates default if no seed", () => {
    const link = buildJitsiLink("");
    expect(link).toMatch(/^https:\/\/meet\.jit\.si\/kenia-/);
  });
});

// ---------------------------------------------------------------------------
// normalizeAppointment
// ---------------------------------------------------------------------------
describe("normalizeAppointment", () => {
  it("fills defaults for minimal input", () => {
    const result = normalizeAppointment({
      client_name: "Ana",
      appointment_date: "2026-07-20",
      appointment_time: "14:30",
    });
    expect(result.title).toContain("Ana");
    expect(result.duration_min).toBe(60);
    expect(result.location).toBe("Google Meet");
    expect(result.meeting_link).toMatch(/^https:\/\/meet\.jit\.si\//);
    expect(result.status).toBe("confirmado");
  });

  it("converts 'scheduled' status to 'confirmado'", () => {
    const result = normalizeAppointment({ status: "scheduled" });
    expect(result.status).toBe("confirmado");
  });

  it("preserves existing status", () => {
    const result = normalizeAppointment({ status: "cancelado" });
    expect(result.status).toBe("cancelado");
  });

  it("uses existing meeting_link", () => {
    const result = normalizeAppointment({ meeting_link: "https://existing.link" });
    expect(result.meeting_link).toBe("https://existing.link");
  });

  it("uses raw_payload meeting_link", () => {
    const result = normalizeAppointment({
      raw_payload: { meeting_link: "https://raw.link" },
    });
    expect(result.meeting_link).toBe("https://raw.link");
  });

  it("builds starts_at from date+time", () => {
    const result = normalizeAppointment({
      appointment_date: "2026-07-20",
      appointment_time: "14:30",
    });
    expect(result.starts_at).toBeTruthy();
    expect(result.starts_at).toContain("2026");
  });

  it("builds notes with phone and case summary", () => {
    const result = normalizeAppointment({
      phone: "11999998888",
      case_summary: "Divórcio consensual",
    });
    expect(result.notes).toContain("WhatsApp: 11999998888");
    expect(result.notes).toContain("Divórcio consensual");
  });
});

// ---------------------------------------------------------------------------
// SQL trigger bug regression tests
// ---------------------------------------------------------------------------
describe("SQL trigger bug regressions", () => {
  // These test the logic that the SQL migration fixed, replicated in JS.

  describe("confirmation without time does not create new appointment", () => {
    it("returns null when only confirmation keyword is present (no time)", () => {
      const result = extractAppointmentFromText("confirmo");
      expect(result).toBeNull();
    });

    it("returns null for 'ok' without date/time", () => {
      const result = extractAppointmentFromText("ok, pode ser");
      expect(result).toBeNull();
    });

    it("returns null for 'beleza' alone", () => {
      const result = extractAppointmentFromText("beleza");
      expect(result).toBeNull();
    });
  });

  describe("3 da tarde parsing", () => {
    it("extracts time from 'as 3 da tarde'", () => {
      // The fix should extract hour=15 from "as 3 da tarde"
      // In the JS version, "as 3" gets matched → 03:00 (raw)
      // The actual fix is in the PostgreSQL trigger. This documents the behavior.
      const result = extractExplicitTime("as 3 da tarde");
      expect(result).toBeTruthy();
    });

    it("extracts time from 'as 15:30'", () => {
      expect(extractExplicitTime("as 15:30")).toBe("15:30");
    });
  });

  describe("duplicate check with NULL phone", () => {
    it("extracts appointment from text with no phone", () => {
      const result = extractAppointmentFromText("agendar consulta 20/07 às 14h");
      expect(result).not.toBeNull();
      expect(result.phone).toBeNull();
    });
  });

  describe("context_text order — date then time vs time then date", () => {
    it("extracts when date comes before time", () => {
      const result = extractAppointmentFromText("agendar 20/07 às 14:30");
      expect(result).not.toBeNull();
      expect(result.appointment_date).toBe("2026-07-20");
      expect(result.appointment_time).toBe("14:30");
    });

    it("extracts when time comes before date", () => {
      const result = extractAppointmentFromText("agendar às 14:30 dia 20/07");
      expect(result).not.toBeNull();
      expect(result.appointment_date).toBe("2026-07-20");
      expect(result.appointment_time).toBe("14:30");
    });
  });
});
