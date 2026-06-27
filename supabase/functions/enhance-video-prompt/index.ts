import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { chatCompletion } from "../_shared/llm.ts";

const SYSTEM = `Você é um diretor de fotografia e prompt engineer especializado em geração de vídeo realista (Veo / Sora / Runway / Kling). 
Sua tarefa: receber uma cena em português e produzir UM ÚNICO prompt em INGLÊS, otimizado para vídeo hiper-realista de PESSOAS FALANDO.

REGRAS DUROS:
- Sempre uma única tomada contínua (single continuous shot). Sem cortes, sem split-screen, sem transições.
- Descreva: sujeito (idade aparente, etnia, roupa, cabelo), ambiente (local exato, iluminação, hora do dia), micro-expressões faciais, movimento natural da boca sincronizado com a fala, olhar vivo, respiração, gestos sutis das mãos.
- Câmera: especifique lente (ex.: 35mm, 50mm), enquadramento (medium close-up, eye-level), e UM movimento gradual contínuo (slow push-in, subtle handheld, locked tripod).
- Áudio implícito: voz natural em português brasileiro, tom emocional (calmo, urgente, inspirador).
- Estética: hiper-realismo 4K, pele com textura real (poros, fios de cabelo), olhos refletindo luz, depth of field raso.
- NEGATIVOS no final: "no cartoon, no plastic skin, no dead eyes, no extra fingers, no morphing face, no scene cuts, no captions".
- Comprimento ideal: 90 a 160 palavras. Sem listas, sem markdown. Texto corrido em inglês.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { scene, category, mood, durationSeconds } = await req.json();
    if (!scene || typeof scene !== "string") {
      return new Response(JSON.stringify({ error: "scene obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userMsg = `CENA (pt-BR): ${scene}
CATEGORIA: ${category || "narrativa"}
HUMOR: ${mood || "natural, expressivo"}
DURAÇÃO: ${durationSeconds || 12} segundos
Gere o prompt final em inglês agora.`;

    const r = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      temperature: 0.7,
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: r.error || "falha no provider", provider: r.provider || "none" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const prompt = String(r.data?.choices?.[0]?.message?.content || "").trim();
    return new Response(JSON.stringify({ prompt, provider: r.provider }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
