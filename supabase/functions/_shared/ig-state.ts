// Shared HMAC signing/verification for Instagram OAuth state.
const enc = new TextEncoder();

async function hmacKey(secret: string) {
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64urlEncode(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeToBytes(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signState(payload: Record<string, unknown>): Promise<string> {
  const secret = Deno.env.get("INSTAGRAM_STATE_SECRET");
  if (!secret) throw new Error("INSTAGRAM_STATE_SECRET not configured");
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return `${body}.${b64urlEncode(sig)}`;
}

export async function verifyState<T = Record<string, unknown>>(token: string, maxAgeMs = 15 * 60 * 1000): Promise<T | null> {
  const secret = Deno.env.get("INSTAGRAM_STATE_SECRET");
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlDecodeToBytes(sig), enc.encode(body));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecodeToBytes(body)));
    if (payload?.ts && typeof payload.ts === "number") {
      if (Date.now() - payload.ts > maxAgeMs) return null;
    }
    return payload as T;
  } catch {
    return null;
  }
}
