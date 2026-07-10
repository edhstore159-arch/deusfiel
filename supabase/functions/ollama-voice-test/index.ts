// Testa pipeline Ollama (texto) -> Voicemagic (áudio).
// Ollama não sintetiza voz; usamos Voicemagic para TTS.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireUser } from "../_shared/auth.ts";

async function callOllama(prompt: string) {
  const raw = Deno.env.get("OLLAMA_URL")?.trim().replace(/\/+$/, "").replace(/\/api\/(generate|chat|tags)$/, "");
  const model = Deno.env.get("OLLAMA_MODEL") || "qwen2.5:3b-instruct";
  if (!raw) return { ok: false, error: "OLLAMA_URL ausente" };
  const key = Deno.env.get("OLLAMA_API_KEY");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(`${raw}/api/generate`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    const txt = await r.text();
    if (!r.ok) return { ok: false, status: r.status, error: txt.slice(0, 300) };
    try {
      const j = JSON.parse(txt);
      return { ok: true, text: String(j?.response || "").trim() };
    } catch {
      return { ok: false, error: "resposta não-JSON do Ollama (URL provavelmente offline)" };
    }
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) };
  } finally { clearTimeout(t); }
}

async function callVoicemagic(text: string) {
  const key = Deno.env.get("WATZZAP_AUDIO_API_KEY");
  if (!key) return { ok: false, error: "WATZZAP_AUDIO_API_KEY ausente" };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch("https://voicemagic.dev/api/tts", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) return { ok: false, status: r.status, error: (await r.text()).slice(0, 300) };
    const buf = new Uint8Array(await r.arrayBuffer());
    const b64 = btoa(String.fromCharCode(...buf));
    return { ok: true, audioBase64: b64, bytes: buf.length };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e) };
  } finally { clearTimeout(t); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _auth_res = await requireUser(req);
  if (_auth_res instanceof Response) return _auth_res;
  let prompt = "Diga em uma frase curta: Olá, eu sou a secretária virtual.";
  try {
    if (req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      if (b?.prompt) prompt = String(b.prompt);
    }
  } catch { /* noop */ }

  const ollama = await callOllama(prompt);
  const text = ollama.ok ? ollama.text : "Ollama offline. Este é um teste de voz da secretária virtual.";
  const tts = await callVoicemagic(text);

  return new Response(JSON.stringify({
    pipeline: "ollama -> voicemagic",
    ollama,
    tts: tts.ok ? { ok: true, bytes: tts.bytes, audioBase64: tts.audioBase64.slice(0, 60) + "..." } : tts,
    spoken_text: text,
    audio_ok: tts.ok,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
