// HMAC-SHA1 validation of Twilio webhook signatures.
// See https://www.twilio.com/docs/usage/webhooks/webhooks-security

async function hmacSha1Base64(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * Validate an incoming Twilio POST. Pass the FULL public URL Twilio called
 * (including query string), the parsed form fields, and the header value.
 */
export async function verifyTwilioSignature(
  authToken: string,
  fullUrl: string,
  form: FormData,
  headerSignature: string | null,
): Promise<boolean> {
  if (!authToken || !headerSignature) return false;
  const params: Array<[string, string]> = [];
  for (const [k, v] of form.entries()) params.push([k, typeof v === "string" ? v : ""]);
  params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const data = fullUrl + params.map(([k, v]) => k + v).join("");
  const expected = await hmacSha1Base64(authToken, data);
  // Constant-time compare
  if (expected.length !== headerSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ headerSignature.charCodeAt(i);
  }
  return mismatch === 0;
}
