// HMAC-signed OAuth state helpers.
const SECRET = Deno.env.get("INSTAGRAM_STATE_SECRET") || "";
const encoder = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmac(payload: string): Promise<Uint8Array> {
  if (!SECRET) throw new Error("INSTAGRAM_STATE_SECRET not configured");
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return new Uint8Array(sig);
}

export async function signState(obj: Record<string, unknown>): Promise<string> {
  const payload = b64urlEncode(encoder.encode(JSON.stringify(obj)));
  const sig = b64urlEncode(await hmac(payload));
  return `${payload}.${sig}`;
}

export async function verifyState<T = any>(raw: string, maxAgeMs = 15 * 60 * 1000): Promise<T | null> {
  if (!raw || !raw.includes(".")) return null;
  const [payload, sig] = raw.split(".", 2);
  const expected = b64urlEncode(await hmac(payload));
  // constant-time-ish compare
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const obj = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    if (typeof obj?.ts === "number" && Date.now() - obj.ts > maxAgeMs) return null;
    return obj as T;
  } catch {
    return null;
  }
}
