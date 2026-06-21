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