export function extractWhatsAppDigits(raw) {
  if (!raw) return "";
  const source = typeof raw === "object"
    ? raw.phone || raw.number || raw.connected_number || raw.display_phone_number || raw.jid || raw.id || raw.user || raw.me?.jid || raw.me?.id || ""
    : raw;
  let value = String(source).trim().replace(/^whatsapp:/i, "");

  // Baileys/JID values come as 5562999999999:12@s.whatsapp.net.
  // The part after ":" is the device/session id, not part of the real phone.
  value = value.split("@")[0].split(":")[0];

  let digits = value.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }
  return digits;
}

export function formatWhatsAppPhone(raw, fallback = "—") {
  const digits = extractWhatsAppDigits(raw);
  if (!digits) return raw ? String(raw) : fallback;

  if (digits.startsWith("55") && digits.length === 13) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.startsWith("55") && digits.length === 12) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return `+${digits}`;
}

export function pickWhatsAppNumber(...sources) {
  const fields = [
    "connected_number", "display_phone_number", "phone_number", "phone", "number",
    "sender", "sender_phone", "from", "twilio_from_number", "jid", "id", "user",
  ];

  const visit = (value, depth = 0) => {
    if (!value || depth > 4) return "";
    if (typeof value === "string" || typeof value === "number") {
      const digits = extractWhatsAppDigits(value);
      return digits.length >= 10 && digits.length <= 15 ? digits : "";
    }
    if (typeof value !== "object") return "";

    for (const field of fields) {
      const digits = visit(value[field], depth + 1);
      if (digits) return digits;
    }
    for (const nested of [value.me, value.data, value.instance, value.account, value.profile, value.status]) {
      const digits = visit(nested, depth + 1);
      if (digits) return digits;
    }
    return "";
  };

  for (const source of sources) {
    const digits = visit(source);
    if (digits) return digits;
  }
  return "";
}