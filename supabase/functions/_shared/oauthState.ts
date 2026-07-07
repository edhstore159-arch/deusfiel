// HMAC-signed OAuth state helper.
// State layout: base64url(JSON(payload)) + "." + base64url(HMAC-SHA256(secret, base64url(JSON)))

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signState(secret: string, payload: Record<string, unknown>): Promise<string> {
  const json = JSON.stringify({ ...payload, iat: Date.now() });
  const body = b64urlEncode(new TextEncoder().encode(json));
  const sig = await hmac(secret, body);
  return `${body}.${b64urlEncode(sig)}`;
}

export async function verifyState(
  secret: string,
  state: string,
  maxAgeMs = 15 * 60 * 1000,
): Promise<Record<string, unknown> | null> {
  if (!state || typeof state !== "string" || !state.includes(".")) return null;
  const [body, sigB64] = state.split(".");
  if (!body || !sigB64) return null;
  const expected = await hmac(secret, body);
  const provided = b64urlDecode(sigB64);
  if (!timingSafeEqual(expected, provided)) return null;
  try {
    const json = new TextDecoder().decode(b64urlDecode(body));
    const payload = JSON.parse(json);
    const iat = Number(payload?.iat || 0);
    if (!iat || Date.now() - iat > maxAgeMs) return null;
    return payload;
  } catch {
    return null;
  }
}
