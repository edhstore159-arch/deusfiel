import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

function cleanMime(mime: string): string {
  return String(mime || "audio/webm").split(";")[0].trim().toLowerCase();
}

function pickExtension(mime: string): string {
  const mt = cleanMime(mime);
  if (mt.includes("wav")) return "wav";
  if (mt.includes("mp3") || mt.includes("mpeg")) return "mp3";
  if (mt.includes("ogg") || mt.includes("opus")) return "ogg";
  if (mt.includes("mp4") || mt.includes("m4a") || mt.includes("aac")) return "m4a";
  return "webm";
}

function mimeToGeminiMime(mime: string): string {
  const mt = cleanMime(mime);
  if (mt.includes("ogg") || mt.includes("opus")) return "audio/ogg";
  if (mt.includes("mp3") || mt.includes("mpeg")) return "audio/mp3";
  if (mt.includes("wav")) return "audio/wav";
  if (mt.includes("mp4")) return "audio/mp4";
  if (mt.includes("m4a") || mt.includes("aac")) return "audio/aac";
  return "audio/webm";
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function transcribeWithElevenLabs(bytes: Uint8Array, mime: string): Promise<string> {
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY ausente");
  const ext = pickExtension(mime);
  const blob = new Blob([bytes], { type: cleanMime(mime) });
  const form = new FormData();
  form.append("file", blob, `audio.${ext}`);
  form.append("model_id", "scribe_v2");
  form.append("language_code", "por");
  form.append("tag_audio_events", "false");
  form.append("diarize", "false");

  const resp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
    body: form,
  });
  if (!resp.ok) throw new Error(`ElevenLabs ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return ((await resp.json())?.text || "").trim();
}

async function transcribeWithLovableAI(audio_base64: string, mime: string): Promise<string> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
  const format = pickExtension(mime);
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: [
        { type: "text", text: "Transcreva fielmente o áudio em português do Brasil. Retorne APENAS o texto transcrito." },
        { type: "input_audio", input_audio: { data: audio_base64, format } },
      ] }],
    }),
  });
  if (!resp.ok) throw new Error(`Lovable ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return ((await resp.json())?.choices?.[0]?.message?.content || "").trim();
}

async function transcribeWithGemini(audio_base64: string, mime: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY ausente");
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { text: "Transcreva fielmente este áudio em português do Brasil. Retorne APENAS o texto transcrito, sem aspas, sem explicações." },
          { inlineData: { mimeType: mimeToGeminiMime(mime), data: audio_base64 } },
        ] }],
        generationConfig: { maxOutputTokens: 1000 },
      }),
    },
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return ((await resp.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
}

async function transcribeWithGroq(bytes: Uint8Array, mime: string): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY ausente");
  const ext = pickExtension(mime);
  const blob = new Blob([bytes], { type: cleanMime(mime) });
  const form = new FormData();
  form.append("file", blob, `audio.${ext}`);
  form.append("model", "whisper-large-v3");
  form.append("language", "pt");
  form.append("response_format", "json");

  const resp = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  });
  if (!resp.ok) throw new Error(`Groq Whisper ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return ((await resp.json())?.text || "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { audio_base64, mime_type } = body || {};
    const mt = mime_type || "audio/webm";

    console.log("📝 Transcrição iniciada", {
      audio_size: audio_base64?.length || 0,
      mime_type: mt,
      hasElevenLabs: !!ELEVENLABS_API_KEY,
      hasLovableAI: !!LOVABLE_API_KEY,
      hasGemini: !!GEMINI_API_KEY,
      hasGroq: !!GROQ_API_KEY,
    });

    if (!audio_base64) {
      return new Response(JSON.stringify({ error: "audio_base64 vazio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let text = "";
    let provider = "";
    let lastError: string | null = null;

    const bytes = base64ToBytes(audio_base64);

    // 1. Groq Whisper (gratuito, rápido)
    if (GROQ_API_KEY) {
      try {
        text = await transcribeWithGroq(bytes, mt);
        provider = "groq-whisper";
      } catch (err) {
        lastError = String((err as Error)?.message || err);
        console.warn("⚠️ Groq falhou:", lastError);
      }
    }

    // 2. ElevenLabs
    if (!text && ELEVENLABS_API_KEY) {
      try {
        text = await transcribeWithElevenLabs(bytes, mt);
        provider = "elevenlabs";
      } catch (err) {
        lastError = String((err as Error)?.message || err);
        console.warn("⚠️ ElevenLabs falhou:", lastError);
      }
    }

    // 3. Lovable AI
    if (!text && LOVABLE_API_KEY) {
      try {
        text = await transcribeWithLovableAI(audio_base64, mt);
        provider = "lovable-ai";
      } catch (err) {
        lastError = String((err as Error)?.message || err);
        console.warn("⚠️ Lovable AI falhou:", lastError);
      }
    }

    // 4. Gemini direto
    if (!text && GEMINI_API_KEY) {
      try {
        text = await transcribeWithGemini(audio_base64, mt);
        provider = "gemini";
      } catch (err) {
        lastError = String((err as Error)?.message || err);
        console.warn("⚠️ Gemini falhou:", lastError);
      }
    }

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Falha na transcrição", detail: lastError || "Sem provedor disponível" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("✅ Transcrição concluída", { provider, preview: text.slice(0, 100) });

    return new Response(JSON.stringify({ text, provider }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("🔥 Erro geral:", e);
    return new Response(
      JSON.stringify({ error: String((e as Error)?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
